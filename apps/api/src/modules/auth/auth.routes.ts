import { Router } from 'express';
import { login, getMe, logout } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many login attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

router.post('/login', loginLimiter, validateBody(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
