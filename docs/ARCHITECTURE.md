# System Architecture Document
## Department Inventory Management System

---

## 1. Architecture Pattern

**Pattern:** Three-tier MVC with service layer separation.

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (SPA)                  │
│         Vite + TypeScript + Tailwind + shadcn/ui         │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS REST (JSON)
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  Express.js REST API                     │
│  Auth Middleware → Route → Controller → Service Layer    │
│         Zod Validation → Business Logic → DB             │
└───────────────────────┬─────────────────────────────────┘
                        │ Mongoose ODM
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    MongoDB Database                      │
│         Collections + Indexes + Atomic Operations        │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Project Structure

```
department-inventory-system/
├── apps/
│   ├── web/                 # React SPA (Vite)
│   └── api/                 # Express REST API
├── packages/
│   └── shared/              # Shared types + schemas (no runtime deps)
├── docs/                    # All documentation
├── scripts/                 # Seed + utilities
└── package.json             # npm workspaces root
```

---

## 3. Backend Architecture

### 3.1 Module Structure (per domain)

Each module under `apps/api/src/modules/<domain>/` contains:
- `<domain>.model.ts` — Mongoose schema + model
- `<domain>.controller.ts` — Request/response handling only
- `<domain>.service.ts` — Business logic, database calls
- `<domain>.routes.ts` — Express router
- `<domain>.validator.ts` — Zod schemas for request validation

### 3.2 Request Lifecycle

```
HTTP Request
  → CORS middleware
  → Rate limiter
  → Body parser
  → authenticate() middleware (JWT verification)
  → authorize(roles) middleware (role check)
  → Zod validation middleware
  → Controller
    → Service layer (business logic)
      → Database (Mongoose)
        → Audit log service
  → JSON response
```

### 3.3 Service Layer Responsibilities

- All business rule enforcement
- Stock accounting and validation
- Due date calculations (using server-side clock + institutional timezone)
- Atomic stock updates
- Audit log creation
- Never trust any value from the request body for critical state (stock, due dates, roles)

---

## 4. Frontend Architecture

### 4.1 State Management

| Layer | Tool |
|---|---|
| Server state | TanStack Query (react-query) |
| Form state | React Hook Form + Zod |
| UI state | React useState/useReducer |
| Auth context | React Context + useAuth hook |
| Routing | React Router v6 |

### 4.2 Feature Module Pattern

Each feature under `src/features/<domain>/` contains:
- `components/` — Feature-specific UI components
- `hooks/` — Custom hooks using TanStack Query
- `pages/` — Page-level components
- `types.ts` — Local type definitions

### 4.3 Data Flow

```
Page Component
  → useQuery/useMutation (TanStack Query)
    → API service function (src/services/api.ts)
      → Fetch/axios to backend
        → JSON response
  → Component renders data
```

---

## 5. Database Architecture

### 5.1 Collections

| Collection | Key Purpose |
|---|---|
| `users` | Authentication credentials + role |
| `students` | Student profiles |
| `inventoryitems` | Item catalog (Mode A/B) |
| `individualassets` | Per-asset tracking |
| `storagelocations` | Physical locations |
| `issuerecords` | Borrowing sessions |
| `issuelines` | Per-item lines within an issue |
| `returntransactions` | Return events |
| `renewalrequests` | Renewal lifecycle |
| `stocktransactions` | Stock adjustment ledger |
| `auditlogs` | Immutable audit trail |
| `notifications` | User notifications |

### 5.2 Key Indexes

- `users.email` — unique
- `students.enrolmentNumber` — unique
- `inventoryitems.itemCode` — unique
- `individualassets.assetId` — unique
- `individualassets.status` — for availability queries
- `issuerecords.student + status` — for student dashboard
- `issuelines.dueDate + outstandingQty` — for overdue queries
- `auditlogs.createdAt` — for history pagination

---

## 6. Authentication and Authorization

### 6.1 Token Flow

```
Login (POST /auth/login)
  → bcrypt.compare(password, hash)
  → JWT signed with HS256 (JWT_SECRET)
  → Token returned in response body
  
Subsequent Requests
  → Authorization: Bearer <token>
  → authenticate() middleware extracts + verifies JWT
  → req.user = { userId, role, ... }
  → authorize(['coordinator']) middleware checks role
```

### 6.2 Role Matrix

| Operation | Coordinator | Student | Admin |
|---|---|---|---|
| Manage inventory | ✅ | ❌ | ✅ |
| Issue items | ✅ | ❌ | ✅ |
| Record returns | ✅ | ❌ | ✅ |
| Approve renewals | ✅ | ❌ | ✅ |
| Request renewal | ❌ | ✅ (own) | ❌ |
| View own borrowings | ❌ | ✅ | ❌ |
| View all borrowings | ✅ | ❌ | ✅ |
| View reports | ✅ | ❌ | ✅ |
| View audit log | ✅ | ❌ | ✅ |

---

## 7. Stock Integrity Strategy

For development (standalone MongoDB without replica set):
- Use **conditional findOneAndUpdate** with `availableQty >= requestedQty` in the filter
- This provides atomic check-and-update at the document level
- If the condition fails, MongoDB returns null → service throws conflict error

For production (replica set available):
- Use **MongoDB multi-document transactions** via `mongoose.startSession()`
- Wrap issue/return/adjustment operations in session

---

## 8. Security Architecture

| Control | Implementation |
|---|---|
| Password hashing | bcrypt, rounds=12 |
| Token signing | HS256 JWT, configurable expiry |
| Input validation | Zod on every request body + params |
| Object ownership | Service checks `student === req.user.studentId` |
| Rate limiting | express-rate-limit on /auth/* routes |
| CORS | Configured to CORS_ORIGIN env var only |
| Request size | express body-parser limit 10kb |
| Error messages | Generic messages in production |
| Secrets | .env file, never committed |

---

## 9. Audit Logging Architecture

Every state-changing operation calls `AuditLogService.record()`:

```typescript
interface AuditLogEntry {
  action: AuditAction;        // e.g. 'ITEM_ISSUED'
  actor: ObjectId;            // user who performed the action
  entityType: string;         // 'IssueRecord', 'InventoryItem', etc.
  entityId: ObjectId;
  previousValue?: object;     // snapshot before change
  newValue?: object;          // snapshot after change
  remarks?: string;
  timestamp: Date;            // server UTC
}
```

Audit logs are write-only via normal API. No update or delete endpoints exposed.
