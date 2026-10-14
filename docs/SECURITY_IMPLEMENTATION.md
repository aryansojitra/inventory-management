# 🔒 Security Architecture & Implementation Guide

**Project:** Department Inventory and Student Item Issue Management System (DIMS)  
**Document:** Security Implementation Blueprint  
**Standard:** OWASP Top 10:2025 Security Controls & Defense-in-Depth  
**Last Updated:** October 2026  

---

## 1. Authentication Architecture

The DIMS system implements a **Dual-Channel Authentication & Session Architecture** designed to support both browser-based single-page applications (SPAs) and stateless API integrations (e.g., automated test runners, CLI scripts, mobile clients).

```
   ┌─────────────────────────────────────────────────────────────┐
   │                       Client Request                        │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         │                                                 │
┌────────▼────────────────────┐           ┌────────────────▼─────────────┐
│  Browser Client             │           │  Automated / API Client      │
│  - HttpOnly 'access_token'  │           │  - 'Authorization: Bearer'   │
│  - Anti-CSRF 'XSRF-TOKEN'   │           │    Token in Request Header   │
└────────┬────────────────────┘           └────────────────┬─────────────┘
         │                                                 │
         └────────────────────────┬────────────────────────┘
                                  │
                   ┌──────────────▼─────────────┐
                   │   auth.middleware.ts        │
                   │   1. Extract Token         │
                   │   2. Verify HS256 & Secret │
                   │   3. Database Status Check │
                   │      (isActive: true)      │
                   └──────────────┬─────────────┘
                                  │
                   ┌──────────────▼─────────────┐
                   │ Authenticated Request (Req)│
                   │ req.user: { userId, role } │
                   └────────────────────────────┘
```

### 1.1 Dual Token Intake
1. **Cookie-Based (Browser Preferred):** On successful login, the server issues an `HttpOnly`, `SameSite: 'lax'` cookie named `access_token`. This eliminates token theft via client-side JavaScript Cross-Site Scripting (XSS).
2. **Bearer Header (API / CLI / Tests):** Clients can supply `Authorization: Bearer <token>`.

### 1.2 Signature & Algorithm Integrity
All incoming JWTs are validated using strict algorithm allowlisting:
```typescript
jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] })
```
This prevents algorithm confusion attacks (e.g., forging unsigned tokens using the `none` algorithm or asymmetric key swaps).

### 1.3 Active Account & Revocation Verification
Stateless JWTs suffer from revocation latency when user accounts are suspended or deactivated. DIMS resolves this by performing a live database query against MongoDB for every authenticated request:
```typescript
const user = await User.findById(decoded.userId).select('isActive role');
if (!user || !user.isActive) {
  res.status(401).json({ success: false, message: 'Account is deactivated or does not exist.' });
}
```
If an administrator deactivates an account or changes a user's role, the revocation takes effect immediately on the subsequent HTTP request.

---

## 2. Password Hashing & Account Security

### 2.1 Cryptographic Password Storage
Passwords are never stored in plaintext. DIMS utilizes `bcrypt` with a cost factor (salt rounds) of **10**:
* **Salt Generation:** Unique, cryptographically secure 128-bit salt per user.
* **Pre-Save Mongoose Hook:** Automatic hashing in `apps/api/src/modules/auth/user.model.ts` prior to persisting to MongoDB Atlas.
* **Timing-Safe Comparison:** `bcrypt.compare(candidatePassword, user.password)` uses constant-time string comparisons to eliminate timing-side-channel enumeration.

### 2.2 Password Complexity Policies
* **Minimum Length:** Enforced minimum of **8 characters** across both coordinator and student registration routes (`student.routes.ts` and `auth.controller.ts`).
* **Support for Passphrases & Password Managers:** No arbitrary maximum length limits that truncate strong passwords.
* **Password Field Projection:** The `password` field is configured with `select: false` on the Mongoose schema, preventing accidental leakage in database queries and JSON serialization.

---

## 3. Session Lifecycle & Token Management

| Phase | Event / Action | Implementation Detail |
|---|---|---|
| **Issuance** | User submits valid credentials to `POST /api/v1/auth/login` | Server generates HS256 JWT, sets `access_token` cookie, sets `XSRF-TOKEN` cookie, returns sanitized user profile. |
| **Active Lifetime** | Idle/active session window | `config.jwtExpiresIn` sets token lifetime (default: 8 hours / `8h`). Cookie `maxAge` is synchronized to 28,800,000 ms. |
| **Per-Request Check** | Every authenticated request to `/api/v1/*` | Middleware checks token signature, expiration timestamp (`exp`), and queries MongoDB to ensure `user.isActive === true`. |
| **Termination (Logout)** | Client calls `POST /api/v1/auth/logout` | Server clears `access_token` and `XSRF-TOKEN` cookies with matching scope (`path: '/'`, `httpOnly: true`). Client discards in-memory tokens. |
| **Suspension** | Admin sets `isActive: false` on User | Immediate session revocation on subsequent API request with HTTP 401. |

