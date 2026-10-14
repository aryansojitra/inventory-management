import { RenewalRequest } from './renewal.model';
import { IssueLine, IssueRecord } from '../issues/issue.model';
import { AuditLog } from '../audit-logs/auditLog.model';
import { Notification } from '../notifications/notification.model';
import { Student } from '../students/student.model';
import { createError } from '../../utils/apiUtils';
import { calculateRenewalDueDate } from '../../utils/dateUtils';
import {
  AUDIT_ACTIONS,
  RENEWAL_STATUSES,
  LINE_STATUSES,
  ISSUE_STATUSES,
  NOTIFICATION_TYPES,
} from '../../constants';
import mongoose from 'mongoose';

function normalizeRenewal(r: any) {
  return {
    ...r,
    id: r._id.toString(),
    requestNumber: `REN-${r._id.toString().slice(-6).toUpperCase()}`,
    issueId: r.issueRecord,
    lineId: r.issueLine,
    studentId: r.student,
    currentDueDate: r.previousDueDate,
    daysRequested: 15,
    reviewNotes: r.remarks,
  };
}

export class RenewalService {
  async requestRenewal(
    dto: {
      lineId?: string;
      issueLineId?: string;
      issueId?: string;
      reason?: string;
      remarks?: string;
      daysRequested?: number;
    },
    studentUserId: string,
    studentProfileId?: string
  ) {
    const lineId = dto.lineId || dto.issueLineId;
    if (!lineId) throw createError('Issue line ID is required', 400);

    const issueLine = await IssueLine.findOne({
      _id: lineId,
      status: { $in: [LINE_STATUSES.ACTIVE, LINE_STATUSES.OVERDUE] },
      outstandingQty: { $gt: 0 },
    }).populate('issueRecord');

    if (!issueLine) {
      throw createError('Issue line not found, outstanding balance is zero, or item was already returned', 404);
    }

    const record = issueLine.issueRecord as any;
    const borrowingStudentId = record.student?._id ? record.student._id.toString() : record.student?.toString();

    // Verify ownership: requesting student must be the student who borrowed
    let effectiveStudentId = studentProfileId;
    if (!effectiveStudentId) {
      const student = await Student.findOne({ user: studentUserId });
      if (student) effectiveStudentId = student._id.toString();
    }

    if (effectiveStudentId && borrowingStudentId !== effectiveStudentId) {
      throw createError('Access denied: You can only request renewals for items issued to your account', 403);
    }

    // Check maximum renewal limit (3 max)
    const maxRenewals = issueLine.maxRenewals || 3;
    if (issueLine.renewalCount >= maxRenewals) {
      throw createError(`Maximum renewals (${maxRenewals}) reached for this item. Item must be returned to lab.`, 409);
    }

    // Business Rule: Renewal request must be submitted before due date
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(issueLine.dueDate);
    due.setHours(0, 0, 0, 0);
    if (now >= due) {
      throw createError(
        'Renewal requests must be submitted before the due date. Overdue items cannot be renewed by students; please return the equipment to the department.',
        409
      );
    }

    // Check if another renewal request is already pending
    const existingPending = await RenewalRequest.findOne({
      issueLine: issueLine._id,
      status: RENEWAL_STATUSES.PENDING,
    });
    if (existingPending) {
      throw createError('A pending renewal request already exists for this item. Please await coordinator review.', 409);
    }

    const proposedDueDate = calculateRenewalDueDate(issueLine.dueDate);
    const reason = dto.reason || dto.remarks || 'Need additional time for lab project work';

    const renewal = await RenewalRequest.create({
      issueLine: issueLine._id,
      issueRecord: record._id,
      student: record.student,
      requestedBy: studentUserId,
      requestDate: new Date(),
      previousDueDate: issueLine.dueDate,
      proposedDueDate,
      status: RENEWAL_STATUSES.PENDING,
      remarks: reason,
    });

    await AuditLog.create({
      action: AUDIT_ACTIONS.RENEWAL_REQUESTED,
      actor: studentUserId,
      actorRole: 'student',
      entityType: 'RenewalRequest',
      entityId: renewal._id,
      newValue: {
        issueLineId: lineId,
        previousDueDate: issueLine.dueDate,
        proposedDueDate,
        reason,
      },
      remarks: 'Renewal request submitted by student',
    });

    return normalizeRenewal(renewal.toObject());
  }

