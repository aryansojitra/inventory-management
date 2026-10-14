# 🛡️ OWASP Top 10:2025 Security Audit & Penetration Assessment

**Project:** Department Inventory and Student Item Issue Management System (DIMS)  
**Date of Audit:** October 2026  
**Auditor Role:** Senior Application Security Engineer & Penetration Tester  
**Standard:** OWASP Top 10:2025 Web Application Security Risks  
**Scope:** Express.js REST API (`apps/api`), React 18 SPA (`apps/web`), Shared Schemas (`packages/shared`), and MongoDB Atlas Data Layer.

---

## 1. Executive Summary

A comprehensive application security audit, code review, and automated vulnerability assessment was conducted on the Department Inventory and Student Item Issue Management System. The application manages academic laboratory inventory, equipment circulations, student quotas, return inspections, and renewal workflows.

Prior to remediation, the codebase exhibited several high-severity security weaknesses:
1. **Broken Access Control (IDOR/BOLA):** Insecure Direct Object References in `/api/v1/issues/:id` allowed students to inspect other students' borrowing records; `/api/v1/renewals` leaked department-wide renewal requests to students.
2. **Security Misconfiguration:** Overly permissive CORS with wildcard origins (`origin: '*'`) alongside `credentials: true`; missing Content Security Policy (CSP); stack trace leakage in HTTP error responses.
3. **NoSQL Injection & ReDoS Risks:** Unsanitized query inputs passed directly into MongoDB `$regex` filters without escaping regex metacharacters; lack of NoSQL operator filtering (`$gt`, `$ne`, `$where`).
4. **Session & Cookie Vulnerabilities:** Stateless JWTs stored solely in client storage without secure `HttpOnly` / `SameSite` cookies; missing CSRF protection on cookie-authenticated mutations.
5. **Session Revocation Blind Spot:** Authentication middleware blindly trusted decoded JWT payloads without checking whether the user account had been deactivated in MongoDB.

All identified vulnerabilities have been remediated directly in source code and verified with **38 automated unit, business rule, and security tests**.

---

## 2. OWASP Top 10:2025 Assessment Matrix

| OWASP Risk Category | Assessed Status | Vulnerabilities Found | Remediation Status |
|---|---|---|---|
| **A01:2025 — Broken Access Control** | Assessed | 3 (IDOR, BFLA, Mass Assignment) | ✅ Remediated & Verified |
| **A02:2025 — Security Misconfiguration** | Assessed | 3 (CORS, CSP, Error Leaks) | ✅ Remediated & Verified |
| **A03:2025 — Software Supply Chain Failures** | Assessed | 1 (Dev Dependency Advisory) | ✅ Audited & Documented |
| **A04:2025 — Cryptographic Failures** | Assessed | 2 (Algorithm Confusion, Min Password) | ✅ Remediated & Verified |
| **A05:2025 — Injection (NoSQL / ReDoS)** | Assessed | 2 (NoSQL Operators, Regex ReDoS) | ✅ Remediated & Verified |
| **A06:2025 — Insecure Design** | Assessed | 1 (Deactivated Account Revocation) | ✅ Remediated & Verified |
| **A07:2025 — Authentication Failures** | Assessed | 2 (Cookie Hardening, Rate Limiting) | ✅ Remediated & Verified |
| **A08:2025 — Software & Data Integrity Failures** | Assessed | 1 (Missing CSRF Defense) | ✅ Remediated & Verified |
| **A09:2025 — Security Logging & Monitoring** | Assessed | 1 (Missing Security Escalation Logs) | ✅ Remediated & Verified |
| **A10:2025 — Server-Side Request Forgery (SSRF)** | Assessed | 0 (No external fetch functionality) | ✅ Assessed — Clean |

---

## 3. Vulnerability Register & Detailed Findings

### [SEC-01] Insecure Direct Object Reference (IDOR) on Issue Detail
- **OWASP Category:** A01:2025 — Broken Access Control
- **Severity:** 🔴 **High**
- **Affected Endpoint:** `GET /api/v1/issues/:id`
- **Description:** Any authenticated student could retrieve the complete issue record of any other student by providing the target issue ObjectId in the URL path. This leaked student roll numbers, borrowing histories, and contact information.
- **Remediation:** Added server-side ownership verification in `issue.controller.ts`. If the requesting role is `student`, the API verifies `record.student._id === req.user.studentProfileId`. Unauthorized attempts are rejected with `403 Forbidden`.
- **Status:** ✅ **Fixed & Verified by automated test.**

---

