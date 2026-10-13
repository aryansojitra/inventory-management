import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { isMemoryMode } from './database/connection';
import { mockRouter } from './database/mockRoutes';

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

// Security
app.use(helmet());
app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging
if (config.env !== 'test') {
  app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: isMemoryMode ? 'in-memory-store' : 'mongodb',
    env: config.env,
    timestamp: new Date().toISOString(),
  });
});

// Fallback Middleware: If running in in-memory mode, route to mockRouter
app.use((req, res, next) => {
  if (isMemoryMode && req.url.startsWith('/api/v1')) {
    const originalUrl = req.url;
    req.url = req.url.replace('/api/v1', '');
    return mockRouter(req, res, (err) => {
      req.url = originalUrl;
      next(err);
    });
  }
  next();
});

// API Routes (Mongoose Mode)
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
app.use(`${V1}/stock-adjustments`, stockRoutes);

// 404 and error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
