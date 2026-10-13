export const ROLES = {
  COORDINATOR: 'coordinator',
  STUDENT: 'student',
  ADMIN: 'admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const TRACKING_MODES = {
  INDIVIDUAL: 'individual',
  QUANTITY: 'quantity',
} as const;

export const ASSET_CONDITIONS = {
  GOOD: 'good',
  DAMAGED: 'damaged',
  MAINTENANCE: 'maintenance',
  LOST: 'lost',
  RETIRED: 'retired',
} as const;

export const ASSET_STATUSES = {
  AVAILABLE: 'available',
  ISSUED: 'issued',
  MAINTENANCE: 'maintenance',
  RETIRED: 'retired',
} as const;

export const ISSUE_STATUSES = {
  ACTIVE: 'active',
  PARTIALLY_RETURNED: 'partially_returned',
  RETURNED: 'returned',
  OVERDUE: 'overdue',
} as const;

export const LINE_STATUSES = {
  ACTIVE: 'active',
  RETURNED: 'returned',
  OVERDUE: 'overdue',
} as const;

export const RENEWAL_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export const RETURN_CONDITIONS = {
  GOOD: 'good',
  DAMAGED: 'damaged',
  LOST: 'lost',
} as const;

export const STOCK_TRANSACTION_TYPES = {
  ADDITION: 'addition',
  RETURN_GOOD: 'return_good',
  RETURN_DAMAGED: 'return_damaged',
  RETURN_LOST: 'return_lost',
  DAMAGE_CLEARANCE: 'damage_clearance',
  LOSS_DECLARATION: 'loss_declaration',
  MAINTENANCE_START: 'maintenance_start',
  MAINTENANCE_END: 'maintenance_end',
  ADJUSTMENT: 'adjustment',
  RETIREMENT: 'retirement',
  ISSUANCE: 'issuance',
} as const;

export const AUDIT_ACTIONS = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  ITEM_CREATED: 'ITEM_CREATED',
  ITEM_UPDATED: 'ITEM_UPDATED',
  ITEM_RETIRED: 'ITEM_RETIRED',
  ASSET_CREATED: 'ASSET_CREATED',
  ASSET_CONDITION_CHANGED: 'ASSET_CONDITION_CHANGED',
  STUDENT_REGISTERED: 'STUDENT_REGISTERED',
  STUDENT_UPDATED: 'STUDENT_UPDATED',
  ITEM_ISSUED: 'ITEM_ISSUED',
  ITEM_RETURNED: 'ITEM_RETURNED',
  RENEWAL_REQUESTED: 'RENEWAL_REQUESTED',
  RENEWAL_APPROVED: 'RENEWAL_APPROVED',
  RENEWAL_REJECTED: 'RENEWAL_REJECTED',
  STOCK_ADDED: 'STOCK_ADDED',
  STOCK_ADJUSTED: 'STOCK_ADJUSTED',
  STOCK_DAMAGED: 'STOCK_DAMAGED',
  STOCK_LOST: 'STOCK_LOST',
  STOCK_MAINTENANCE_START: 'STOCK_MAINTENANCE_START',
  STOCK_MAINTENANCE_END: 'STOCK_MAINTENANCE_END',
} as const;

export const BORROWING_DAYS = 15;
export const DEFAULT_MAX_RENEWALS = 3;

export const NOTIFICATION_TYPES = {
  DUE_SOON: 'due_soon',
  OVERDUE: 'overdue',
  RENEWAL_APPROVED: 'renewal_approved',
  RENEWAL_REJECTED: 'renewal_rejected',
  ITEM_ISSUED: 'item_issued',
  ITEM_RETURNED: 'item_returned',
} as const;