### [SEC-02] Broken Function Level Authorization (BFLA) on Renewal Queue
- **OWASP Category:** A01:2025 — Broken Access Control
- **Severity:** 🔴 **High**
- **Affected Endpoint:** `GET /api/v1/renewals`
- **Description:** Any student calling `GET /api/v1/renewals` could retrieve all pending, approved, and rejected renewal requests submitted by all students across the entire institution.
- **Remediation:** Enforced role-based query isolation in `renewal.controller.ts`. When `req.user.role === 'student'`, the `studentId` query parameter is strictly bound to `req.user.studentProfileId`, preventing cross-student data harvesting.
- **Status:** ✅ **Fixed & Verified by automated test.**

---

### [SEC-03] Mass Assignment Vulnerability on Storage Location Updates
- **OWASP Category:** A01:2025 — Broken Access Control
- **Severity:** 🟡 **Medium**
- **Affected Endpoint:** `PUT /api/v1/locations/:id`
- **Description:** Raw `req.body` was passed directly to `StorageLocation.findByIdAndUpdate()`, permitting arbitrary key-value insertion into location records without schema filtering.
- **Remediation:** Created `updateLocationSchema` with Zod and implemented strict allowlisting (`department`, `building`, `room`, `cupboard`, `description`, `isActive`) in `location.routes.ts`.
- **Status:** ✅ **Fixed & Verified.**

---

### [SEC-04] Overly Permissive CORS with Wildcard Origin and Credentials
- **OWASP Category:** A02:2025 — Security Misconfiguration
- **Severity:** 🔴 **High**
- **Affected File:** `apps/api/src/app.ts`
- **Description:** Express CORS was configured with `origin: '*'` and `credentials: true`. This invalid configuration could expose session tokens to unauthorized external web domains.
- **Remediation:** Replaced wildcard with an explicit origin allowlist (`config.corsOrigin`, `http://localhost:5173`, `http://127.0.0.1:5173`) and dynamic origin validation.
- **Status:** ✅ **Fixed & Verified by automated test.**

---

### [SEC-05] Missing Content Security Policy & Security Headers
- **OWASP Category:** A02:2025 — Security Misconfiguration
- **Severity:** 🟡 **Medium**
- **Affected File:** `apps/api/src/app.ts`
- **Description:** Helmet was initialized with default settings without custom CSP directives, clickjacking protection (`frame-ancestors: 'none'`), or production HSTS.
- **Remediation:** Configured comprehensive Helmet directives:
  - `defaultSrc: ["'self'"]`
  - `frameAncestors: ["'none'"]` (Clickjacking prevention)
  - `referrerPolicy: { policy: 'strict-origin-when-cross-origin' }`
  - `hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }` (production)
- **Status:** ✅ **Fixed & Verified by automated test.**

---

### [SEC-06] Stack Trace and Internal Path Exposure in Error Responses
- **OWASP Category:** A02:2025 — Security Misconfiguration
- **Severity:** 🟡 **Medium**
- **Affected File:** `apps/api/src/middleware/error.middleware.ts`
- **Description:** Error responses in development conditionally attached `err.stack`, exposing server filesystem paths and framework stack frames.
- **Remediation:** Removed stack trace attachment from HTTP response bodies. Stack traces are now strictly written to server console logs only.
- **Status:** ✅ **Fixed & Verified by automated test.**

---

### [SEC-07] JWT Algorithm Confusion Vulnerability
- **OWASP Category:** A04:2025 — Cryptographic Failures
- **Severity:** 🟡 **Medium**
- **Affected File:** `apps/api/src/middleware/auth.middleware.ts`
- **Description:** `jwt.verify(token, config.jwtSecret)` did not specify the `algorithms` option, exposing the system to algorithm switching attacks (e.g., token signed with `none` or asymmetric public key confusion).
- **Remediation:** Enforced `{ algorithms: ['HS256'] }` in `jwt.verify()`.
- **Status:** ✅ **Fixed & Verified by automated test.**

---

### [SEC-08] NoSQL Operator Injection Vulnerability
- **OWASP Category:** A05:2025 — Injection
- **Severity:** 🔴 **High**
- **Affected Endpoints:** All query and mutation endpoints
- **Description:** Attackers could supply nested objects containing MongoDB query operators (`{ "password": { "$gt": "" } }`) in JSON request bodies or query parameters, bypassing authentication or altering query semantics.
- **Remediation:** Implemented `mongoSanitize` middleware (`sanitize.middleware.ts`) that recursively strips any keys starting with `$` or containing `.`.
- **Status:** ✅ **Fixed & Verified by automated test.**

---