  async approveRenewal(
    renewalId: string,
    remarks: string,
    actorId: string,
    actorRole: string
  ) {
    const renewal = await RenewalRequest.findOne({
      _id: renewalId,
      status: RENEWAL_STATUSES.PENDING,
    });
    if (!renewal) throw createError('Pending renewal request not found', 404);

    const issueLine = await IssueLine.findOne({
      _id: renewal.issueLine,
      status: { $in: [LINE_STATUSES.ACTIVE, LINE_STATUSES.OVERDUE] },
      outstandingQty: { $gt: 0 },
    });
    if (!issueLine) throw createError('Issue line is no longer active or items were returned', 409);

    // Business Rule: Each approved renewal extends due date by exactly 15 calendar days from existing due date
    const newDueDate = calculateRenewalDueDate(issueLine.dueDate);

    // Update renewal record
    await RenewalRequest.findByIdAndUpdate(renewalId, {
      $set: {
        status: RENEWAL_STATUSES.APPROVED,
        decidedBy: actorId,
        decidedAt: new Date(),
        remarks: remarks || 'Approved by coordinator (+15 days extended)',
        proposedDueDate: newDueDate,
      },
    });

    // Update issue line due date, increment counter, reset status to active
    await IssueLine.findByIdAndUpdate(issueLine._id, {
      $set: {
        dueDate: newDueDate,
        status: LINE_STATUSES.ACTIVE,
      },
      $inc: { renewalCount: 1 },
    });

    // Recalculate parent issue record status if needed
    const parentRecord = await IssueRecord.findById(renewal.issueRecord);
    if (parentRecord && parentRecord.status === ISSUE_STATUSES.OVERDUE) {
      await IssueRecord.findByIdAndUpdate(parentRecord._id, { status: ISSUE_STATUSES.ACTIVE });
    }

    // Notify student
    const studentUser = await mongoose.model('User').findOne({
      studentProfile: renewal.student,
    });
    if (studentUser) {
      await Notification.create({
        recipient: studentUser._id,
        type: NOTIFICATION_TYPES.RENEWAL_APPROVED,
        title: 'Renewal Request Approved',
        message: `Your renewal request was approved! New return due date: ${newDueDate.toDateString()}.`,
        relatedIssue: renewal.issueRecord,
      });
    }

    await AuditLog.create({
      action: AUDIT_ACTIONS.RENEWAL_APPROVED,
      actor: actorId,
      actorRole,
      entityType: 'RenewalRequest',
      entityId: renewal._id,
      previousValue: { dueDate: issueLine.dueDate },
      newValue: { dueDate: newDueDate, renewalCount: issueLine.renewalCount + 1 },
      remarks: remarks || 'Renewal approved',
    });

    const updated = await RenewalRequest.findById(renewalId)
      .populate('student', 'fullName enrolmentNumber programme')
      .populate('decidedBy', 'fullName')
      .populate({
        path: 'issueLine',
        populate: { path: 'inventoryItem individualAsset', select: 'name itemCode assetId' },
      })
      .lean();

    return normalizeRenewal(updated);
  }

  async rejectRenewal(
    renewalId: string,
    remarks: string,
    actorId: string,
    actorRole: string
  ) {
    const renewal = await RenewalRequest.findOne({
      _id: renewalId,
      status: RENEWAL_STATUSES.PENDING,
    });
    if (!renewal) throw createError('Pending renewal request not found', 404);

    await RenewalRequest.findByIdAndUpdate(renewalId, {
      $set: {
        status: RENEWAL_STATUSES.REJECTED,
        decidedBy: actorId,
        decidedAt: new Date(),
        remarks: remarks || 'Rejected by coordinator. Please return item as scheduled.',
      },
    });

    // Notify student: original due date stands
    const studentUser = await mongoose.model('User').findOne({
      studentProfile: renewal.student,
    });
    if (studentUser) {
      await Notification.create({
        recipient: studentUser._id,
        type: NOTIFICATION_TYPES.RENEWAL_REJECTED,
        title: 'Renewal Request Rejected',
        message: `Your renewal request was rejected (${remarks || 'No remarks'}). Original due date stands.`,
        relatedIssue: renewal.issueRecord,
      });
    }

    await AuditLog.create({
      action: AUDIT_ACTIONS.RENEWAL_REJECTED,
      actor: actorId,
      actorRole,
      entityType: 'RenewalRequest',
      entityId: renewal._id,
      remarks: remarks || 'Renewal rejected',
    });

    const updated = await RenewalRequest.findById(renewalId)
      .populate('student', 'fullName enrolmentNumber programme')
      .populate('decidedBy', 'fullName')
      .populate({
        path: 'issueLine',
        populate: { path: 'inventoryItem individualAsset', select: 'name itemCode assetId' },
      })
      .lean();

    return normalizeRenewal(updated);
  }

  async getAll(query: {
    page: number;
    limit: number;
    skip: number;
    status?: string;
    studentId?: string;
  }): Promise<{ renewals: any[]; total: number }> {
    const filter: any = {};
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }
    if (query.studentId) {
      filter.student = query.studentId;
    }

    const [rawRenewals, total] = await Promise.all([
      RenewalRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('student', 'fullName enrolmentNumber programme')
        .populate('decidedBy', 'fullName email')
        .populate({
          path: 'issueLine',
          populate: {
            path: 'inventoryItem individualAsset',
            select: 'name itemCode assetId serialNumber',
          },
        })
        .lean(),
      RenewalRequest.countDocuments(filter),
    ]);

    const renewals = rawRenewals.map(normalizeRenewal);
    return { renewals, total };
  }
}

export const renewalService = new RenewalService();
