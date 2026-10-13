# Product Requirements Document (PRD)
## Department Inventory Management System
**Version:** 1.0  
**Date:** October 2026  
**Programme Context:** M.Sc. DFIS — Semester I

---

## 1. Product Overview

**Product Name:** Department Inventory Management System (DIMS)

**Purpose:** Digitize and automate department inventory management and student borrowing workflows. The system ensures accurate stock records, controlled item issuance, timely returns, coordinator-approved renewals, and complete transaction accountability.

**Target Users:** Inventory Coordinators, Students (M.Sc. DFIS Semester I), optional Administrator.

**Deployment Context:** Internal department web application — accessible via browser on campus network.

---

## 2. User Roles

### 2.1 Inventory Coordinator

**Access Level:** Full operational access.

**Capabilities:**
- Manage inventory items (create, edit, retire, view history)
- Manage individual assets (register, update condition/status, view per-asset history)
- Register and manage students
- Manage storage locations
- Issue reusable items to registered students
- Record full and partial returns with condition inspection
- Approve or reject student renewal requests (with remarks)
- Manage damaged, lost, and maintenance items (explicit clearance required)
- Record stock additions and adjustments with documented reasons
- Retire inventory with documented reasons
- View overdue items and upcoming due dates
- Generate and export reports
- Inspect full transaction and audit history

**Restrictions:**
- Cannot be created via public registration
- Created only by an Administrator or via seed script

### 2.2 Student

**Access Level:** Personal borrowing records only.

**Capabilities:**
- View their own borrowing dashboard
- View currently issued items and due dates
- Request renewals before the current due date
- Track renewal decisions and coordinator remarks
- View complete personal issue, return, and renewal history
- View overdue borrowing records with reminders

**Restrictions:**
- Cannot access another student's private borrowing records (enforced server-side)
- Cannot approve or reject any renewal
- Cannot modify stock or inventory data
- Cannot view other students' personal information

### 2.3 Administrator (Optional)

If implemented:
- Manage coordinator accounts
- Configure system-level settings
- Access all operational data

---

## 3. Inventory Management

### 3.1 Mode A — Individually Tracked Assets

**Examples:** Development boards, laptops, laboratory instruments.

**Requirements:**
- Each asset has a unique Asset ID (e.g., `DB-001`)
- Optional serial number field
- Parent inventory item reference
- Storage location assignment
- Current condition: Good | Damaged | Under Maintenance | Lost | Retired
- Current status: Available | Issued | Reserved | Retired
- Complete per-asset issue and return history
- An individual asset may only have ONE active allocation at any time
- Assets in non-Available status cannot be issued

### 3.2 Mode B — Quantity-Based Reusable Items

**Examples:** USB cables, adapters, reusable connectors.

**Stock Ledger Fields:**
| Field | Description |
|---|---|
| `totalStock` | Total recorded stock units |
| `availableQty` | Units available for issuance |
| `issuedQty` | Units currently outstanding |
| `damagedQty` | Units declared damaged (unavailable) |
| `lostQty` | Units declared lost (unavailable) |
| `maintenanceQty` | Units under maintenance (unavailable) |
| `retiredQty` | Units permanently retired |

**Constraint:** `availableQty + issuedQty + damagedQty + lostQty + maintenanceQty + retiredQty = totalStock`

**Rules:**
- `availableQty` must never go below zero
- All stock changes must be atomic
- Damaged/lost/maintenance units do not automatically become available

---

## 4. Issue Management

### 4.1 Issue Workflow

1. Coordinator selects a registered, active student
2. Coordinator selects an eligible inventory item or individual asset
3. For quantity-based items: enter quantity (≤ availableQty)
4. Enter borrowing purpose
5. System records issue date (server-side, institutional timezone)
6. System calculates due date: `issueDate + 15 calendar days`
7. System validates availability (server-side)
8. System atomically decrements availableQty / marks asset as Issued
9. System generates issue acknowledgement
10. Issue transaction recorded in history and audit log

### 4.2 Validation Rules

- Student must be registered and active
- Inventory item must be active and not retired
- For individual assets: status must be Available
- For quantity-based: requested quantity ≤ current availableQty
- Quantity must be ≥ 1
- Purpose is required

### 4.3 Issue Acknowledgement

Contains: Student name, enrolment number, item name, asset ID (if applicable), quantity, issue date, due date, issuing staff name.

---

## 5. Return Management

### 5.1 Return Workflow

1. Coordinator selects the active issue record
2. Selects item/asset to return
3. Enters quantity returned (≤ outstanding quantity)
4. Enters return date (server-side)
5. Records condition of returned items
6. Records receiving staff member and remarks
7. System atomically updates stock:
   - Good condition → restored to availableQty
   - Damaged condition → added to damagedQty (NOT availableQty)
8. Outstanding quantity decremented
9. Return transaction recorded

### 5.2 Partial Return Rules

- `returnedQty` ≤ `outstandingQty` for that issue line
- Remaining outstanding quantity continues to accrue overdue if applicable
- Each partial return recorded as a separate ReturnTransaction
- Issue record remains Open until all quantities returned

### 5.3 Condition Management

| Condition | Returns to Available Stock? |
|---|---|
| Good/Usable | ✅ Yes |
| Damaged | ❌ No — goes to damagedQty |
| Lost (declared during return) | ❌ No — goes to lostQty |

