import { Request, Response } from 'express';
import { authService } from './auth.service';
import { asyncHandler, sendSuccess } from '../../utils/apiUtils';
import { AuthRequest } from '../../middleware/auth.middleware';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress || '';
  const result = await authService.login(email, password, ipAddress);
  sendSuccess(res, result, 'Login successful');
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const user = await authService.getMe(userId);
  sendSuccess(res, user, 'User profile');
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  // JWT is stateless — client discards the token
  sendSuccess(res, null, 'Logged out successfully');
});
