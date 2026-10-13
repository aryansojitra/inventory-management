import React, { useState, useEffect } from 'react';
import { reportService } from '../services/reportService';
import { DashboardSummary } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { BarChart3, Download, RefreshCw, CheckCircle2, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const sum = await reportService.getDashboardSummary();
      setSummary(sum);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleExportCSV = () => {
    if (!summary) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Department Inventory Summary Report\n';
    csvContent += `Generated At,${new Date().toISOString()}\n\n`;
    csvContent += 'Metric,Value\n';
    csvContent += `Total Inventory Items,${summary.totalItems}\n`;
    csvContent += `Total Serialized Assets,${summary.totalAssets}\n`;
    csvContent += `Active Loans,${summary.activeIssues}\n`;
    csvContent += `Overdue Lines,${summary.overdueLines}\n`;
    csvContent += `Pending Renewals,${summary.pendingRenewals}\n`;
    csvContent += `Low Stock Items,${summary.lowStockItems}\n\n`;

    csvContent += 'Category,Total Quantity,SKU Count\n';
    summary.categoryBreakdown?.forEach((cat) => {
      csvContent += `${cat._id},${cat.totalQty},${cat.count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Operational Reports & Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key operational metrics, equipment turnover, stock health, and exportable reports
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadReports}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Equipment Catalog
              </p>
              <h3 className="text-2xl font-bold text-foreground">{summary?.totalItems || 0} SKUs</h3>
              <p className="text-xs text-muted-foreground">{summary?.totalAssets || 0} serialized units</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Circulation Rate
              </p>
              <h3 className="text-2xl font-bold text-blue-600">{summary?.activeIssues || 0} active</h3>
              <p className="text-xs text-muted-foreground">Currently on loan to students</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Compliance & Delinquency
              </p>
              <h3 className="text-2xl font-bold text-rose-600">{summary?.overdueLines || 0} overdue</h3>
              <p className="text-xs text-muted-foreground">Pending return past loan term</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution Table */}
      <Card>
        <CardHeader>
          <CardTitle>Department Equipment by Category</CardTitle>
          <p className="text-xs text-muted-foreground">Item distribution across academic categories</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Unique Item Models</th>
                  <th>Total Physical Units</th>
                  <th>Proportion</th>
                </tr>
              </thead>
              <tbody>
                {summary?.categoryBreakdown && summary.categoryBreakdown.length > 0 ? (
                  summary.categoryBreakdown.map((cat) => {
                    const totalQty = summary.totalAssets || 50;
                    const pct = Math.round((cat.totalQty / totalQty) * 100);
                    return (
                      <tr key={cat._id}>
                        <td className="font-semibold capitalize text-foreground">{cat._id}</td>
                        <td className="font-medium">{cat.count} SKUs</td>
                        <td className="font-bold text-blue-600">{cat.totalQty} units</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-muted-foreground">
                      No category metrics available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
