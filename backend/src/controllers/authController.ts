import type { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser, getCurrentUser } from '../services/authService.js';
import { AppError } from '../utils/errors.js';
import type { AuthRequest } from '../middleware/auth.js';
import { env } from '../config/env.js';

const authCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

function setAuthCookie(res: Response, token: string) {
  res.cookie('taskflow_token', token, authCookieOptions);
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = req.body ?? {};
    const result = await registerUser(name, email, password);
    setAuthCookie(res, result.token);
    res.status(201).json({ success: true, message: 'User registered successfully', data: { user: result.user } });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body ?? {};
    const result = await loginUser(email, password);
    setAuthCookie(res, result.token);
    res.status(200).json({ success: true, message: 'Login successful', data: { user: result.user } });
  } catch (error) {
    next(error);
  }
}

export function logout(_req: Request, res: Response) {
  res.clearCookie('taskflow_token', authCookieOptions);
  return res.status(204).send();
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new AppError('Authentication required', 401);
    }

    const user = await getCurrentUser(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}
