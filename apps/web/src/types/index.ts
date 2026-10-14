export type Role = 'coordinator' | 'student' | 'admin';

export type TrackingMode = 'individual' | 'quantity';

export type AssetCondition = 'good' | 'damaged' | 'maintenance' | 'lost' | 'retired';

export type AssetStatus = 'available' | 'issued' | 'maintenance' | 'retired';

export type IssueStatus = 'active' | 'partially_returned' | 'returned' | 'overdue';

export type LineStatus = 'active' | 'returned' | 'overdue';

export type RenewalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type ReturnCondition = 'good' | 'damaged' | 'lost';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  studentId?: string;
  department?: string;
  phone?: string;
}

export interface Student {
  _id: string;
  studentId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  semester: number;
  currentBorrowedCount: number;
  maxBorrowLimit: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageLocation {
  _id: string;
  code?: string;
  locationCode?: string;
  name?: string;
  department?: string;
  building?: string;
  room?: string;
  cupboard?: string;
  shelf?: string;
  description?: string;
  isActive: boolean;
}

export interface InventoryItem {
  _id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  trackingMode: TrackingMode;
  totalQuantity: number;
  availableQuantity: number;
  issuedQuantity: number;
  damagedQuantity: number;
  maintenanceQuantity: number;
  lostQuantity: number;
  lowStockThreshold: number;
  unit: string;
  locationId?: StorageLocation | string;
  location?: StorageLocation | string;
  isConsumable: boolean;
  isRetired?: boolean;
  retiredAt?: string;
  retiredReason?: string;
  retiredBy?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IndividualAsset {
  _id: string;
  itemId: InventoryItem | string;
  assetTag: string;
  assetId?: string;
  serialNumber?: string;
  condition: AssetCondition;
  status: AssetStatus;
  locationId?: StorageLocation | string;
  location?: StorageLocation | string;
  conditionHistory?: Array<{
    condition: string;
    changedBy?: any;
    changedAt: string;
    reason: string;
  }>;
  currentIssueId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueLine {
  _id: string;
  issueId: string;
  itemId: InventoryItem | string;
  assetId?: IndividualAsset | string;
  quantity: number;
  returnedQuantity: number;
  dueDate: string;
  actualReturnDate?: string;
  renewalCount: number;
  maxRenewals: number;
  status: LineStatus;
  notes?: string;
}

export interface IssueRecord {
  _id: string;
  issueNumber: string;
  studentId: Student | string;
  issuedBy: User | string;
  issueDate: string;
  expectedReturnDate: string;
  status: IssueStatus;
  purpose?: string;
  notes?: string;
  lines: IssueLine[];
  createdAt: string;
  updatedAt: string;
}

export interface ReturnItemDetail {
  lineId: string;
  itemId: string;
  assetId?: string;
  quantityReturned: number;
  condition: ReturnCondition;
  notes?: string;
}

export interface ReturnTransaction {
  _id: string;
  returnNumber: string;
  issueId: IssueRecord | string;
  studentId: Student | string;
  receivedBy: User | string;
  returnDate: string;
  items: ReturnItemDetail[];
  notes?: string;
  createdAt: string;
}

export interface RenewalRequest {
  _id: string;
  requestNumber: string;
  issueId: IssueRecord | string;
  lineId?: IssueLine | string;
  issueLine?: any;
  studentId: Student | string;
  requestedBy: User | string;
  currentDueDate: string;
  proposedDueDate: string;
  daysRequested: number;
  reason: string;
  status: RenewalStatus;
  reviewedBy?: User | string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
}

export interface StockTransaction {
  _id: string;
  transactionNumber: string;
  itemId: InventoryItem | string;
  assetId?: IndividualAsset | string;
  type: string;
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  previousBucket: string;
  newBucket: string;
  referenceType?: string;
  referenceId?: string;
  performedBy: User | string;
  reason?: string;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: User | string;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AppNotification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardSummary {
  totalItems: number;
  totalAssets: number;
  activeIssues: number;
  overdueLines: number;
  lowStockItems: number;
  pendingRenewals: number;
  categoryBreakdown: { _id: string; count: number; totalQty: number }[];
  conditionBreakdown: { _id: string; count: number }[];
  recentIssues: IssueRecord[];
  overdueIssues: IssueLine[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
  details?: unknown;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