### [SEC-09] Regular Expression Denial of Service (ReDoS)
- **OWASP Category:** A05:2025 — Injection
- **Severity:** 🟡 **Medium**
- **Affected Endpoints:** `GET /inventory`, `GET /assets`, `GET /students`
- **Description:** User-supplied `search` query strings were interpolated directly into MongoDB `{ $regex: query.search }` without escaping regex control characters (`.*`, `+`, `(a+)+`).
- **Remediation:** Created `escapeRegex()` helper in `sanitize.middleware.ts` and wrapped all search inputs before building regex filters.
- **Status:** ✅ **Fixed & Verified by automated test.**

---

### [SEC-10] Token Invalidation Gap on Account Deactivation
- **OWASP Category:** A06:2025 — Insecure Design
- **Severity:** 🟡 **Medium**
- **Affected File:** `apps/api/src/middleware/auth.middleware.ts`
- **Description:** When an administrator deactivated a student or staff account (`isActive: false`), previously issued JWTs remained valid until natural expiration (up to 7 days).
- **Remediation:** Hardened `authenticate` middleware to verify `User.findById(decoded.userId).select('isActive role')` in MongoDB on authenticated requests. Deactivated accounts are instantly rejected with `403 Forbidden`.
- **Status:** ✅ **Fixed & Verified.**

---

### [SEC-11] Insecure Client Storage & Missing HttpOnly Cookies
- **OWASP Category:** A07:2025 — Authentication Failures
- **Severity:** 🟡 **Medium**
- **Affected File:** `apps/api/src/modules/auth/auth.controller.ts`
- **Description:** Authentication tokens were exclusively returned in JSON response bodies for client storage in `localStorage`, exposing credentials to XSS extraction.
- **Remediation:** Implemented dual authentication: Login issues a secure `HttpOnly`, `SameSite: 'lax'`, `Secure` cookie named `access_token` while retaining Authorization Bearer support for API clients. On logout, cookies are explicitly cleared.
- **Status:** ✅ **Fixed & Verified by automated test.**

---

### [SEC-12] Cross-Site Request Forgery (CSRF) on Cookie Mutations
- **OWASP Category:** A08:2025 — Software & Data Integrity Failures
- **Severity:** 🔴 **High**
- **Affected File:** `apps/api/src/middleware/csrf.middleware.ts`
- **Description:** With cookie-based authentication enabled, state-changing mutations (`POST`, `PUT`, `PATCH`, `DELETE`) could be targeted by cross-site requests if another site submitted requests on behalf of an authenticated user.
- **Remediation:** Implemented `csrfProtection` middleware:
  - Enforces Origin and Referer validation against allowlisted domains.
  - Verifies custom anti-CSRF headers (`X-Requested-With`, `X-CSRF-Token`).
  - Supports Double Submit Cookie verification (`XSRF-TOKEN`).
- **Status:** ✅ **Fixed & Verified by automated test.**

---

### [SEC-13] Security Alert Audit Logging
- **OWASP Category:** A09:2025 — Security Logging & Monitoring
- **Severity:** 🟢 **Low**
- **Affected File:** `apps/api/src/middleware/auth.middleware.ts`
- **Description:** Unauthorized access attempts and privilege escalation attempts were rejected silently without writing an immutable security event log.
- **Remediation:** Added `AuditLog.create()` trigger on 403 authorization failures with `action: 'SECURITY_ALERT'`, logging actor ID, role, targeted endpoint, and IP address.
- **Status:** ✅ **Fixed & Verified.**

---

## 4. Supply Chain & Dependency Review (A03:2025)

An automated dependency review was performed via `npm audit`:
- **Production Dependencies:** Express, Mongoose, Zod, Helmet, Bcrypt, JsonWebToken, Morgan, Cors, Cookie-Parser, Express-Rate-Limit. All production dependencies are clean and free of unpatched critical CVEs.
- **Development Tool Dependencies:** Dev tool notices exist in transitive packages (`vitest` / `tinypool`, `esbuild`, `tar`). Because these are build/test tools that do not execute in the production Node runtime, they do not present direct production attack surface. They are pinned in `package-lock.json` and scheduled for routine dev tool updates.

---

## 5. Residual Risk & Production Deployment Guidelines

1. **Enforce HTTPS:** Production deployment behind reverse proxies (Nginx / Cloudflare) must enforce TLS 1.3 with automated HSTS redirection.
2. **Rotate Secrets:** `JWT_SECRET` must be set via production environment variables to a high-entropy 64-character random string.
3. **Atlas Network Whitelist:** Restrict MongoDB Atlas Network Access from `0.0.0.0/0` to the dedicated static IP of the production hosting provider.
