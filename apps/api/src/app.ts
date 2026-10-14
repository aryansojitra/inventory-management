import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { mongoSanitize } from './middleware/sanitize.middleware';
import { csrfProtection } from './middleware/csrf.middleware';

// Mongoose Database Routes
import authRoutes from './modules/auth/auth.routes';
import studentRoutes from './modules/students/student.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import assetRoutes from './modules/assets/asset.routes';
import locationRoutes from './modules/locations/location.routes';
import issueRoutes from './modules/issues/issue.routes';
import returnRoutes from './modules/returns/return.routes';
import renewalRoutes from './modules/renewals/renewal.routes';
import auditLogRoutes from './modules/audit-logs/auditLog.routes';
import reportsRoutes from './modules/reports/reports.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import stockRoutes from './modules/stock-adjustments/stock.routes';

const app = express();

// 1. Security Headers (OWASP A02: Security Misconfiguration)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          config.corsOrigin,
          'http://localhost:5173',
          'http://127.0.0.1:5173',
        ].filter(Boolean),
        frameAncestors: ["'none'"], // Clickjacking defense
        objectSrc: ["'none'"],
        upgradeInsecureRequests: config.env === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts:
      config.env === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
  })
);

// 2. Strict CORS Configuration (OWASP A01 / A02)
const allowedOrigins = [
  config.corsOrigin,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (tools, curl, server-to-server), test mode, or allowlisted origins
      if (!origin || allowedOrigins.includes(origin) || config.env === 'test') {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-XSRF-Token',
    ],
  })
);

// 3. Cookie Parsing & Body parsing with strict limits (OWASP A04 / A05)
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 4. NoSQL Operator Injection Defense (OWASP A05: Injection)
app.use(mongoSanitize);

// 5. CSRF Protection for Cookie-authenticated mutations (OWASP A08: Data Integrity)
app.use(csrfProtection);

// 6. Request Logging
if (config.env !== 'test') {
  app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));
}

// 7. Global API Rate Limiting (OWASP A04: Resource Exhaustion)
const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs || 15 * 60 * 1000,
  max: config.rateLimitMax || 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate Limit Exceeded',
    message: 'Too many requests from this client. Please slow down.',
  },
});
if (config.env !== 'test') {
  app.use('/api/', apiLimiter);
}

// 8. Health check
app.get('/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    status: isConnected ? 'ok' : 'degraded',
    database: isConnected ? 'connected' : 'disconnected',
    dbName: mongoose.connection.name || null,
    env: config.env,
    timestamp: new Date().toISOString(),
  });
});

// 9. API Readiness Guard — Fail fast with 503 in development/production when DB is down
app.use('/api/v1', (req, res, next) => {
  if (config.env !== 'test' && mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database Disconnected',
      message:
        'MongoDB is currently not connected. Please verify your MONGODB_URI credentials in .env and ensure your MongoDB Atlas cluster is active.',
    });
  }
  next();
});

// 10. API Routes (Mongoose Mode)
const V1 = '/api/v1';
app.use(`${V1}/auth`, authRoutes);
app.use(`${V1}/students`, studentRoutes);
app.use(`${V1}/inventory`, inventoryRoutes);
app.use(`${V1}/assets`, assetRoutes);
app.use(`${V1}/locations`, locationRoutes);
app.use(`${V1}/issues`, issueRoutes);
app.use(`${V1}/returns`, returnRoutes);
app.use(`${V1}/renewals`, renewalRoutes);
app.use(`${V1}/audit-logs`, auditLogRoutes);
app.use(`${V1}/reports`, reportsRoutes);
app.use(`${V1}/notifications`, notificationRoutes);
app.use(`${V1}/stock`, stockRoutes);

// 11. Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