---

## 4. Secure Cookie Management

Cookies issued by DIMS adhere to strict browser security controls:

```typescript
// apps/api/src/modules/auth/auth.controller.ts
const isProd = config.env === 'production';

// 1. Authentication Session Cookie
res.cookie('access_token', token, {
  httpOnly: true,                                  // Inaccessible to document.cookie (XSS immune)
  secure: isProd,                                  // Enforced HTTPS in production environments
  sameSite: 'lax',                                 // Defends against cross-site request attacks
  path: '/',                                       // Root path scope
  maxAge: 8 * 60 * 60 * 1000,                      // 8 hours in milliseconds
});

// 2. Anti-CSRF Token Cookie (Readable by SPA framework)
res.cookie('XSRF-TOKEN', csrfToken, {
  httpOnly: false,                                 // Readable by frontend to send in header
  secure: isProd,
  sameSite: 'lax',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
});
```

### Cookie Attributes Explained:
* **`HttpOnly: true`**: Completely hides the authentication token from JavaScript execution contexts, mitigating credential harvesting even in the presence of stored or reflected XSS.
* **`Secure: true`**: In production, the browser will refuse to transmit the cookie over insecure HTTP connections.
* **`SameSite: 'lax'`**: Prevents the browser from sending the cookie on cross-site subresource requests, providing primary defense against ambient cross-site requests.
* **`path: '/'`**: Explicit scope constraint.
* **Explicit Invalidation**: `res.clearCookie()` is invoked on `/auth/logout` using the identical domain, path, and security flags to guarantee complete browser removal.

---

## 5. Cross-Site Request Forgery (CSRF) Defense

Because DIMS supports cookie-based authentication for browser clients, an active CSRF defense mechanism is deployed in `apps/api/src/middleware/csrf.middleware.ts`.

### Defense-in-Depth Architecture:
1. **Bearer Token Exemption:** Requests authenticating via `Authorization: Bearer` are inherently immune to CSRF because browsers never automatically attach custom authorization headers to cross-site requests.
2. **Safe Method Exemption:** Read-only HTTP methods (`GET`, `HEAD`, `OPTIONS`) are exempt from CSRF checks.
3. **Origin & Referer Validation:** For state-changing operations (`POST`, `PUT`, `PATCH`, `DELETE`), the incoming `Origin` or `Referer` header is strictly validated against the server's allowed origins whitelist (`config.corsOrigin`, `http://localhost:5173`, `http://127.0.0.1:5173`).
4. **Anti-CSRF Header Verification:** Cookie-authenticated mutation requests must supply a matching custom header (`X-XSRF-TOKEN`, `X-CSRF-Token`, or `X-Requested-With`). If the header is missing or mismatched, the request is rejected with `403 Forbidden` (`CSRF verification failed`).

---

## 6. Cross-Origin Resource Sharing (CORS) Policy

Wildcard CORS origins (`*`) paired with credentials are a critical security violation. DIMS enforces an explicit origin allowlist in `apps/api/src/app.ts`:

```typescript
const allowedOrigins = [
  config.corsOrigin,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

cors({
  origin: (origin, callback) => {
    // Allow non-browser agents (origin undefined) or validated allowlisted origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-XSRF-TOKEN'],
})
```

---

## 7. HTTP Security Headers (Helmet)

DIMS configures `helmet` middleware in `apps/api/src/app.ts` to enforce defensive HTTP response headers:

