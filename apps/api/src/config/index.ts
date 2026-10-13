import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load root .env first, then apps/api/.env with override
const candidatePaths = [
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/api/.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../apps/api/.env'),
];

for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: true });
  }
}
if (process.env.DOTENV_CONFIG_PATH && fs.existsSync(process.env.DOTENV_CONFIG_PATH)) {
  dotenv.config({ path: process.env.DOTENV_CONFIG_PATH, override: true });
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dept_inventory',
  mongoDbName: process.env.MONGODB_DB_NAME || 'dept_inventory',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  timezone: process.env.INSTITUTION_TIMEZONE || 'Asia/Kolkata',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  seed: {
    coordinatorEmail: process.env.SEED_COORDINATOR_EMAIL || 'coordinator@department.edu',
    coordinatorPassword: process.env.SEED_COORDINATOR_PASSWORD || 'demo1234',
    studentPassword: process.env.SEED_STUDENT_PASSWORD || 'demo1234',
  },
};
