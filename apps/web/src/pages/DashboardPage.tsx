import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportService } from '../services/reportService';
import { issueService } from '../services/issueService';
import { inventoryService } from '../services/inventoryService';
import { DashboardSummary, IssueRecord } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import {
  Boxes,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  RefreshCw,
  Clock,
  Sparkles,
  TrendingUp,
  PackageCheck,
  ChevronRight,
  Search,
  ExternalLink,
} from 'lucide-react';
import { formatDate, calculateOverdueDays } from '../lib/utils';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [overdueIssues, setOverdueIssues] = useState<IssueRecord[]>([]);
  const [recentIssues, setRecentIssues] = useState<IssueRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [sum, overdues, recents] = await Promise.all([
          reportService.getDashboardSummary().catch(() => null),
          issueService.getOverdueIssues().catch(() => []),
          issueService.getAllIssues({ limit: 5 }).then((res) => res.data).catch(() => []),
        ]);
        if (sum) setSummary(sum);
        setOverdueIssues(overdues);
        setRecentIssues(recents);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const totalOverdue = overdueIssues.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 text-white backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Operations Command Center</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Department Inventory & Borrowing Control
          </h2>
          <p className="text-xs text-blue-100 max-w-xl">
            Live monitoring of student loan quotas, atomic stock buckets, condition auditing, and asset return lifecycles.
          </p>
        </div>

        {/* Quick action shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/issue-items')}
            leftIcon={<ArrowUpRight className="w-4 h-4 text-blue-600" />}
            className="bg-white text-blue-900 hover:bg-blue-50 shadow font-semibold"
          >
            New Item Issue
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/returns')}
            leftIcon={<ArrowDownLeft className="w-4 h-4 text-white" />}
            className="border-white/30 text-white hover:bg-white/10 font-semibold"
          >
            Process Return
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner (if any) */}
      {totalOverdue > 0 && (
        <Alert
          variant="warning"
          title={`Action Required: ${totalOverdue} Student Borrowing${totalOverdue > 1 ? 's are' : ' is'} Overdue!`}
        >
          Students with overdue items are restricted from borrowing additional inventory until items are returned or renewed.
        </Alert>
      )}

      {/* Metrics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Issues */}
        <Card hover>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Issues
              </p>
              <h3 className="text-2xl font-bold text-foreground">
                {summary?.activeIssues ?? 0}
              </h3>
              <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
                <PackageCheck className="w-3.5 h-3.5" /> Items currently on loan
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 border border-blue-100 dark:border-blue-900">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Overdue Items */}
        <Card hover>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Overdue Loans
              </p>
              <h3 className="text-2xl font-bold text-rose-600">
                {summary?.overdueLines ?? totalOverdue}
              </h3>
              <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Exceeded borrowing window
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 border border-rose-100 dark:border-rose-900">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Renewals */}
        <Card hover>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Renewals
              </p>
              <h3 className="text-2xl font-bold text-purple-600">
                {summary?.pendingRenewals ?? 0}
              </h3>
              <p className="text-[11px] text-purple-600 font-medium flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> Awaiting approval
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 border border-purple-100 dark:border-purple-900">
              <RefreshCw className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card hover>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Low Stock SKUs
              </p>
              <h3 className="text-2xl font-bold text-amber-600">
                {summary?.lowStockItems ?? 0}
              </h3>
              <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5" /> At or below threshold
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 border border-amber-100 dark:border-amber-900">
              <Boxes className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Overdue Table & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overdue Items Workbench Widget (2 columns) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Overdue Borrowings Requiring Follow-Up
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Students past their due date with active possession
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/issue-items')}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {overdueIssues.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">Zero Overdue Items</p>
                <p className="text-xs text-muted-foreground">All issued inventory is currently within loan schedule.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Issue #</th>
                      <th>Student</th>
                      <th>Expected Due</th>
                      <th>Overdue By</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueIssues.slice(0, 5).map((issue) => {
                      const studentObj = typeof issue.studentId === 'object' ? issue.studentId : null;
                      const days = calculateOverdueDays(issue.expectedReturnDate);
                      return (
                        <tr key={issue._id}>
                          <td className="font-semibold text-blue-600">
                            {issue.issueNumber}
                          </td>
                          <td>
                            <div className="font-medium text-foreground">
                              {studentObj?.name || 'Student'}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {studentObj?.studentId} • {studentObj?.department}
                            </div>
                          </td>
                          <td className="text-xs text-muted-foreground">
                            {formatDate(issue.expectedReturnDate)}
                          </td>
                          <td>
                            <Badge variant="overdue">
                              {days} day{days !== 1 ? 's' : ''} overdue
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => navigate(`/returns`)}
                              className="text-xs py-1 px-2.5"
                            >
                              Return
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Inventory Category Overview (1 column) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-500" />
              Category Breakdown
            </CardTitle>
            <p className="text-xs text-muted-foreground">Inventory count by equipment category</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary?.categoryBreakdown && summary.categoryBreakdown.length > 0 ? (
              summary.categoryBreakdown.map((cat) => (
                <div key={cat._id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium capitalize text-foreground">{cat._id}</span>
                    <span className="text-muted-foreground font-semibold">{cat.totalQty} units ({cat.count} SKUs)</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{
                        width: `${Math.min(100, (cat.totalQty / (summary.totalAssets || 50)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No category data available
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/inventory')}
                className="w-full text-xs font-semibold"
                rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Inspect All Inventory
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Issues Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Borrowing Transactions</CardTitle>
            <p className="text-xs text-muted-foreground">Latest items checked out to students</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/issue-items')}
            className="text-xs"
          >
            Issue New Items
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Issue Code</th>
                  <th>Student Name</th>
                  <th>Issue Date</th>
                  <th>Expected Due</th>
                  <th>Items Count</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentIssues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-muted-foreground">
                      No recent issues found.
                    </td>
                  </tr>
                ) : (
                  recentIssues.map((issue) => {
                    const studentObj = typeof issue.studentId === 'object' ? issue.studentId : null;
                    return (
                      <tr key={issue._id}>
                        <td className="font-semibold text-blue-600">{issue.issueNumber}</td>
                        <td>
                          <div className="font-medium text-foreground">{studentObj?.name || 'Student'}</div>
                          <div className="text-[11px] text-muted-foreground">{studentObj?.studentId}</div>
                        </td>
                        <td className="text-muted-foreground text-xs">{formatDate(issue.issueDate)}</td>
                        <td className="text-muted-foreground text-xs">{formatDate(issue.expectedReturnDate)}</td>
                        <td className="font-semibold">{issue.lines?.length || 1} line item(s)</td>
                        <td>
                          <Badge status={issue.status}>{issue.status.replace('_', ' ')}</Badge>
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
    </div>
  );
};
