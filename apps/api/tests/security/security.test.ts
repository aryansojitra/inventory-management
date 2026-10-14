import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { config } from '../../src/config';
import { connectDatabase, disconnectDatabase } from '../../src/database/connection';
import { User } from '../../src/modules/users/user.model';
import { escapeRegex, sanitizeObject } from '../../src/middleware/sanitize.middleware';

describe('OWASP Top 10 Security Audit & Hardening Test Suite', () => {
  let coordinatorToken: string;
  let studentToken: string;
  let coordinatorId: string;
  let studentId: string;
  let studentProfileId: string;

  const createTestToken = (
    payload: any,
    options: { expiresIn?: string; algorithm?: jwt.Algorithm; secret?: string } = {}
  ) => {
    return jwt.sign(payload, options.secret || config.jwtSecret, {
      expiresIn: (options.expiresIn || '1h') as any,
      algorithm: options.algorithm || 'HS256',
    });
  };

  beforeAll(async () => {
    await connectDatabase();
    const coordinatorUser = await User.findOne({ email: 'coordinator@department.edu' }).lean();
    const studentUser = await User.findOne({ email: 'student1@department.edu' }).lean();

    if (coordinatorUser) {
      coordinatorId = coordinatorUser._id.toString();
      coordinatorToken = createTestToken({
        userId: coordinatorId,
        role: 'coordinator',
        email: coordinatorUser.email,
        fullName: coordinatorUser.fullName,
      });
    }

    if (studentUser) {
      studentId = studentUser._id.toString();
      studentProfileId = studentUser.studentProfile?.toString() || '';
      studentToken = createTestToken({
        userId: studentId,
        role: 'student',
        email: studentUser.email,
        fullName: studentUser.fullName,
        studentProfileId,
      });
    }
  }, 20000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('A01:2025 — Broken Access Control (BFLA, BOLA, IDOR)', () => {
    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/inventory');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/authentication required/i);
    });

    it('rejects student role attempting coordinator actions (BFLA) with 403', async () => {
      const res = await request(app)
        .post('/api/v1/issues')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: studentProfileId,
          lines: [{ inventoryItemId: '6ace6d9247e94e4f8ad0df20', quantity: 1 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/forbidden|requires.*permission/i);
    });

    it('blocks student from accessing audit logs with 403', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('blocks student from approving renewals with 403', async () => {
      const res = await request(app)
        .patch('/api/v1/renewals/6ace6d9347e94e4f8ad0df99/approve')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ reviewNotes: 'Self approved' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('A02:2025 — Security Misconfiguration & Security Headers', () => {
    it('returns strict security headers on all responses via Helmet', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options'] || res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('blocks requests from unauthorized CORS origins', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://malicious-phishing-site.com');

      expect(res.headers['access-control-allow-origin']).not.toBe('https://malicious-phishing-site.com');
      expect(res.headers['access-control-allow-origin']).not.toBe('*');
    });

    it('never leaks server stack traces in error responses', async () => {
      const res = await request(app).get('/api/v1/non-existent-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.stack).toBeUndefined();
    });
  });

  describe('A04:2025 — Cryptographic Failures & Token Validation', () => {
    it('rejects tokens signed with an invalid secret with 401', async () => {
      const forgedToken = createTestToken(
        { userId: coordinatorId, role: 'coordinator', email: 'coordinator@department.edu' },
        { secret: 'attacker_fake_secret_key' }
      );
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid.*token/i);
    });

    it('rejects expired tokens with 401', async () => {
      const expiredToken = createTestToken(
        { userId: coordinatorId, role: 'coordinator', email: 'coordinator@department.edu' },
        { expiresIn: '-1s' }
      );
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired|invalid/i);
    });

    it('rejects tokens using insecure none algorithm', async () => {
      const insecureToken = jwt.sign(
        { userId: coordinatorId, role: 'coordinator', email: 'coordinator@department.edu' },
        '',
        { algorithm: 'none' as any }
      );
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${insecureToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('A05:2025 — Injection & Input Sanitization', () => {
    it('sanitizes and strips NoSQL operator keys ($gt, $ne, $where)', () => {
      const maliciousPayload = {
        username: 'admin',
        password: { $gt: '' },
        filter: {
          $where: 'sleep(5000)',
          nested: { $regex: '.*' },
        },
        legitimateKey: 'validValue',
      };

      const sanitized = sanitizeObject(maliciousPayload);

      expect(sanitized.username).toBe('admin');
      expect(sanitized.legitimateKey).toBe('validValue');
      expect(sanitized.password).toEqual({});
      expect(sanitized.filter.$where).toBeUndefined();
      expect(sanitized.filter.nested.$regex).toBeUndefined();
    });

    it('escapes regex metacharacters to prevent ReDoS', () => {
      const dangerousRegexInput = 'Raspi.*(Board)+[0-9]?\\$';
      const escaped = escapeRegex(dangerousRegexInput);

      expect(escaped).toBe('Raspi\\.\\*\\(Board\\)\\+\\[0\\-9\\]\\?\\\\\\$');
      expect(() => new RegExp(escaped)).not.toThrow();
    });
  });

  describe('A08:2025 — Cross-Site Request Forgery (CSRF) Defenses', () => {
    it('blocks cookie-authenticated state-changing requests from untrusted external origins', async () => {
      const res = await request(app)
        .post('/api/v1/issues')
        .set('Cookie', [`access_token=${coordinatorToken}`])
        .set('Origin', 'https://malicious-cross-origin.com')
        .send({
          studentId: studentProfileId,
          lines: [{ inventoryItemId: '6ace6d9247e94e4f8ad0df20', quantity: 1 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('CSRF Protection');
    });

    it('permits cookie-authenticated requests with authorized application origin', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [`access_token=${coordinatorToken}`])
        .set('Origin', 'http://localhost:5173')
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Session Lifecycle & Cookie Hardening', () => {
    it('clears access_token and XSRF-TOKEN cookies upon logout', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(res.status).toBe(200);
      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();

      const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
      expect(cookieStr).toMatch(/access_token=;/);
      expect(cookieStr).toMatch(/XSRF-TOKEN=;/);
    });
  });
});
