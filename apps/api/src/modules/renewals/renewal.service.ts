import { RenewalRequest } from './renewal.model';
import { IssueLine } from '../issues/issue.model';
import { AuditLog } from '../audit-logs/auditLog.model';
import { Notification } from '../notifications/notification.model';
import { Student } from '../students/student.model';
import { createError } from '../../utils/apiUtils';
import {
  calculateRenewalDueDate,
  isOverdue,
} from '../../utils/dateUtils';
import {
  AUDIT_ACTIONS,
  RENEWAL_STATUSES,
  LINE_STATUSES,
  NOTIFICATION_TYPES,
} from '../../constants';
import mongoose from 'mongoose';

export class RenewalService {
  async requestRenewal(issueLineId: string, studentUserId: string, studentProfileId: string) {
    const issueLine = await IssueLine.findOne({
      _id: issueLineId,
      status: { $in: [LINE_STATUSES.ACTIVE, LINE_STATUSES.OVERDUE] },
      outstandingQty: { $gt: 0 },
    }).populate('issueRecord');

    if (!issueLine) {
      throw createError('Issue line not found or already returned', 404);
    }

    // Verify ownership: the requesting student must be the one who borrowed
    const record = issueLine.issueRecord as any;
    const student = await Student.findOne({ _id: record.student, user: studentUserId });
    if (!student) {
      throw createError('You can only request renewal for your own borrowed items', 403);
    }

    // Check renewal limit
    if (issueLine.renewalCount >= issueLine.maxRenewals) {
      throw createError(
        `Maximum renewals (${issueLine.maxRenewals}) reached for this item`,
        409
      );
    }

    // Check if before due date (rule: must request BEFORE due date)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(issueLine.dueDate);
    due.setHours(0, 0, 0, 0);
    if (now >= due) {
      throw createError(
        'Renewal requests must be submitted before the due date',
        409
      );
    }

    // Check no pending request already exists
    const existingPending = await RenewalRequest.findOne({
      issueLine: issueLineId,
      status: RENEWAL_STATUSES.PENDING,
    });
    if (existingPending) {
      throw createError('A pending renewal request already exists for this item', 409);
    }

    const proposedDueDate = calculateRenewalDueDate(issueLine.dueDate);

    const renewal = await RenewalRequest.create({
      issueLine: issueLine._id,
      issueRecord: record._id,
      student: student._id,
      requestedBy: studentUserId,
      requestDate: new Date(),
      previousDueDate: issueLine.dueDate,
      proposedDueDate,
      status: RENEWAL_STATUSES.PENDING,
    });

    await AuditLog.create({
      action: AUDIT_ACTIONS.RENEWAL_REQUESTED,
      actor: studentUserId,
      actorRole: 'student',
      entityType: 'RenewalRequest',
      entityId: renewal._id,
      newValue: {
        issueLineId,
        previousDueDate: issueLine.dueDate,
        proposedDueDate,
      },
    });

    return renewal;
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

    // Check issue line is still active
    const issueLine = await IssueLine.findOne({
      _id: renewal.issueLine,
      status: { $in: [LINE_STATUSES.ACTIVE, LINE_STATUSES.OVERDUE] },
      outstandingQty: { $gt: 0 },
    });
    if (!issueLine) throw createError('Issue line is no longer active', 409);

    const newDueDate = calculateRenewalDueDate(issueLine.dueDate);

    // Update renewal request status
    await RenewalRequest.findByIdAndUpdate(renewalId, {
      $set: {
        status: RENEWAL_STATUSES.APPROVED,
        decidedBy: actorId,
        decidedAt: new Date(),
        remarks,
        proposedDueDate: newDueDate, // may have changed if multiple renewals
      },
    });

    // Update issue line due date and increment renewal count
    await IssueLine.findByIdAndUpdate(issueLine._id, {
      $set: { dueDate: newDueDate },
      $inc: { renewalCount: 1 },
    });

    // Notify student
    const studentUser = await mongoose.model('User').findOne({
      studentProfile: renewal.student,
    });
    if (studentUser) {
      await Notification.create({
        recipient: studentUser._id,
        type: NOTIFICATION_TYPES.RENEWAL_APPROVED,
        title: 'Renewal Approved',
        message: `Your renewal request was approved. New due date: ${newDueDate.toDateString()}.`,
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
      newValue: { dueDate: newDueDate },
      remarks,
    });

    return await RenewalRequest.findById(renewalId).lean();
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
        remarks,
      },
    });

    // Notify student — due date NOT changed
    const studentUser = await mongoose.model('User').findOne({
      studentProfile: renewal.student,
    });
    if (studentUser) {
      await Notification.create({
        recipient: studentUser._id,
        type: NOTIFICATION_TYPES.RENEWAL_REJECTED,
        title: 'Renewal Rejected',
        message: `Your renewal request was rejected. ${remarks || ''}. Original due date stands.`,
        relatedIssue: renewal.issueRecord,
      });
    }

    await AuditLog.create({
      action: AUDIT_ACTIONS.RENEWAL_REJECTED,
      actor: actorId,
      actorRole,
      entityType: 'RenewalRequest',
      entityId: renewal._id,
      remarks,
    });

    return await RenewalRequest.findById(renewalId).lean();
  }

  async getAll(query: {
    page: number;
    limit: number;
    skip: number;
    status?: string;
    studentId?: string;
  }) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.studentId) filter.student = query.studentId;

    const [renewals, total] = await Promise.all([
      RenewalRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('student', 'fullName enrolmentNumber')
        .populate('decidedBy', 'fullName')
        .populate({
          path: 'issueLine',
          populate: {
            path: 'inventoryItem individualAsset',
            select: 'name itemCode assetId',
          },
        })
        .lean(),
      RenewalRequest.countDocuments(filter),
    ]);

    return { renewals, total };
  }
}

export const renewalService = new RenewalService();
