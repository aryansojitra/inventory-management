# Database Schema
## Department Inventory Management System

---

## 1. User

```typescript
{
  _id: ObjectId,
  email: string,           // unique, lowercase
  passwordHash: string,
  role: 'coordinator' | 'student' | 'admin',
  fullName: string,
  isActive: boolean,
  studentProfile: ObjectId | null,  // ref: Student (if role=student)
  lastLogin: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `email` (unique)

---

## 2. Student

```typescript
{
  _id: ObjectId,
  enrolmentNumber: string,    // unique, e.g. "DFIS2601"
  fullName: string,
  programme: string,          // e.g. "M.Sc. DFIS"
  semester: number,           // 1–6
  email: string,
  phone: string,
  address: string,
  isActive: boolean,
  user: ObjectId,             // ref: User
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `enrolmentNumber` (unique), `programme`

---

## 3. InventoryItem

```typescript
{
  _id: ObjectId,
  itemCode: string,           // unique, e.g. "INV-001"
  name: string,
  category: string,           // e.g. "Development Board", "Cable"
  description: string,
  make: string,
  model: string,
  trackingMode: 'individual' | 'quantity',
  
  // Quantity-based fields (trackingMode === 'quantity')
  totalStock: number,
  availableQty: number,
  issuedQty: number,
  damagedQty: number,
  lostQty: number,
  maintenanceQty: number,
  retiredQty: number,
  
  // Individual-mode fields (trackingMode === 'individual')
  totalAssets: number,
  availableAssets: number,
  
  location: ObjectId,         // ref: StorageLocation (default)
  policy: {
    maxRenewals: number,      // default: 3
    borrowingDays: number,    // default: 15
  },
  isRetired: boolean,
  retiredAt: Date | null,
  retiredReason: string | null,
  retiredBy: ObjectId | null,
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `itemCode` (unique), `trackingMode`, `category`

---

## 4. IndividualAsset

```typescript
{
  _id: ObjectId,
  assetId: string,           // unique, e.g. "DB-001"
  serialNumber: string,
  inventoryItem: ObjectId,   // ref: InventoryItem
  location: ObjectId,        // ref: StorageLocation
  condition: 'good' | 'damaged' | 'maintenance' | 'lost' | 'retired',
  status: 'available' | 'issued' | 'maintenance' | 'retired',
  currentIssue: ObjectId | null,  // ref: IssueLine (active allocation)
  notes: string,
  addedBy: ObjectId,
  conditionHistory: [
    {
      condition: string,
      changedBy: ObjectId,
      changedAt: Date,
      reason: string
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `assetId` (unique), `inventoryItem`, `status`, `condition`

---

## 5. StorageLocation

```typescript
{
  _id: ObjectId,
  locationCode: string,      // unique, e.g. "LAB-A-C1"
  department: string,
  building: string,
  room: string,
  cupboard: string,
  description: string,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `locationCode` (unique)

---

## 6. IssueRecord

```typescript
{
  _id: ObjectId,
  student: ObjectId,          // ref: Student
  issuedBy: ObjectId,         // ref: User (coordinator)
  issueDate: Date,
  purpose: string,
  status: 'active' | 'partially_returned' | 'returned' | 'overdue',
  lines: [ObjectId],          // ref: IssueLine[]
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `student`, `status`, `issueDate`

---

## 7. IssueLine

```typescript
{
  _id: ObjectId,
  issueRecord: ObjectId,       // ref: IssueRecord
  
  // One of these must be set
  inventoryItem: ObjectId | null,   // ref: InventoryItem (quantity-based)
  individualAsset: ObjectId | null, // ref: IndividualAsset (individual)
  
  issuedQty: number,          // Original quantity issued
  returnedQty: number,        // Cumulative returned
  outstandingQty: number,     // issuedQty - returnedQty
  
  issueDate: Date,
  dueDate: Date,              // issueDate + 15 calendar days
  
  renewalCount: number,       // Number of approved renewals
  maxRenewals: number,        // Copied from item policy at issue time
  
  status: 'active' | 'returned' | 'overdue',
  
  returnsHistory: [ObjectId], // ref: ReturnTransaction[]
  renewalsHistory: [ObjectId],// ref: RenewalRequest[]
  
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `issueRecord`, `dueDate + outstandingQty` (overdue queries), `status`

---

## 8. ReturnTransaction

```typescript
{
  _id: ObjectId,
  issueLine: ObjectId,        // ref: IssueLine
  issueRecord: ObjectId,      // ref: IssueRecord
  student: ObjectId,          // ref: Student
  inventoryItem: ObjectId,    // ref: InventoryItem
  individualAsset: ObjectId | null,
  
  returnDate: Date,
  quantityReturned: number,
  conditionOnReturn: 'good' | 'damaged' | 'lost',
  
  receivedBy: ObjectId,       // ref: User (coordinator)
  remarks: string,
  
  // Stock changes applied
  restoredToAvailable: number,  // quantity restored to availableQty
  markedDamaged: number,
  markedLost: number,
  
  createdAt: Date
}
```
**Indexes:** `issueLine`, `issueRecord`, `student`, `returnDate`

---

## 9. RenewalRequest

```typescript
{
  _id: ObjectId,
  issueLine: ObjectId,        // ref: IssueLine
  issueRecord: ObjectId,      // ref: IssueRecord
  student: ObjectId,          // ref: Student
  requestedBy: ObjectId,      // ref: User (student's user account)
  requestDate: Date,
  
  previousDueDate: Date,      // Due date at time of request
  proposedDueDate: Date,      // previousDueDate + 15 days
  
  status: 'pending' | 'approved' | 'rejected' | 'cancelled',
  
  // On decision
  decidedBy: ObjectId | null, // ref: User (coordinator)
  decidedAt: Date | null,
  remarks: string,
  
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `issueLine`, `student`, `status`, `requestDate`

---

## 10. StockTransaction

```typescript
{
  _id: ObjectId,
  inventoryItem: ObjectId,    // ref: InventoryItem
  transactionType: 
    'addition' | 
    'return_good' | 
    'return_damaged' | 
    'return_lost' | 
    'damage_clearance' |
    'loss_declaration' |
    'maintenance_start' |
    'maintenance_end' |
    'adjustment' |
    'retirement',
  
  quantityChange: number,     // positive = increase, negative = decrease
  fieldAffected: string,      // e.g. 'availableQty', 'damagedQty'
  
  previousValue: number,
  newValue: number,
  
  relatedIssue: ObjectId | null,
  relatedReturn: ObjectId | null,
  reason: string,
  performedBy: ObjectId,      // ref: User
  createdAt: Date
}
```
**Indexes:** `inventoryItem`, `transactionType`, `createdAt`

---

## 11. AuditLog

```typescript
{
  _id: ObjectId,
  action: string,             // e.g. 'ITEM_ISSUED', 'RENEWAL_APPROVED'
  actor: ObjectId,            // ref: User
  actorRole: string,
  entityType: string,         // 'IssueRecord', 'InventoryItem', etc.
  entityId: ObjectId,
  previousValue: object | null,
  newValue: object | null,
  remarks: string,
  ipAddress: string,
  createdAt: Date             // Server UTC — immutable
}
```
**Indexes:** `actor`, `entityType + entityId`, `createdAt`, `action`

---

## 12. Notification

```typescript
{
  _id: ObjectId,
  recipient: ObjectId,        // ref: User
  type: 
    'due_soon' | 
    'overdue' | 
    'renewal_approved' | 
    'renewal_rejected' |
    'item_issued' |
    'item_returned',
  title: string,
  message: string,
  relatedIssue: ObjectId | null,
  isRead: boolean,
  createdAt: Date
}
```
**Indexes:** `recipient + isRead`, `createdAt`

---

## Stock Accounting Rules

### Adding Stock
```
totalStock += qty
availableQty += qty
```

### Issuing (quantity-based)
```
availableQty -= qty     [atomic conditional: availableQty >= qty]
issuedQty += qty
```

### Full/Partial Return (good condition)
```
issuedQty -= returnedQty
availableQty += returnedQty
```

### Partial Return (damaged condition)
```
issuedQty -= returnedQty
damagedQty += returnedQty
// availableQty NOT changed
```

### Damage Clearance (coordinator clears damaged item)
```
damagedQty -= qty
availableQty += qty  // or retiredQty += qty if retiring
```

### Loss Declaration
```
issuedQty -= qty  // or damagedQty -= qty
lostQty += qty
// availableQty NOT changed
totalStock unchanged (loss is already within totalStock)
```

**Invariant:** `availableQty + issuedQty + damagedQty + lostQty + maintenanceQty + retiredQty = totalStock`
