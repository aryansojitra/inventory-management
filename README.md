# Department Inventory Management System

> A complete, production-grade web application for department inventory management and student borrowing workflows — built for the competitive coding event, Problem Statement #5.

---

## Problem Statement

Digitize department inventory management and student borrowing workflows, ensuring accurate stock records, controlled issuance, timely returns, approved renewals, and complete accountability.

---

## Main Features

| Feature | Description |
|---|---|
| **Dual Tracking Modes** | Individual asset tracking (development boards, laptops) and quantity-based stock (USB cables, adapters) |
| **Issue Workflow** | Guided issue wizard with student/item selection, purpose, automatic due-date calculation |
| **Return Workflow** | Full and partial returns with condition inspection and stock restoration |
| **Renewal Management** | Student-initiated requests; coordinator approval adds exactly 15 calendar days |
| **Overdue Management** | Real-time overdue detection, overdue-days calculation, dashboard alerts |
| **Role-Based Access** | Coordinator and Student roles with backend enforcement |
| **Audit History** | Immutable log of every inventory, issue, return, and renewal action |
| **Reports & Export** | Inventory summary, borrowing, overdue, damaged/lost/maintenance, CSV export |
| **Dashboard** | Live metrics derived from the database — no hardcoded counts |
| **Stock Integrity** | Atomic operations prevent concurrent over-issuance |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, React Router v6, TanStack Query, React Hook Form + Zod |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcrypt |
| Testing | Vitest, Supertest |
| Dev Tools | ESLint, Prettier, concurrently |

---

## Architecture Overview

```
apps/
  web/   — React frontend (Vite + TypeScript)
  api/   — Express REST API (Node.js + TypeScript)
packages/
  shared/ — Shared types, constants, Zod schemas
docs/    — Full project documentation
scripts/ — Seed and utility scripts
```

---

## Folder Structure

```
department-inventory-system/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # Express backend
├── packages/
│   └── shared/       # Shared types & schemas
├── docs/             # Documentation
├── scripts/          # Seed scripts
├── .env.example
├── package.json
└── README.md
```

---

## Prerequisites

- **Node.js** v18 or higher (v24 recommended)
- **npm** v9 or higher
- **MongoDB** v6 or higher (local or MongoDB Atlas)

---

## Installation

```bash
# 1. Clone / copy the project
cd department-inventory-system

# 2. Install all dependencies (root + workspaces)
npm install

# 3. Configure environment
copy .env.example apps/api/.env
# Edit apps/api/.env with your MongoDB URI and JWT secret
```

---

## Environment Configuration

Edit `apps/api/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/dept_inventory
JWT_SECRET=your_long_random_secret
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
INSTITUTION_TIMEZONE=Asia/Kolkata
```

---

## Database Setup

MongoDB must be running. For a local setup:

```bash
# Windows — start MongoDB service
net start MongoDB

# Or run mongod directly
mongod --dbpath C:\data\db
```

---

## Seed Instructions

```bash
# Seed demo data (safe to rerun — idempotent)
npm run seed
```

This creates:
- 1 Coordinator account
- 5 Students (M.Sc. DFIS, Semester I)
- 2 Storage locations
- 10 individual development boards + 20 USB cables (quantity-based)
- Sample issues, returns, renewal requests, overdue records

---

## Development Commands

```bash
# Start both frontend and backend
npm run dev

# Start only the API
npm run dev:api

# Start only the frontend
npm run dev:web
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api/v1

---

## Testing Commands

```bash
# Run all API tests
npm run test

# Run tests in watch mode
npm run test --workspace=apps/api -- --watch
```

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Coordinator | coordinator@demo.edu | Demo@1234 |
| Student | student1@demo.edu | Student@1234 |
| Student | student2@demo.edu | Student@1234 |

> ⚠️ These credentials are for development/demo only. Change before any production use.

---

## API Overview

Base URL: `http://localhost:5000/api/v1`

| Resource | Endpoints |
|---|---|
| Auth | POST /auth/login, POST /auth/logout, GET /auth/me |
| Students | GET/POST /students, GET/PUT /students/:id |
| Inventory | GET/POST /inventory, GET/PUT/DELETE /inventory/:id |
| Assets | GET/POST /assets, GET/PUT /assets/:id |
| Issues | GET/POST /issues, GET /issues/:id |
| Returns | POST /returns |
| Renewals | GET/POST /renewals, PUT /renewals/:id/approve, PUT /renewals/:id/reject |
| Reports | GET /reports/* |
| Audit Logs | GET /audit-logs |

Full specification: [`docs/API_SPECIFICATION.md`](docs/API_SPECIFICATION.md)

---

## Screenshots

*(Add screenshots after running the application)*

---

## Known Limitations

- MongoDB transactions require a replica set; development uses conditional single-document atomic updates as a safe fallback
- Email notifications are logged to console (no SMTP configured by default)
- Playwright E2E tests require a browser — run `npx playwright install` first

---

## Future Enhancements

- Email/SMS notifications for overdue items
- QR code scanning for asset check-in/check-out
- Barcode printing for asset labels
- Mobile app (React Native)
- Multi-department support
- Analytics dashboard with trend charts
