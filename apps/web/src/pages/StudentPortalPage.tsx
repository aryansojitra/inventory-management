import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { issueService } from '../services/issueService';
import { IssueRecord, IssueLine, RenewalRequest } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import {
  GraduationCap,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Package,
  Calendar,
  Sparkles,
  QrCode,
  FileCheck,
  BellRing,
} from 'lucide-react';
import { formatDate, calculateOverdueDays } from '../lib/utils';
import { getErrorMessage } from '../services/api';

export const StudentPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [renewals, setRenewals] = useState<RenewalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLineForRenewal, setSelectedLineForRenewal] = useState<{
    issueId: string;
    line: IssueLine;
  } | null>(null);
  const [renewalReason, setRenewalReason] = useState('Need more time for final lab tests');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [issueData, renewalData] = await Promise.all([
        issueService.getMyIssues().catch(() => []),
        issueService.getAllRenewals().then((res) => res.data).catch(() => []),
      ]);
      setIssues(issueData);
      setRenewals(renewalData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequestRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLineForRenewal) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await issueService.requestRenewal({
        issueId: selectedLineForRenewal.issueId,
        lineId: selectedLineForRenewal.line._id,
        daysRequested: 15,
        reason: renewalReason,
      });

      setSuccessMsg('Renewal request submitted! Awaiting coordinator review and approval.');
      setSelectedLineForRenewal(null);
      loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Separate active vs past issues
  const activeIssues = issues.filter(
    (i) => i.status === 'active' || i.status === 'overdue' || i.status === 'partially_returned'
  );
  const pastIssues = issues.filter((i) => i.status === 'returned');

  // Compute overdue vs upcoming due lines
  const allActiveLines = activeIssues.flatMap((i) =>
    (i.lines || []).map((l) => ({ line: l, issue: i }))
  );

  const overdueLines = allActiveLines.filter((al) => calculateOverdueDays(al.line.dueDate) > 0);
  const upcomingLines = allActiveLines.filter((al) => {
    const days = calculateOverdueDays(al.line.dueDate);
    return days <= 0 && days >= -3; // Due within next 3 days
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Student Welcome Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-2xl p-6 text-white shadow-xl shadow-blue-600/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center font-bold text-xl border border-white/20">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white mb-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Student Self-Service Portal</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                Welcome back, {user?.name || 'Student'}
              </h2>
              <p className="text-xs text-blue-100">
                Department of {user?.department || 'Computer Engineering'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 text-center">
              <p className="text-[10px] uppercase font-bold text-blue-200">Active Borrowings</p>
              <p className="text-xl font-extrabold text-white">
                {allActiveLines.length} item{allActiveLines.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert variant="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* Overdue Delinquency Reminder Alert */}
      {overdueLines.length > 0 && (
        <Alert
          variant="error"
          title={`Action Required: ${overdueLines.length} Borrowed Item${overdueLines.length > 1 ? 's are' : ' is'} Overdue!`}
        >
          <div className="space-y-1 mt-1 text-xs">
            <p>
              Under department inventory rules, items must be returned within 15 calendar days. Overdue items immediately restrict additional equipment borrowings until returned.
            </p>
            {overdueLines.map((ol, idx) => {
              const days = calculateOverdueDays(ol.line.dueDate);
              const itemObj = typeof ol.line.itemId === 'object' ? ol.line.itemId : null;
              return (
                <p key={idx} className="font-semibold text-rose-800 dark:text-rose-200">
                  • {itemObj?.name || 'Item'} (Loan #{ol.issue.issueNumber}) was due on {formatDate(ol.line.dueDate)} and is <strong>{days} day{days !== 1 ? 's' : ''} overdue</strong>.
                </p>
              );
            })}
          </div>
        </Alert>
      )}

      {/* Upcoming Due Reminder Alert */}
      {upcomingLines.length > 0 && (
        <Alert
          variant="warning"
          title={`Notice: ${upcomingLines.length} Item${upcomingLines.length > 1 ? 's are' : ' is'} Due Within 3 Days`}
        >
          <div className="space-y-1 mt-1 text-xs">
            <p>
              Please return equipment or submit an official renewal request before the due date passes. Submitting a renewal request alone does not extend the due date until approved by the coordinator.
            </p>
            {upcomingLines.map((ul, idx) => {
              const itemObj = typeof ul.line.itemId === 'object' ? ul.line.itemId : null;
              return (
                <p key={idx} className="font-medium text-amber-900 dark:text-amber-200">
                  • {itemObj?.name || 'Item'} is due on <strong>{formatDate(ul.line.dueDate)}</strong>.
                </p>
              );
            })}
          </div>
        </Alert>
      )}

      {/* Active Borrowed Items Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Currently Borrowed Equipment
          </h3>
          <span className="text-xs text-muted-foreground">Every item is subject to a 15-day term</span>
        </div>

        {isLoading ? (
          <p className="text-center py-10 text-xs text-muted-foreground">Loading borrowed items...</p>
        ) : activeIssues.length === 0 ? (
          <Card className="border-dashed border-2 p-8 text-center text-muted-foreground">
            <Package className="w-8 h-8 mx-auto opacity-30 mb-2" />
            <p className="text-sm font-semibold text-foreground">No Active Borrowings</p>
            <p className="text-xs">You currently have no equipment checked out from the department inventory.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeIssues.map((issue) =>
              issue.lines.map((line) => {
                const itemObj = typeof line.itemId === 'object' ? line.itemId : null;
                const assetObj = typeof line.assetId === 'object' ? line.assetId : null;
                const overdueDays = calculateOverdueDays(line.dueDate);
                const isLineOverdue = overdueDays > 0;
                const maxRenewals = line.maxRenewals || 3;
                const canRenew = (line.renewalCount || 0) < maxRenewals && !isLineOverdue;

                return (
                  <Card key={line._id} hover className="border-border">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="font-bold text-base text-foreground">
                            {itemObj?.name || 'Department Item'}
                          </h4>
                          <p className="text-xs text-muted-foreground font-mono">
                            SKU: {itemObj?.sku} {assetObj ? `• Asset: ${assetObj.assetTag || assetObj.assetId}` : ''}
                          </p>
                        </div>
                        {isLineOverdue ? (
                          <Badge variant="overdue">{overdueDays}d Overdue</Badge>
                        ) : (
                          <Badge variant="available">Active Loan</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                            Due Date (15d Term)
                          </span>
                          <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            {formatDate(line.dueDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                            Renewals Used
                          </span>
                          <span className="font-semibold text-foreground mt-0.5 block">
                            {line.renewalCount || 0} of {maxRenewals} allowed
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          Issue ref: {issue.issueNumber}
                        </span>

                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!canRenew}
                          onClick={() =>
                            setSelectedLineForRenewal({
                              issueId: issue._id,
                              line,
                            })
                          }
                          leftIcon={<RefreshCw className="w-3 h-3" />}
                          className="text-xs py-1 px-3"
                        >
                          {canRenew ? 'Request Renewal (+15d)' : 'Renewal Unavailable'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Renewal Requests Tracking Table */}
      {renewals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-purple-600" />
              Renewal Request Status & Coordinator Remarks
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Track pending, approved, and rejected extension requests
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Submitted Date</th>
                    <th>Equipment Item</th>
                    <th>Requested Extension</th>
                    <th>Status</th>
                    <th>Coordinator Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {renewals.map((ren) => {
                    const itemObj = (ren.issueLine as any)?.inventoryItem || (ren.issueLine as any)?.itemId;
                    return (
                      <tr key={ren._id}>
                        <td>{formatDate(ren.createdAt)}</td>
                        <td className="font-semibold text-foreground">
                          {itemObj?.name || 'Department Item'}
                        </td>
                        <td>+15 Calendar Days</td>
                        <td>
                          <Badge
                            variant={
                              ren.status === 'approved'
                                ? 'available'
                                : ren.status === 'rejected'
                                ? 'overdue'
                                : 'secondary'
                            }
                          >
                            {ren.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="italic text-muted-foreground">
                          {ren.reviewNotes || (ren.status === 'pending' ? 'Pending coordinator review' : 'No remarks')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Borrowing History */}
      {pastIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Past Borrowing History</CardTitle>
            <p className="text-xs text-muted-foreground">Previously returned equipment</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Issue ID</th>
                    <th>Date Issued</th>
                    <th>Items</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastIssues.map((pi) => (
                    <tr key={pi._id}>
                      <td className="font-mono text-xs font-semibold text-blue-600">
                        {pi.issueNumber}
                      </td>
                      <td className="text-xs text-muted-foreground">{formatDate(pi.issueDate)}</td>
                      <td className="text-xs font-medium">{pi.lines?.length || 1} line item(s)</td>
                      <td>
                        <Badge status="returned">Returned</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Renewal Request Modal */}
      <Modal
        isOpen={!!selectedLineForRenewal}
        onClose={() => setSelectedLineForRenewal(null)}
        title="Request Loan Renewal"
        description="Extend the return date by an additional 15 calendar days"
        size="md"
      >
        <form onSubmit={handleRequestRenewal} className="space-y-4">
          <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs space-y-1">
            <p className="font-semibold text-blue-950 dark:text-blue-200">
              Department Loan Renewal Policy:
            </p>
            <p className="text-muted-foreground text-[11px]">
              Submitting a renewal request alone does not extend your due date. The inventory coordinator must review and approve the request. Each approved renewal adds 15 calendar days.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Reason for Extension
            </label>
            <textarea
              rows={3}
              required
              value={renewalReason}
              onChange={(e) => setRenewalReason(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setSelectedLineForRenewal(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Submit Renewal Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