Coordinator must explicitly clear damaged/maintenance items before they become available again.

---

## 6. Renewal Management

### 6.1 Student Request

- Student may submit ONE renewal request per active issue line
- Request must be submitted BEFORE the current due date
- No renewal of closed/fully returned records
- No renewal if a pending request already exists for the same line

### 6.2 Coordinator Decision

| Decision | Effect on Due Date |
|---|---|
| Approved | `newDueDate = existingDueDate + 15 days` |
| Rejected | Due date unchanged |
| Pending | Due date unchanged |

### 6.3 Renewal Constraints

- Only the owning student may request a renewal
- Only coordinators may approve or reject
- Maximum renewals: configurable per inventory policy (default: 3)
- Overdue items may still be renewed if policy allows, but overdue days keep accumulating until returned
- Renewal of an already-renewed past-due-date request: not permitted if item is overdue

### 6.4 Renewal Record

Stores: issue line ref, requester, request date, previous due date, new due date (on approval), status, approver, decision timestamp, remarks.

---

## 7. Overdue Management

### 7.1 Overdue Detection

An issue line is overdue when:
- `currentDate > dueDate`
- `outstandingQty > 0`
- Issue record is not fully Closed/Returned

### 7.2 Overdue Days Calculation

```
overdueDays = daysBetween(dueDate, today)  // calendar days, inclusive of today
```

Example: Due 16 Oct 2026, Today 19 Oct 2026 → Overdue 3 days.

### 7.3 Dashboard Display

- Student name, enrolment number
- Item name and asset ID (if applicable)
- Outstanding quantity
- Current due date
- Overdue days
- Contact information (authorized view)

---

## 8. Reports

| Report | Contents |
|---|---|
| Inventory Summary | All items with tracking mode, total/available/issued counts |
| Stock Availability | Items with low or zero available stock |
| Student Borrowing | Per-student: current, historical, overdue items |
| Item Issue History | Per-item: all issues, returns, renewals |
| Programme-wise Activity | Issue/return activity by student programme |
| Laboratory-wise Inventory | Assets and stock by storage location |
| Overdue Report | All overdue items with days count |
| Damaged & Maintenance | Items awaiting clearance |
| Lost Items | All declared lost items |
| Renewal History | All renewal requests and decisions |
| Stock Adjustment History | All stock add/correct/adjust transactions |
| Item Retirement History | All retired items with reasons |

All reports support:
- CSV export
- Print-friendly view
- Date range filtering where applicable
- Pagination

---

## 9. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Authentication | JWT with secure HttpOnly cookie or Authorization header |
| Password Security | bcrypt with work factor ≥ 12 |
| Authorization | Role-based, enforced server-side on every endpoint |
| Data Integrity | Atomic stock operations, no negative balances |
| Auditability | Immutable audit log for all state-changing operations |
| Responsive Design | Mobile-first, works on 320px–1920px viewports |
| Accessibility | WCAG 2.1 AA — keyboard navigation, ARIA labels, focus management |
| Input Validation | Client-side (Zod) + server-side (Zod) — server is authoritative |
| Error Handling | Consistent JSON error responses; no stack traces in production |
| Performance | API responses < 500ms for typical queries; pagination on all lists |
| Personal Data | Student contact info accessible only to authorized coordinators |
| Maintainability | TypeScript throughout; ESLint + Prettier enforced |
| Testability | Business logic in services; dependency injection for clock/DB |

---

## 10. Acceptance Criteria Checklist

### Inventory & Issuance
- [ ] Issue one available individual asset successfully
- [ ] Reject issuance of an already allocated asset
- [ ] Reject issuance of a damaged asset
- [ ] Issue quantity-based stock within the available limit
- [ ] Reject a quantity greater than available stock
- [ ] Reject issuance to an unregistered student
- [ ] Prevent available stock from becoming negative
- [ ] Generate correct issue acknowledgement

### Due Dates & Renewals
- [ ] Issue on 1 Oct 2026 → due date is 16 Oct 2026
- [ ] Approve renewal on due date 16 Oct 2026 → new due date 31 Oct 2026
- [ ] Pending renewal does not change due date
- [ ] Rejected renewal does not change due date
- [ ] Reject renewal requests submitted on/after due date
- [ ] Reject renewal beyond configured limit
- [ ] Prevent unauthorized renewal approval
- [ ] Prevent duplicate renewal-decision processing

### Returns
- [ ] Return full issued quantity
- [ ] Return partial quantity
- [ ] Outstanding quantities correct after partial return
- [ ] Reject return quantity > outstanding quantity
- [ ] Restore only Good-condition items to available stock
- [ ] Keep damaged returns in damagedQty
- [ ] Prevent duplicate submissions inflating stock

### Overdue Management
- [ ] Detect overdue borrowing record
- [ ] Calculate overdue days correctly
- [ ] Approved renewal updates overdue calculation
- [ ] Partial return leaves outstanding qty overdue when applicable

### Authorization & Auditing
- [ ] Students cannot access other students' records
- [ ] Students cannot perform coordinator-only operations
- [ ] Responsible user recorded on every transaction
- [ ] Stock corrections recorded with reasons
- [ ] Transaction history preserved after issue closes

### Concurrency & Integrity
- [ ] Concurrent issuance cannot exceed available stock
- [ ] Concurrent allocation of same individual asset prevented
- [ ] Failed transactions leave stock and due dates unchanged
