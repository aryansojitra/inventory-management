import React, { useState, useEffect } from 'react';
import { studentService } from '../services/studentService';
import { inventoryService } from '../services/inventoryService';
import { issueService } from '../services/issueService';
import { Student, InventoryItem, IndividualAsset, IssueRecord } from '../types';
import { useCart } from '../context/CartContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Modal } from '../components/ui/Modal';
import {
  ArrowUpRight,
  Search,
  UserCheck,
  Package,
  ShoppingCart,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  QrCode,
  Layers,
  Sparkles,
  Printer,
  FileText,
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import { getErrorMessage } from '../services/api';

export const IssueItemsPage: React.FC = () => {
  const {
    selectedStudent,
    setSelectedStudent,
    cartItems,
    addItem,
    removeItem,
    clearCart,
    totalCartQuantity,
    remainingAllowedQuantity,
  } = useCart();

  // Search and inventory states
  const [studentSearch, setStudentSearch] = useState('');
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Asset selection mapping (itemId -> available assets)
  const [itemAssetsMap, setItemAssetsMap] = useState<Record<string, IndividualAsset[]>>({});
  const [selectedAssetForLine, setSelectedAssetForLine] = useState<Record<string, string>>({});

  // Checkout inputs
  const defaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  };

  const [returnDate, setReturnDate] = useState<string>(defaultDueDate());
  const [purpose, setPurpose] = useState('Academic project lab work');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successIssue, setSuccessIssue] = useState<IssueRecord | null>(null);
  const [issuedStudentSnapshot, setIssuedStudentSnapshot] = useState<Student | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if selected return date is on a weekend
  const isWeekend = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  };

  // Load students
  useEffect(() => {
    async function searchStudents() {
      if (!studentSearch.trim()) {
        const res = await studentService.getStudents({ limit: 5 });
        setStudentsList(res.data);
        return;
      }
      try {
        const res = await studentService.getStudents({ search: studentSearch, limit: 10 });
        setStudentsList(res.data);
      } catch (err) {
        console.error(err);
      }
    }
    const timer = setTimeout(searchStudents, 250);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  // Load inventory
  useEffect(() => {
    async function loadInventory() {
      try {
        const res = await inventoryService.getInventory({
          search: itemSearch || undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          limit: 50,
        });
        setInventoryList(res.data);

        // Load serialized assets for items with individual tracking
        for (const item of res.data) {
          if (item.trackingMode === 'individual') {
            const assetRes = await inventoryService.getAssets({
              itemId: item._id,
              status: 'available',
              limit: 20,
            });
            setItemAssetsMap((prev) => ({ ...prev, [item._id]: assetRes.data }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadInventory();
  }, [itemSearch, selectedCategory]);

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setStudentSearch('');
  };

  const handleAddQuantityItem = (item: InventoryItem) => {
    if (remainingAllowedQuantity <= 0) {
      setError(`Student borrow limit reached! Allowed max: ${selectedStudent?.maxBorrowLimit || 5}`);
      return;
    }
    if (item.availableQuantity <= 0) {
      setError(`Cannot add ${item.name}: Out of stock!`);
      return;
    }
    setError(null);
    addItem(item, 1);
  };

  const handleAddAssetItem = (item: InventoryItem) => {
    const assetId = selectedAssetForLine[item._id];
    const availableAssets = itemAssetsMap[item._id] || [];
    const asset = availableAssets.find((a) => a._id === assetId) || availableAssets[0];

    if (!asset) {
      setError(`No available individual assets for ${item.name}`);
      return;
    }
    if (remainingAllowedQuantity <= 0) {
      setError(`Student borrow limit reached!`);
      return;
    }
    setError(null);
    addItem(item, 1, asset);
  };

  const handleConfirmIssue = async () => {
    if (!selectedStudent) {
      setError('Please select a student first');
      return;
    }
    if (cartItems.length === 0) {
      setError('Cart is empty. Please add items to issue.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const issue = await issueService.createIssue({
        studentId: selectedStudent._id,
        expectedReturnDate: new Date(returnDate).toISOString(),
        purpose,
        notes,
        lines: cartItems.map((ci) => ({
          itemId: ci.item._id,
          quantity: ci.quantity,
          assetId: ci.asset?._id,
          dueDate: new Date(returnDate).toISOString(),
        })),
      });

      setIssuedStudentSnapshot(selectedStudent);
      setSuccessIssue(issue);
      setShowSlipModal(true);
      clearCart();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEligibleToBorrow = selectedStudent
    ? selectedStudent.currentBorrowedCount < selectedStudent.maxBorrowLimit
    : false;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ArrowUpRight className="w-5 h-5 text-blue-600" />
          Issue Item Workbench
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Atomic stock allocation, student loan quota checking, and loan schedule enforcement
        </p>
      </div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

      {successIssue && (
        <Alert
          variant="success"
          title="Item Issue Successful!"
          onClose={() => setSuccessIssue(null)}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
            <span>Transaction <strong>{successIssue.issueNumber}</strong> recorded. Items have been deducted from available stock and linked to the student profile.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSlipModal(true)}
              leftIcon={<FileText className="w-3.5 h-3.5" />}
              className="bg-white/90 text-emerald-800 border-emerald-300 hover:bg-white text-xs font-semibold shrink-0"
            >
              View & Print Acknowledgement Slip
            </Button>
          </div>
        </Alert>
      )}

      {/* STEP 1: STUDENT SELECTION BAR */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/20 dark:bg-blue-950/20">
        <CardContent className="p-5">
          {!selectedStudent ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Step 1: Select Student to Issue Items
                </label>
                <span className="text-[11px] text-muted-foreground">Search by Roll No, Name or Email</span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Type student name or ID (e.g., STU-2024-001 or Jane Doe)..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
              </div>

              {/* Student Results List */}
              {studentsList.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                  {studentsList.map((st) => {
                    const quotaRemaining = st.maxBorrowLimit - st.currentBorrowedCount;
                    return (
                      <div
                        key={st._id}
                        onClick={() => handleSelectStudent(st)}
                        className="p-3 rounded-lg border border-border bg-card hover:border-blue-500 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-foreground">{st.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {st.studentId} • {st.department}
                          </p>
                        </div>
                        <Badge variant={quotaRemaining > 0 ? 'available' : 'overdue'}>
                          {st.currentBorrowedCount}/{st.maxBorrowLimit}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow">
                  {selectedStudent.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">{selectedStudent.name}</h3>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {selectedStudent.studentId}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedStudent.department} • Semester {selectedStudent.semester} • {selectedStudent.email}
                  </p>
                </div>
              </div>

              {/* Quota Indicators */}
              <div className="flex items-center gap-3">
                <div className="bg-card border border-border px-4 py-2 rounded-xl text-center shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Active Loans</p>
                  <p className="text-lg font-extrabold text-blue-600">
                    {selectedStudent.currentBorrowedCount} / {selectedStudent.maxBorrowLimit}
                  </p>
                </div>

                <div className="bg-card border border-border px-4 py-2 rounded-xl text-center shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Remaining Quota</p>
                  <p className={`text-lg font-extrabold ${remainingAllowedQuantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {remainingAllowedQuantity} item(s)
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedStudent(null)}
                  className="text-xs"
                >
                  Change
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* STEP 2 & 3: WORKBENCH SPLIT (INVENTORY CATALOG + CART) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Item Catalog (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-500" />
                  Available Inventory Catalog
                </CardTitle>
                <p className="text-xs text-muted-foreground">Click item to add to student issue cart</p>
              </div>

              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter items..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60 max-h-[520px] overflow-y-auto scrollbar-thin">
                {inventoryList.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">
                    No items available matching criteria.
                  </p>
                ) : (
                  inventoryList.map((item) => {
                    const isSerialized = item.trackingMode === 'individual';
                    const availableAssets = itemAssetsMap[item._id] || [];
                    const isInStock = item.availableQuantity > 0;

                    return (
                      <div
                        key={item._id}
                        className="p-4 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{item.name}</span>
                            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                              {item.sku}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{item.category}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {isSerialized ? (
                                <>
                                  <QrCode className="w-3 h-3 text-blue-500" /> Serialized Asset
                                </>
                              ) : (
                                <>
                                  <Layers className="w-3 h-3 text-slate-500" /> Bulk Quantity
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Stock & Action */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-600 block">
                              {item.availableQuantity} available
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              of {item.totalQuantity} total
                            </span>
                          </div>

                          {isSerialized ? (
                            <div className="flex items-center gap-1.5">
                              {availableAssets.length > 0 ? (
                                <select
                                  value={selectedAssetForLine[item._id] || availableAssets[0]?._id}
                                  onChange={(e) =>
                                    setSelectedAssetForLine((prev) => ({
                                      ...prev,
                                      [item._id]: e.target.value,
                                    }))
                                  }
                                  className="text-xs border border-input rounded p-1 bg-background max-w-[110px]"
                                >
                                  {availableAssets.map((a) => (
                                    <option key={a._id} value={a._id}>
                                      {a.assetTag}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[10px] text-rose-500">No assets</span>
                              )}
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleAddAssetItem(item)}
                                disabled={!isInStock || !isEligibleToBorrow || availableAssets.length === 0}
                                className="text-xs py-1 px-2.5 h-8"
                              >
                                + Add
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleAddQuantityItem(item)}
                              disabled={!isInStock || !isEligibleToBorrow}
                              className="text-xs py-1 px-2.5 h-8"
                            >
                              + Add
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Issuance Cart & Checkout (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border shadow-md sticky top-20">
            <CardHeader className="bg-muted/30 border-b border-border pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                Issuance Cart ({totalCartQuantity})
              </CardTitle>
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-500 hover:underline font-medium"
                >
                  Clear Cart
                </button>
              )}
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {cartItems.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground space-y-2">
                  <ShoppingCart className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-xs font-semibold">Cart is currently empty</p>
                  <p className="text-[11px]">Select items from the catalog to add them to this loan.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="divide-y divide-border/60 max-h-48 overflow-y-auto scrollbar-thin">
                    {cartItems.map((ci) => (
                      <div
                        key={`${ci.item._id}-${ci.asset?._id || 'qty'}`}
                        className="py-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{ci.item.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {ci.asset ? `Tag: ${ci.asset.assetTag}` : `Qty: ${ci.quantity} unit(s)`}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(ci.item._id, ci.asset?._id)}
                          className="p-1 rounded text-muted-foreground hover:text-rose-500 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Return Date Selection */}
                  <div className="pt-3 border-t border-border space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Expected Return Date (Default 15 Days)
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-input bg-background font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    {/* Live Weekend Warning Check */}
                    {isWeekend(returnDate) && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Warning: Selected return date falls on a weekend. Items should ideally be due on an operational weekday.</span>
                      </div>
                    )}
                  </div>

                  {/* Purpose & Notes */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Borrowing Purpose
                    </label>
                    <input
                      type="text"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="e.g. Major Project Phase 2"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Checkout Submit */}
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleConfirmIssue}
                    isLoading={isSubmitting}
                    disabled={!selectedStudent || cartItems.length === 0}
                    className="w-full py-2.5 font-bold text-xs bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20"
                    leftIcon={<CheckCircle2 className="w-4 h-4 mr-1" />}
                  >
                    Confirm & Complete Issuance
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Official Equipment Issue Acknowledgement Slip Modal */}
      <Modal
        isOpen={showSlipModal && !!successIssue}
        onClose={() => setShowSlipModal(false)}
        title="Equipment Issue Acknowledgement Slip"
        description="Official laboratory borrowing voucher with schedule and terms"
        size="lg"
      >
        {successIssue && (
          <div className="space-y-4 print:space-y-3">
            {/* Slip Header Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white text-center space-y-1">
              <p className="text-[10px] font-bold tracking-widest uppercase opacity-80">
                Department of Computer Engineering & Information Security
              </p>
              <h3 className="text-base font-bold tracking-tight">
                LABORATORY EQUIPMENT ISSUE ACKNOWLEDGEMENT
              </h3>
              <div className="flex items-center justify-center gap-4 text-xs font-mono pt-1 text-blue-100">
                <span>Voucher: {successIssue.issueNumber}</span>
                <span>•</span>
                <span>Date: {formatDate(successIssue.issueDate || new Date())}</span>
              </div>
            </div>

            {/* Student & Borrower Details */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg border border-border bg-card text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">Borrower Name</span>
                <span className="font-bold text-foreground text-sm">
                  {issuedStudentSnapshot?.name || (successIssue.studentId as any)?.name || 'Student Borrower'}
                </span>
                <span className="block text-muted-foreground mt-0.5">
                  Enrolment / Roll No: <strong className="text-foreground font-mono">{issuedStudentSnapshot?.studentId || (successIssue.studentId as any)?.studentId || 'N/A'}</strong>
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">Academic Program & Lab</span>
                <span className="font-semibold text-foreground">
                  {issuedStudentSnapshot?.department || (successIssue.studentId as any)?.department || 'General Programme'}
                  {issuedStudentSnapshot?.semester ? ` • Semester ${issuedStudentSnapshot.semester}` : ''}
                </span>
                <span className="block text-muted-foreground mt-0.5">
                  Purpose: <span className="text-foreground">{successIssue.purpose || purpose || 'Academic Lab Practical'}</span>
                </span>
              </div>
            </div>

            {/* Issued Line Items Table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3 text-left">Item Description</th>
                    <th className="py-2 px-3 text-left">Tracking Mode</th>
                    <th className="py-2 px-3 text-left">Asset Tag / Serial</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Due Date (15d)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {successIssue.lines && successIssue.lines.length > 0 ? (
                    successIssue.lines.map((ln: any, idx: number) => {
                      const itemObj = typeof ln.itemId === 'object' ? ln.itemId : typeof ln.inventoryItem === 'object' ? ln.inventoryItem : null;
                      const assetObj = typeof ln.assetId === 'object' ? ln.assetId : typeof ln.individualAsset === 'object' ? ln.individualAsset : null;
                      return (
                        <tr key={ln._id || idx} className="bg-card">
                          <td className="py-2 px-3 font-semibold text-foreground">
                            {itemObj?.name || `Item Line #${idx + 1}`}
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant={assetObj ? 'outline' : 'secondary'} className="text-[10px]">
                              {assetObj ? 'Serialized Asset' : 'Quantity Reusable'}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 font-mono text-blue-600 font-bold">
                            {assetObj?.assetTag || assetObj?.assetId || 'N/A (Bulk)'}
                          </td>
                          <td className="py-2 px-3 text-center font-bold">
                            {ln.quantity || ln.issuedQty || 1}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-rose-600 font-mono">
                            {formatDate(ln.dueDate || successIssue.expectedReturnDate)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-muted-foreground">
                        Items recorded under loan reference {successIssue.issueNumber}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Department Rules & Undertaking */}
            <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold">Mandatory Department Borrowing Terms:</p>
              <ul className="list-disc list-inside space-y-0.5 opacity-90">
                <li>Every issued item must be returned or renewed within <strong>15 calendar days</strong> from the issue date.</li>
                <li>Submitting a renewal request alone does not extend due dates; coordinator review and approval is required.</li>
                <li>Equipment must be maintained in usable condition. Unreturned overdue items immediately restrict further borrowings.</li>
              </ul>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-border text-xs">
              <div className="space-y-6">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Student Acknowledgement</span>
                <div className="border-b border-border/80 pb-1 text-muted-foreground">
                  Signature: ____________________________________
                </div>
              </div>
              <div className="space-y-6">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Issuing Coordinator Verification</span>
                <div className="border-b border-border/80 pb-1 text-muted-foreground">
                  Authorized Sign & Stamp: ______________________
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-border print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                Print Slip
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowSlipModal(false)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
