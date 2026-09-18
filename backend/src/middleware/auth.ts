import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const requireAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('taskflow_token='))
    ?.slice('taskflow_token='.length);
  const token = cookieToken ?? (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined);

  if (!token) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || typeof decoded.userId !== 'string' || !decoded.userId) {
      throw new Error('Invalid token claims');
    }

    req.user = {
      id: decoded.userId,
      email: typeof decoded.email === 'string' ? decoded.email : '',
    };
    next();
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
};
