import React, { useState, useEffect } from 'react';
import { issueService } from '../services/issueService';
import { RenewalRequest } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import { getErrorMessage } from '../services/api';

export const RenewalsPage: React.FC = () => {
  const [renewals, setRenewals] = useState<RenewalRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRenewal, setSelectedRenewal] = useState<RenewalRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadRenewals = async () => {
    setIsLoading(true);
    try {
      const res = await issueService.getAllRenewals({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 100,
      });
      setRenewals(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRenewals();
  }, [statusFilter]);

  const handleActionClick = (renewal: RenewalRequest, type: 'approve' | 'reject') => {
    setSelectedRenewal(renewal);
    setActionType(type);
    setReviewNotes(type === 'approve' ? 'Approved for academic project extension' : 'Extension not permitted beyond syllabus requirements');
  };

  const handleConfirmReview = async () => {
    if (!selectedRenewal || !actionType) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (actionType === 'approve') {
        await issueService.approveRenewal(selectedRenewal._id, reviewNotes);
        setSuccessMsg(`Renewal ${selectedRenewal.requestNumber} approved! Due date extended.`);
      } else {
        await issueService.rejectRenewal(selectedRenewal._id, reviewNotes);
        setSuccessMsg(`Renewal ${selectedRenewal.requestNumber} rejected.`);
      }

      setSelectedRenewal(null);
      setActionType(null);
      loadRenewals();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-purple-600" />
            Renewal Approvals & Extension Queue
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evaluate student loan extension requests according to the 3-renewal ceiling policy
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                statusFilter === tab
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
      {successMsg && <Alert variant="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* Renewals Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Student</th>
                  <th>Current Due</th>
                  <th>Requested Due (+15d)</th>
                  <th>Reason Given</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      Loading renewal requests...
                    </td>
                  </tr>
                ) : renewals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      No renewal requests matching current filter.
                    </td>
                  </tr>
                ) : (
                  renewals.map((r) => {
                    const studentObj = typeof r.studentId === 'object' ? r.studentId : null;
                    const isPending = r.status === 'pending';

                    return (
                      <tr key={r._id}>
                        <td className="font-semibold text-purple-600 text-xs">
                          {r.requestNumber}
                        </td>
                        <td>
                          <div className="font-medium text-foreground">{studentObj?.name || 'Student'}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {studentObj?.studentId} • {studentObj?.department}
                          </div>
                        </td>
                        <td className="text-xs text-muted-foreground">
                          {formatDate(r.currentDueDate)}
                        </td>
                        <td className="text-xs font-semibold text-emerald-600">
                          {formatDate(r.proposedDueDate)}
                        </td>
                        <td className="text-xs max-w-xs truncate text-muted-foreground">
                          "{r.reason}"
                        </td>
                        <td>
                          <Badge status={r.status}>{r.status}</Badge>
                        </td>
                        <td className="text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleActionClick(r, 'approve')}
                                className="text-xs py-1 px-2.5 h-7 bg-emerald-600 hover:bg-emerald-500"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleActionClick(r, 'reject')}
                                className="text-xs py-1 px-2.5 h-7"
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedRenewal}
        onClose={() => {
          setSelectedRenewal(null);
          setActionType(null);
        }}
        title={`${actionType === 'approve' ? 'Approve' : 'Reject'} Renewal Request`}
        description={`Request ${selectedRenewal?.requestNumber} for ${typeof selectedRenewal?.studentId === 'object' ? selectedRenewal.studentId.name : 'Student'}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/40 text-xs space-y-1">
            <p><strong>Current Due:</strong> {formatDate(selectedRenewal?.currentDueDate)}</p>
            <p><strong>Proposed Due:</strong> {formatDate(selectedRenewal?.proposedDueDate)} (+15 days)</p>
            <p><strong>Student's Stated Reason:</strong> "{selectedRenewal?.reason}"</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Reviewer Notes / Feedback
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRenewal(null);
                setActionType(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'approve' ? 'primary' : 'danger'}
              onClick={handleConfirmReview}
              isLoading={isSubmitting}
              className={actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : ''}
            >
              {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
