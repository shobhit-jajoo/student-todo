import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors.js';

const prisma = new PrismaClient();

type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority: Priority;
  dueDate?: string | null;
  category?: string | null;
}

export async function getTasksForUser(userId: string, filters: {
  status?: 'all' | 'pending' | 'completed';
  priority?: Priority | 'ALL';
  category?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'dueDate' | 'priority' | 'completed';
}) {
  const where: Record<string, unknown> = { userId };

  if (filters.status === 'pending') {
    where.completed = false;
  } else if (filters.status === 'completed') {
    where.completed = true;
  }

  if (filters.priority && filters.priority !== 'ALL') {
    where.priority = filters.priority;
  }

  if (filters.category && filters.category.trim()) {
    where.category = { contains: filters.category.trim(), mode: 'insensitive' };
  }

  if (filters.search && filters.search.trim()) {
    const searchTerm = filters.search.trim();
    where.OR = [
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { category: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const orderBy: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>> = { createdAt: 'desc' };

  switch (filters.sort) {
    case 'oldest':
      orderBy.createdAt = 'asc';
      break;
    case 'dueDate':
      orderBy.dueDate = 'asc';
      break;
    case 'priority':
      orderBy.priority = 'desc';
      break;
    case 'completed':
      orderBy.completed = 'desc';
      break;
    default:
      orderBy.createdAt = 'desc';
      break;
  }

  // dueDate ordering will not work with a single object if nulls are present. Use array entry for predictable sorting.
  const tasks = await prisma.task.findMany({
    where,
    orderBy: filters.sort === 'dueDate' ? [{ dueDate: 'asc' }, { createdAt: 'desc' }] : orderBy,
  });

  return tasks.map((task: {
    id: string;
    title: string;
    description: string | null;
    completed: boolean;
    priority: Priority;
    dueDate: Date | null;
    category: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  }) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    completed: task.completed,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    category: task.category,
    userId: task.userId,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }));
}

export async function getTaskById(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    completed: task.completed,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    category: task.category,
    userId: task.userId,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export async function createTaskForUser(userId: string, data: CreateTaskInput) {
  if (!data || typeof data.title !== 'string') {
    throw new AppError('Title is required', 400);
  }

  const title = data.title.trim();
  if (!title) {
    throw new AppError('Title is required', 400);
  }
  if (title.length > 120) {
    throw new AppError('Title must be 120 characters or fewer', 400);
  }
  if (data.description !== undefined && data.description !== null && typeof data.description !== 'string') {
    throw new AppError('Description must be text', 400);
  }
  if ((data.description ?? '').length > 1000) {
    throw new AppError('Description must be 1000 characters or fewer', 400);
  }

  if (data.category !== undefined && data.category !== null && typeof data.category !== 'string') {
    throw new AppError('Category must be text', 400);
  }
  if (data.category && data.category.trim().length > 80) {
    throw new AppError('Category must be 80 characters or fewer', 400);
  }

  const priority = data.priority ?? 'MEDIUM';
  if (!['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
    throw new AppError('Priority must be LOW, MEDIUM, or HIGH', 400);
  }

  if (data.dueDate !== undefined && data.dueDate !== null && typeof data.dueDate !== 'string') {
    throw new AppError('Due date must be a valid date', 400);
  }
  const dueDateValue = data.dueDate ? new Date(data.dueDate) : null;
  if (data.dueDate && Number.isNaN(dueDateValue?.getTime() ?? NaN)) {
    throw new AppError('Due date must be a valid date', 400);
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: data.description?.trim() || null,
      priority,
      dueDate: dueDateValue,
      category: data.category?.trim() || null,
      userId,
    },
  });

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    completed: task.completed,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    category: task.category,
    userId: task.userId,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export async function updateTaskForUser(userId: string, taskId: string, data: Partial<CreateTaskInput>) {
  const existingTask = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!existingTask) {
    throw new AppError('Task not found', 404);
  }

  if (data.title !== undefined && typeof data.title !== 'string') {
    throw new AppError('Title must be text', 400);
  }
  if (data.description !== undefined && data.description !== null && typeof data.description !== 'string') {
    throw new AppError('Description must be text', 400);
  }
  if (data.category !== undefined && data.category !== null && typeof data.category !== 'string') {
    throw new AppError('Category must be text', 400);
  }
  if (data.dueDate !== undefined && data.dueDate !== null && typeof data.dueDate !== 'string') {
    throw new AppError('Due date must be a valid date', 400);
  }

  const title = data.title?.trim() ?? existingTask.title;
  if (!title) {
    throw new AppError('Title is required', 400);
  }
  if (title.length > 120) {
    throw new AppError('Title must be 120 characters or fewer', 400);
  }
  if ((data.description ?? existingTask.description ?? '').length > 1000) {
    throw new AppError('Description must be 1000 characters or fewer', 400);
  }

  if (data.category && data.category.trim().length > 80) {
    throw new AppError('Category must be 80 characters or fewer', 400);
  }

  const priority = data.priority ?? existingTask.priority;
  if (!['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
    throw new AppError('Priority must be LOW, MEDIUM, or HIGH', 400);
  }

  const dueDateValue = data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : existingTask.dueDate;
  if (data.dueDate !== undefined && data.dueDate && Number.isNaN(dueDateValue?.getTime() ?? NaN)) {
    throw new AppError('Due date must be a valid date', 400);
  }

  const nextCategory = data.category !== undefined ? (data.category?.trim() || null) : existingTask.category;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description: data.description !== undefined ? data.description?.trim() || null : existingTask.description,
      priority,
      dueDate: dueDateValue,
      category: nextCategory,
    },
  });

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    completed: task.completed,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    category: task.category,
    userId: task.userId,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export async function toggleTaskCompletion(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { completed: !task.completed },
  });

  return {
    id: updatedTask.id,
    title: updatedTask.title,
    description: updatedTask.description,
    completed: updatedTask.completed,
    priority: updatedTask.priority,
    dueDate: updatedTask.dueDate ? updatedTask.dueDate.toISOString() : null,
    category: updatedTask.category,
    userId: updatedTask.userId,
    createdAt: updatedTask.createdAt.toISOString(),
    updatedAt: updatedTask.updatedAt.toISOString(),
  };
}

export async function deleteTaskForUser(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId } });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  await prisma.task.delete({ where: { id: taskId } });
  return task.id;
}

export async function getDashboardStats(userId: string) {
  const [total, completed, pending, highPriority, dueToday] = await Promise.all([
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, completed: true } }),
    prisma.task.count({ where: { userId, completed: false } }),
    prisma.task.count({ where: { userId, priority: 'HIGH' } }),
    prisma.task.count({
      where: {
        userId,
        completed: false,
        dueDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
  ]);

  return {
    total,
    completed,
    pending,
    highPriority,
    dueToday,
  };
}
