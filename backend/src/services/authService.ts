import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClient();

export async function registerUser(name: string, email: string, password: string) {
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw new AppError('Name, email and password are required', 400);
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedName || !normalizedEmail || !password) {
    throw new AppError('Name, email and password are required', 400);
  }

  if (normalizedName.length > 100) {
    throw new AppError('Name must be 100 characters or fewer', 400);
  }

  if (normalizedEmail.length > 255) {
    throw new AppError('Email is too long', 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new AppError('Please provide a valid email address', 400);
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new AppError('Unable to create account with those details', 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    token: generateToken(user.id, user.email),
  };
}

export async function loginUser(email: string, password: string) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new AppError('Email and password are required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    token: generateToken(user.id, user.email),
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function generateToken(userId: string, email: string) {
  return jwt.sign({ userId, email }, env.jwtSecret, { algorithm: 'HS256', expiresIn: env.jwtExpiresIn });
}
