import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import mongoose from 'mongoose';

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
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    status: isConnected ? 'ok' : 'degraded',
    database: isConnected ? 'connected' : 'disconnected',
    dbName: mongoose.connection.name || null,
    env: config.env,
    timestamp: new Date().toISOString(),
  });
});

// API Readiness Guard — Fail fast with 503 instead of buffering/hanging
app.use('/api/v1', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database Disconnected',
      message: 'MongoDB is currently not connected. Please verify your MONGODB_URI credentials in .env and ensure your MongoDB Atlas cluster is active and your IP is whitelisted.',
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
