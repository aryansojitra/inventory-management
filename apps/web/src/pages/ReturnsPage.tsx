import React, { useState, useEffect } from 'react';
import { issueService } from '../services/issueService';
import { IssueRecord, ReturnCondition, ReturnTransaction } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import {
  ArrowDownLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
} from 'lucide-react';
import { formatDate, calculateOverdueDays } from '../lib/utils';
import { getErrorMessage } from '../services/api';

export const ReturnsPage: React.FC = () => {
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<IssueRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState<ReturnTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Line return selections (lineId -> { quantity, condition, notes })
  const [lineSelections, setLineSelections] = useState<
    Record<
      string,
      {
        quantity: number;
        condition: ReturnCondition;
        notes: string;
      }
    >
  >({});

  const loadIssues = async () => {
    setIsLoading(true);
    try {
      const res = await issueService.getAllIssues({
        search: search || undefined,
        status: 'active',
        limit: 50,
      });
      setIssues(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, [search]);

  const handleSelectIssue = (issue: IssueRecord) => {
    setSelectedIssue(issue);
    setError(null);
    setReturnSuccess(null);

    // Initialize line return selections
    const initialSelections: Record<string, { quantity: number; condition: ReturnCondition; notes: string }> = {};
    issue.lines.forEach((line) => {
      const outstanding = line.quantity - (line.returnedQuantity || 0);
      if (outstanding > 0) {
        initialSelections[line._id] = {
          quantity: outstanding,
          condition: 'good',
          notes: '',
        };
      }
    });
    setLineSelections(initialSelections);
  };

  const handleProcessReturn = async () => {
    if (!selectedIssue) return;

    const itemsToReturn = Object.entries(lineSelections)
      .filter(([_, sel]) => sel.quantity > 0)
      .map(([lineId, sel]) => ({
        lineId,
        quantityReturned: sel.quantity,
        condition: sel.condition,
        notes: sel.notes || undefined,
      }));

    if (itemsToReturn.length === 0) {
      setError('Please select at least one item to return');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await issueService.processReturn({
        issueId: selectedIssue._id,
        items: itemsToReturn,
        notes: 'Return processed at department counter',
      });

      setReturnSuccess(res);
      setSelectedIssue(null);
      loadIssues();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
          Item Return & Quality Assessment Workbench
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Process student item returns, verify physical conditions, and route units to the correct stock bucket
        </p>
      </div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

      {returnSuccess && (
        <Alert
          variant="success"
          title="Return Processed Successfully!"
          onClose={() => setReturnSuccess(null)}
        >
          Return receipt <strong>{returnSuccess.returnNumber}</strong> generated. Item stock buckets have been adjusted according to inspected condition.
        </Alert>
      )}

      {/* Main Grid: Search & Return Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Issues List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>Active Loans on File</span>
                <span className="text-xs font-normal text-muted-foreground">{issues.length} records</span>
              </CardTitle>
              <div className="relative mt-2">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter by student roll, name or issue #..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-input text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60 max-h-[550px] overflow-y-auto scrollbar-thin">
                {isLoading ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">Loading active loans...</p>
                ) : issues.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">
                    No active loan transactions found.
                  </p>
                ) : (
                  issues.map((issue) => {
                    const studentObj = typeof issue.studentId === 'object' ? issue.studentId : null;
                    const overdueDays = calculateOverdueDays(issue.expectedReturnDate);
                    const isSelected = selectedIssue?._id === issue._id;

                    return (
                      <div
                        key={issue._id}
                        onClick={() => handleSelectIssue(issue)}
                        className={`p-4 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600'
                            : 'hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-blue-600">{issue.issueNumber}</span>
                          {overdueDays > 0 ? (
                            <Badge variant="overdue">{overdueDays}d Overdue</Badge>
                          ) : (
                            <Badge variant="available">Active</Badge>
                          )}
                        </div>

                        <div className="mt-1">
                          <p className="text-xs font-bold text-foreground">{studentObj?.name || 'Student'}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {studentObj?.studentId} • {studentObj?.department}
                          </p>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          <span>Issued: {formatDate(issue.issueDate)}</span>
                          <span>Due: {formatDate(issue.expectedReturnDate)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Return Inspection Workbench (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedIssue ? (
            <Card className="border-dashed border-2 p-12 text-center text-muted-foreground">
              <RotateCcw className="w-10 h-10 mx-auto opacity-30 mb-3" />
              <h3 className="text-sm font-bold text-foreground">Select a Loan to Process</h3>
              <p className="text-xs mt-1">
                Choose an active student loan from the list on the left to begin inspecting returned items.
              </p>
            </Card>
          ) : (
            <Card className="border-border shadow-md">
              <CardHeader className="bg-muted/20 border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      Return Inspection: {selectedIssue.issueNumber}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Student: {typeof selectedIssue.studentId === 'object' ? selectedIssue.studentId.name : 'Student'} (
                      {typeof selectedIssue.studentId === 'object' ? selectedIssue.studentId.studentId : ''})
                    </p>
                  </div>
                  <Badge status={selectedIssue.status}>{selectedIssue.status}</Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                {/* Rule explanation notice */}
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Condition-Based Automatic Routing:
                  </p>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 opacity-90">
                    <li><strong>Good Condition:</strong> Restored immediately to Available Stock for re-issue.</li>
                    <li><strong>Damaged Condition:</strong> Routed to Damaged Stock bucket for repair or maintenance review.</li>
                    <li><strong>Lost Condition:</strong> Marked as Lost and recorded in financial loss audit.</li>
                  </ul>
                </div>

                {/* Items to Return List */}
                <div className="space-y-4">
                  {selectedIssue.lines.map((line) => {
                    const itemObj = typeof line.itemId === 'object' ? line.itemId : null;
                    const assetObj = typeof line.assetId === 'object' ? line.assetId : null;
                    const outstanding = line.quantity - (line.returnedQuantity || 0);

                    if (outstanding <= 0) return null;

                    const currentSel = lineSelections[line._id] || {
                      quantity: outstanding,
                      condition: 'good',
                      notes: '',
                    };

                    return (
                      <div
                        key={line._id}
                        className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-foreground">
                              {itemObj?.name || 'Inventory Item'}
                            </h4>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              SKU: {itemObj?.sku} {assetObj ? `• Serial: ${assetObj.assetTag}` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-blue-600">
                              {outstanding} outstanding
                            </span>
                          </div>
                        </div>

                        {/* Quantity and Condition selectors */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Quantity Returning
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={outstanding}
                              value={currentSel.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0;
                                setLineSelections((prev) => ({
                                  ...prev,
                                  [line._id]: { ...prev[line._id], quantity: Math.min(val, outstanding) },
                                }));
                              }}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-input bg-background font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Inspected Physical Condition
                            </label>
                            <select
                              value={currentSel.condition}
                              onChange={(e) => {
                                setLineSelections((prev) => ({
                                  ...prev,
                                  [line._id]: {
                                    ...prev[line._id],
                                    condition: e.target.value as ReturnCondition,
                                  },
                                }));
                              }}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-input bg-background font-semibold"
                            >
                              <option value="good">Good (Restores to Available Stock)</option>
                              <option value="damaged">Damaged (Routes to Damaged Bucket)</option>
                              <option value="lost">Lost (Routes to Lost Bucket)</option>
                            </select>
                          </div>
                        </div>

                        {/* Notes if damaged or lost */}
                        {currentSel.condition !== 'good' && (
                          <input
                            type="text"
                            placeholder="Specify damage notes or missing parts..."
                            value={currentSel.notes}
                            onChange={(e) => {
                              setLineSelections((prev) => ({
                                ...prev,
                                [line._id]: { ...prev[line._id], notes: e.target.value },
                              }));
                            }}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20 text-xs placeholder:text-muted-foreground"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Submit Return */}
                <div className="pt-4 border-t border-border flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedIssue(null)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleProcessReturn}
                    isLoading={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
                    leftIcon={<CheckCircle2 className="w-4 h-4 mr-1" />}
                  >
                    Confirm & Complete Return
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