| Header | Configured Value | Security Purpose |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; ...` | Prevents unauthorized script execution and clickjacking. |
| `X-Frame-Options` | `DENY` | Clickjacking defense for legacy browsers. |
| `X-Content-Type-Options` | `nosniff` | Disables MIME type sniffing. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Protects privacy by withholding full URL paths in referrers to external domains. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforces HTTPS in production environments. |

---

## 8. NoSQL Injection & Regular Expression ReDoS Sanitization

MongoDB dynamic queries in DIMS are protected through dual-layer sanitization:

### 8.1 Operator Stripping Middleware (`mongoSanitize`)
Located in `apps/api/src/middleware/sanitize.middleware.ts`, this middleware recursively inspects `req.body`, `req.query`, and `req.params`. Any object key containing MongoDB operator syntax (e.g., `$gt`, `$ne`, `$where`, `$regex`) or path-traversal dot notations (`.`) is completely purged before reaching controller handlers:
```typescript
delete target[key];
```

### 8.2 Safe Regular Expression Escaping (`escapeRegex`)
When search features (inventory keyword search, asset barcode search, student roll number search) perform partial string matching via Mongoose `$regex`, the user input is sanitized using `escapeRegex`:
```typescript
export function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
```
This neutralizes Regular Expression Denial of Service (ReDoS) catastrophic backtracking and query pattern hijacking.

---

## 9. Role-Based Access Control & Object-Level Authorization (RBAC / BOLA)

### 9.1 Three-Tier Role Hierarchy
1. **`admin`**: Institutional system administrator. Access to audit logs, user provisioning, global system settings.
2. **`coordinator`**: Department laboratory coordinator. Manages inventory catalog, asset acquisitions, issues, returns, condition changes, renewals.
3. **`student`**: Department enrolled student. Restricted to read-only access to available inventory, viewing personal issue history, and requesting renewals for their own active loans.

### 9.2 Server-Enforced Object Ownership
Every API route that returns or modifies individual records verifies identity ownership on the server:
* `GET /api/v1/issues/:id`: If `req.user.role === 'student'`, the controller asserts `record.student._id.toString() === req.user.studentProfileId`. Unauthorized queries return `403 Forbidden`.
* `GET /api/v1/renewals`: Student queries are automatically filtered with `{ studentId: req.user.studentProfileId }`.
* `POST /api/v1/renewals`: The server asserts that the `issueId` belongs to the requesting student before allowing renewal request creation.

### 9.3 Security Escalation Logging
When any user attempts an unauthorized action triggering a `403 Forbidden`, the event is logged to the database audit trail (`AuditLog`) with action tag `SECURITY_ALERT`:
```typescript
AuditLog.create({
  action: 'SECURITY_ALERT',
  performedBy: req.user.userId,
  details: { reason: 'Unauthorized access attempt', path: req.originalUrl, role: req.user.role }
});
```

---

## 10. Rate Limiting & Resource Exhaustion Defense

Using `express-rate-limit`, DIMS applies two tiers of IP-based rate limiting in `apps/api/src/middleware/rateLimiter.middleware.ts`:

1. **Authentication Limiter:**
   - Scope: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`
   - Limit: **15 requests per 15 minutes** per IP address.
   - Purpose: Mitigates credential stuffing, password spraying, and brute-force attacks.
2. **Global API Limiter:**
   - Scope: All `/api/v1/*` endpoints.
   - Limit: **100 requests per 15 minutes** per IP address.
   - Purpose: Protects MongoDB Atlas cluster from denial of service and resource exhaustion.

---

## 11. Environment & Secret Management

All sensitive secrets are isolated outside version control using `.env` configuration files:
* `JWT_SECRET`: High-entropy signing secret.
* `MONGODB_URI`: Encrypted TLS SRV connection string to MongoDB Atlas.
* `NODE_ENV`: Runtime environment (`development`, `production`, `test`).
* `CORS_ORIGIN`: Approved frontend origin URL.

The application configuration layer (`apps/api/src/config/index.ts`) validates required environment variables at boot time and throws an unhandled exception if `JWT_SECRET` or `MONGODB_URI` are undefined.

---

## 12. Production Deployment Security Checklist

When deploying DIMS to a production cloud environment (e.g., AWS, GCP, Azure, Render):

1. **TLS / HTTPS Termination:** Ensure all incoming HTTP traffic is permanently redirected to HTTPS (port 443) with TLS 1.3.
2. **Reverse Proxy Trust:** If running behind NGINX, Cloudflare, or AWS ALB, configure Express:
   ```typescript
   app.set('trust proxy', 1);
   ```
3. **Database TLS:** Verify that the MongoDB Atlas connection URI enforces `ssl=true` / `tls=true` and TLS 1.2+.
4. **Environment Isolation:** Verify `NODE_ENV=production` is set in production runtime environment to guarantee stack trace suppression and secure cookie flags.
5. **Secrets Vault:** Inject `JWT_SECRET` and `MONGODB_URI` via cloud secrets managers (e.g., AWS Secrets Manager, Google Secret Manager) rather than unencrypted local disk files.
