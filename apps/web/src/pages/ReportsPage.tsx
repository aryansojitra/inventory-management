import React, { useState, useEffect } from 'react';
import { reportService, ProgrammeActivity, LaboratoryActivity } from '../services/reportService';
import { DashboardSummary } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  BarChart3,
  Download,
  Printer,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Users,
  GraduationCap,
  Building2,
  Boxes,
  Clock,
  Search,
  Wrench,
  Archive,
} from 'lucide-react';
import { formatDate, calculateOverdueDays } from '../lib/utils';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'items' | 'students' | 'programmes' | 'laboratories' | 'overdue' | 'damaged_maint' | 'retired'
  >('items');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [itemHealth, setItemHealth] = useState<any[]>([]);
  const [studentBorrowing, setStudentBorrowing] = useState<any[]>([]);
  const [programmeActivity, setProgrammeActivity] = useState<ProgrammeActivity[]>([]);
  const [laboratoryActivity, setLaboratoryActivity] = useState<LaboratoryActivity[]>([]);
  const [overdueList, setOverdueList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadAllReports = async () => {
    setIsLoading(true);
    try {
      const [sum, items, students, progs, labs, overdues] = await Promise.all([
        reportService.getDashboardSummary().catch(() => null),
        reportService.getInventoryHealthReport().catch(() => []),
        reportService.getStudentBorrowingReport().catch(() => []),
        reportService.getProgrammeActivity().catch(() => []),
        reportService.getLaboratoryActivity().catch(() => []),
        reportService.getOverdueReport().catch(() => []),
      ]);

      if (sum) setSummary(sum);
      setItemHealth(items);
      setStudentBorrowing(students);
      setProgrammeActivity(progs);
      setLaboratoryActivity(labs);
      setOverdueList(overdues);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllReports();
  }, []);

  // Generic CSV exporter
  const exportCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += headers.join(',') + '\n';
    rows.forEach((row) => {
      const sanitized = row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`);
      csvContent += sanitized.join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCurrentTab = () => {
    if (activeTab === 'items') {
      const headers = ['Item Code / SKU', 'Name', 'Category', 'Tracking Mode', 'Total Stock', 'Available', 'Issued', 'Damaged', 'Lost', 'In Maintenance'];
      const rows = filteredItems.map((i) => [
        i.sku || i.itemCode || '',
        i.name || '',
        i.category || '',
        i.trackingMode || 'quantity',
        i.totalQuantity || i.totalStock || 0,
        i.availableQuantity || i.availableQty || 0,
        i.issuedQuantity || i.issuedQty || 0,
        i.damagedQuantity || i.damagedQty || 0,
        i.lostQuantity || i.lostQty || 0,
        i.maintenanceQuantity || i.maintenanceQty || 0,
      ]);
      exportCSV('item_wise_inventory_report', headers, rows);
    } else if (activeTab === 'students') {
      const headers = ['Student Name', 'Enrolment Number', 'Programme', 'Semester', 'Issue Code', 'Issue Date', 'Status'];
      const rows = filteredStudents.map((r) => [
        r.studentId?.fullName || r.studentId?.name || '',
        r.studentId?.enrolmentNumber || r.studentId?.studentId || '',
        r.studentId?.programme || '',
        r.studentId?.semester || '',
        r.issueNumber || '',
        r.issueDate ? new Date(r.issueDate).toLocaleDateString() : '',
        r.status || '',
      ]);
      exportCSV('student_wise_borrowing_report', headers, rows);
    } else if (activeTab === 'programmes') {
      const headers = ['Academic Programme', 'Unique Borrowers', 'Total Issues', 'Currently Active Loans'];
      const rows = programmeActivity.map((p) => [
        p.programme || 'Unspecified',
        p.uniqueStudents || 0,
        p.totalIssues || 0,
        p.activeIssues || 0,
      ]);
      exportCSV('programme_wise_activity_report', headers, rows);
    } else if (activeTab === 'laboratories') {
      const headers = ['Location Code', 'Department', 'Laboratory / Room', 'Building', 'Cupboard', 'Item SKUs', 'Serialized Assets', 'Total Units', 'Available', 'Issued'];
      const rows = laboratoryActivity.map((l) => [
        l.locationCode || '',
        l.department || '',
        l.room || '',
        l.building || '',
        l.cupboard || '',
        l.itemCount || 0,
        l.assetCount || 0,
        l.totalStock || 0,
        l.availableQty || 0,
        l.issuedQty || 0,
      ]);
      exportCSV('laboratory_wise_records_report', headers, rows);
    } else if (activeTab === 'overdue') {
      const headers = ['Issue Number', 'Student Name', 'Enrolment No', 'Item Name', 'Asset Tag / Serial', 'Quantity', 'Due Date', 'Days Overdue', 'Explanatory Notice'];
      const rows = overdueList.map((o) => {
        const studentObj = o.studentId || (o.issueRecord as any)?.student;
        const studentName = studentObj?.fullName || studentObj?.name || 'Student';
        const enrolment = studentObj?.enrolmentNumber || studentObj?.studentId || 'N/A';
        const itemName = o.itemId?.name || 'Department Item';
        const assetTag = o.assetId?.assetId || o.assetId?.serialNumber || 'N/A';
        const days = o.overdueDays || calculateOverdueDays(o.dueDate);
        const notice = `${itemName} (${assetTag}) issued to student enrolment number ${enrolment} was due on ${formatDate(o.dueDate)} and is overdue by ${days} day${days !== 1 ? 's' : ''}.`;
        return [
          o.issueRecord?.issueNumber || o.id,
          studentName,
          enrolment,
          itemName,
          assetTag,
          o.outstandingQty || 1,
          formatDate(o.dueDate),
          days,
          notice,
        ];
      });
      exportCSV('overdue_items_report', headers, rows);
    } else if (activeTab === 'damaged_maint') {
      const headers = ['SKU Code', 'Item Name', 'Category', 'Damaged Units', 'Maintenance Units', 'Available Units', 'Total Stock'];
      const rows = damagedAndMaintItems.map((item) => [
        item.sku || item.itemCode || '',
        item.name || '',
        item.category || '',
        item.damagedQuantity || item.damagedQty || 0,
        item.maintenanceQuantity || item.maintenanceQty || 0,
        item.availableQuantity || item.availableQty || 0,
        item.totalQuantity || item.totalStock || 0,
      ]);
      exportCSV('damaged_and_maintenance_quarantine_report', headers, rows);
    } else if (activeTab === 'retired') {
      const headers = ['SKU Code', 'Item Name', 'Category', 'Total Units', 'Retired At', 'Decommissioning Reason'];
      const rows = retiredItems.map((item) => [
        item.sku || item.itemCode || '',
        item.name || '',
        item.category || '',
        item.totalQuantity || item.totalStock || 0,
        item.retiredAt ? new Date(item.retiredAt).toLocaleDateString() : 'Recorded',
        item.retiredReason || 'Decommissioned by department policy',
      ]);
      exportCSV('retired_inventory_models_report', headers, rows);
    }
  };

  // Filtered datasets
  const filteredItems = itemHealth.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q)
    );
  });

  const filteredStudents = studentBorrowing.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const st = r.studentId;
    return (
      st?.fullName?.toLowerCase().includes(q) ||
      st?.name?.toLowerCase().includes(q) ||
      st?.enrolmentNumber?.toLowerCase().includes(q) ||
      r.issueNumber?.toLowerCase().includes(q)
    );
  });

  const damagedAndMaintItems = itemHealth.filter(
    (item) =>
      (item.damagedQuantity || item.damagedQty || 0) > 0 ||
      (item.maintenanceQuantity || item.maintenanceQty || 0) > 0
  );

  const retiredItems = itemHealth.filter((item) => item.isRetired);

  return (
    <div className="space-y-6 animate-fade-in print:space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Inventory & Circulation Reports
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Multi-perspective audit: student-wise, item-wise, programme-wise, and laboratory-wise records
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Report
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCurrentTab}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Active Tab (CSV)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAllReports}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Catalog SKUs</p>
              <h3 className="text-xl font-bold text-foreground">{summary?.totalItems || itemHealth.length}</h3>
              <p className="text-[11px] text-muted-foreground">Managed inventory</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
              <Boxes className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Loans</p>
              <h3 className="text-xl font-bold text-blue-600">{summary?.activeIssues || 0}</h3>
              <p className="text-[11px] text-muted-foreground">In student circulation</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Overdue Items</p>
              <h3 className="text-xl font-bold text-rose-600">{overdueList.length}</h3>
              <p className="text-[11px] text-rose-500 font-medium">Exceeded 15-day term</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Laboratories</p>
              <h3 className="text-xl font-bold text-emerald-600">{laboratoryActivity.length}</h3>
              <p className="text-[11px] text-muted-foreground">Storage locations</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3 print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'items'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Item-wise Records ({itemHealth.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'students'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Student-wise Borrowings ({studentBorrowing.length})
          </button>
          <button
            onClick={() => setActiveTab('programmes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'programmes'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Programme-wise Activity ({programmeActivity.length})
          </button>
          <button
            onClick={() => setActiveTab('laboratories')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'laboratories'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Laboratory-wise Records ({laboratoryActivity.length})
          </button>
          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'overdue'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Overdue Reminders ({overdueList.length})
          </button>
          <button
            onClick={() => setActiveTab('damaged_maint')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'damaged_maint'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Damaged & Maint. ({damagedAndMaintItems.length})
          </button>
          <button
            onClick={() => setActiveTab('retired')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'retired'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            Retired Models ({retiredItems.length})
          </button>
        </div>

        {(activeTab === 'items' || activeTab === 'students') && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search in ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            />
          </div>
        )}
      </div>

      {/* TAB CONTENT 1: ITEM-WISE RECORDS */}
      {activeTab === 'items' && (
        <Card>
          <CardHeader className="py-3 px-4 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-600" />
              Item-wise Inventory Stock & Condition Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Item Code / SKU</th>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Tracking</th>
                    <th>Total</th>
                    <th>Available</th>
                    <th>Issued</th>
                    <th>Damaged</th>
                    <th>Lost</th>
                    <th>Maint.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-muted-foreground">
                        No inventory records found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item._id || item.id}>
                        <td className="font-mono font-bold text-blue-600">{item.sku || item.itemCode}</td>
                        <td className="font-semibold text-foreground">{item.name}</td>
                        <td className="capitalize">{item.category}</td>
                        <td>
                          <Badge variant={item.trackingMode === 'individual' ? 'outline' : 'secondary'}>
                            {item.trackingMode === 'individual' ? 'Asset Tracked' : 'Quantity Reusable'}
                          </Badge>
                        </td>
                        <td className="font-bold">{item.totalQuantity ?? item.totalStock ?? 0}</td>
                        <td className="font-bold text-emerald-600">{item.availableQuantity ?? item.availableQty ?? 0}</td>
                        <td className="font-semibold text-blue-600">{item.issuedQuantity ?? item.issuedQty ?? 0}</td>
                        <td className="font-semibold text-amber-600">{item.damagedQuantity ?? item.damagedQty ?? 0}</td>
                        <td className="font-semibold text-rose-600">{item.lostQuantity ?? item.lostQty ?? 0}</td>
                        <td className="font-semibold text-purple-600">{item.maintenanceQuantity ?? item.maintenanceQty ?? 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT 2: STUDENT-WISE BORROWING RECORDS */}
      {activeTab === 'students' && (
        <Card>
          <CardHeader className="py-3 px-4 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Student-wise Equipment Borrowing Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Enrolment Number</th>
                    <th>Programme</th>
                    <th>Issue Code</th>
                    <th>Issue Date</th>
                    <th>Status</th>
                    <th>Line Items</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No student borrowing records found.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((r) => {
                      const st = r.studentId || {};
                      return (
                        <tr key={r._id || r.id}>
                          <td className="font-semibold text-foreground">{st.fullName || st.name || 'Student'}</td>
                          <td className="font-mono text-blue-600">{st.enrolmentNumber || st.studentId || 'N/A'}</td>
                          <td>{st.programme || 'General'} {st.semester ? `(Sem ${st.semester})` : ''}</td>
                          <td className="font-mono">{r.issueNumber}</td>
                          <td>{r.issueDate ? formatDate(r.issueDate) : 'N/A'}</td>
                          <td>
                            <Badge status={r.status}>{r.status?.replace('_', ' ')}</Badge>
                          </td>
                          <td className="font-medium">{r.lines?.length || 1} item(s)</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT 3: PROGRAMME-WISE ACTIVITY */}
      {activeTab === 'programmes' && (
        <Card>
          <CardHeader className="py-3 px-4 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              Academic Programme-wise Activity & Equipment Utilization
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Academic Programme</th>
                    <th>Unique Enrolled Borrowers</th>
                    <th>Total Historical Issues</th>
                    <th>Active Borrowings</th>
                    <th>Circulation Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {programmeActivity.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No programme activity records found.
                      </td>
                    </tr>
                  ) : (
                    programmeActivity.map((p) => {
                      const totalCirc = summary?.activeIssues || 1;
                      const pct = Math.min(100, Math.round(((p.activeIssues || 0) / totalCirc) * 100));
                      return (
                        <tr key={p.programme}>
                          <td className="font-bold text-foreground">{p.programme || 'Unspecified'}</td>
                          <td className="font-semibold text-blue-600">{p.uniqueStudents || 0} students</td>
                          <td className="font-medium">{p.totalIssues || 0} issues recorded</td>
                          <td className="font-bold text-emerald-600">{p.activeIssues || 0} active loans</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[11px] font-semibold text-muted-foreground">{pct}%</span>
                            </div>
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
      )}

      {/* TAB CONTENT 4: LABORATORY-WISE RECORDS */}
      {activeTab === 'laboratories' && (
        <Card>
          <CardHeader className="py-3 px-4 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Laboratory & Storage Location Allocation Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Location Code</th>
                    <th>Laboratory / Room</th>
                    <th>Department</th>
                    <th>Building / Cupboard</th>
                    <th>SKUs Stored</th>
                    <th>Total Stock</th>
                    <th>Available</th>
                    <th>Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {laboratoryActivity.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        No laboratory location records found.
                      </td>
                    </tr>
                  ) : (
                    laboratoryActivity.map((lab) => (
                      <tr key={lab._id}>
                        <td className="font-mono font-bold text-blue-600">{lab.locationCode}</td>
                        <td className="font-semibold text-foreground">{lab.room}</td>
                        <td>{lab.department}</td>
                        <td className="text-muted-foreground">
                          {lab.building ? `${lab.building} ` : ''}{lab.cupboard ? `• Cupboard ${lab.cupboard}` : ''}
                        </td>
                        <td className="font-medium">{lab.itemCount} items ({lab.assetCount} assets)</td>
                        <td className="font-bold">{lab.totalStock} units</td>
                        <td className="font-bold text-emerald-600">{lab.availableQty} units</td>
                        <td className="font-semibold text-blue-600">{lab.issuedQty} units</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT 5: OVERDUE ITEMS & EXPLANATORY NOTICES */}
      {activeTab === 'overdue' && (
        <Card className="border-rose-200 dark:border-rose-900">
          <CardHeader className="py-3 px-4 border-b border-border bg-rose-50/40 dark:bg-rose-950/20">
            <CardTitle className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Overdue Equipment List & Formatted Reminders
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Exact delinquency statements matching Department Loan Enforcement requirements
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th>Student & Enrolment</th>
                    <th>Equipment Details</th>
                    <th>Outstanding Qty</th>
                    <th>Due Date</th>
                    <th>Days Overdue</th>
                    <th>Official Delinquency Notice</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        Zero overdue items. All borrowers are within their 15-day loan term.
                      </td>
                    </tr>
                  ) : (
                    overdueList.map((o) => {
                      const studentObj = o.studentId || (o.issueRecord as any)?.student;
                      const studentName = studentObj?.fullName || studentObj?.name || 'Student';
                      const enrolment = studentObj?.enrolmentNumber || studentObj?.studentId || 'XXXXX';
                      const itemName = o.itemId?.name || 'Department Item';
                      const assetTag = o.assetId?.assetId || o.assetId?.serialNumber || '';
                      const days = o.overdueDays || calculateOverdueDays(o.dueDate);
                      const displayTitle = assetTag ? `${itemName} (${assetTag})` : itemName;
                      const noticeText = `${displayTitle} issued to student enrolment number ${enrolment} was due on ${formatDate(o.dueDate)} and is overdue by ${days} day${days !== 1 ? 's' : ''}.`;

                      return (
                        <tr key={o._id || o.id}>
                          <td>
                            <div className="font-bold text-foreground">{studentName}</div>
                            <div className="font-mono text-[11px] text-muted-foreground">{enrolment}</div>
                          </td>
                          <td>
                            <div className="font-semibold text-foreground">{itemName}</div>
                            {assetTag && <div className="font-mono text-[11px] text-blue-600">{assetTag}</div>}
                          </td>
                          <td className="font-bold text-center">{o.outstandingQty || 1}</td>
                          <td className="font-medium text-muted-foreground">{formatDate(o.dueDate)}</td>
                          <td>
                            <Badge variant="overdue">{days} day{days !== 1 ? 's' : ''}</Badge>
                          </td>
                          <td className="font-medium text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/20 italic">
                            &ldquo;{noticeText}&rdquo;
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
      )}

      {/* TAB CONTENT 6: DAMAGED & MAINTENANCE AWAITING CLEARANCE */}
      {activeTab === 'damaged_maint' && (
        <Card>
          <CardHeader className="py-3 px-4 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-600" />
                Damaged & Under-Maintenance Stock (Quarantined from Issue)
              </div>
              <span className="text-xs font-normal text-muted-foreground">
                Explicit coordinator clearance required before units can return to circulation
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU & Item Name</th>
                    <th>Category</th>
                    <th className="text-center">Damaged Units</th>
                    <th className="text-center">Under Maintenance</th>
                    <th className="text-center">Total Quarantined</th>
                    <th className="text-center">Available Stock</th>
                    <th className="text-center">Total Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {damagedAndMaintItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        All items are currently in good condition with zero quarantined units.
                      </td>
                    </tr>
                  ) : (
                    damagedAndMaintItems.map((item) => {
                      const damaged = item.damagedQuantity || item.damagedQty || 0;
                      const maint = item.maintenanceQuantity || item.maintenanceQty || 0;
                      const totalQuarantined = damaged + maint;

                      return (
                        <tr key={item._id || item.id}>
                          <td>
                            <div className="font-bold text-foreground">{item.name}</div>
                            <div className="font-mono text-[11px] text-muted-foreground">{item.sku || item.itemCode}</div>
                          </td>
                          <td className="text-xs text-muted-foreground">{item.category}</td>
                          <td className="text-center font-bold text-amber-600 bg-amber-50/50 dark:bg-amber-950/20">
                            {damaged}
                          </td>
                          <td className="text-center font-bold text-yellow-600 bg-yellow-50/50 dark:bg-yellow-950/20">
                            {maint}
                          </td>
                          <td className="text-center font-bold text-rose-600">
                            {totalQuarantined}
                          </td>
                          <td className="text-center font-semibold text-emerald-600">
                            {item.availableQuantity || item.availableQty || 0}
                          </td>
                          <td className="text-center font-bold text-foreground">
                            {item.totalQuantity || item.totalStock || 0}
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
      )}

      {/* TAB CONTENT 7: RETIRED INVENTORY MODELS */}
      {activeTab === 'retired' && (
        <Card>
          <CardHeader className="py-3 px-4 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-slate-600" />
                Decommissioned & Retired Inventory Models
              </div>
              <span className="text-xs font-normal text-muted-foreground">
                Permanently removed from issuance according to institutional policy
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU & Model Name</th>
                    <th>Category</th>
                    <th className="text-center">Total Lifetime Units</th>
                    <th>Decommissioned Date</th>
                    <th>Documented Retirement Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {retiredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No equipment models are retired. All items in the catalog remain active.
                      </td>
                    </tr>
                  ) : (
                    retiredItems.map((item) => (
                      <tr key={item._id || item.id}>
                        <td>
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <span>{item.name}</span>
                            <Badge variant="overdue">Retired</Badge>
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">{item.sku || item.itemCode}</div>
                        </td>
                        <td className="text-xs text-muted-foreground">{item.category}</td>
                        <td className="text-center font-bold text-foreground">
                          {item.totalQuantity || item.totalStock || 0}
                        </td>
                        <td className="text-xs text-muted-foreground font-mono">
                          {item.retiredAt ? formatDate(item.retiredAt) : 'Recorded in Ledger'}
                        </td>
                        <td className="text-xs text-muted-foreground italic bg-muted/20">
                          &ldquo;{item.retiredReason || 'Decommissioned by authorized coordinator'}&rdquo;
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
