import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';
import {
  createTaskForUser,
  deleteTaskForUser,
  getDashboardStats,
  getTaskById,
  getTasksForUser,
  toggleTaskCompletion,
  updateTaskForUser,
} from '../services/taskService.js';

function getQueryValue(value: unknown, name: string) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new AppError(`${name} must be a single value`, 400);
  }
  return value;
}

function getStatusFilter(value: unknown) {
  const status = getQueryValue(value, 'status');
  if (status === undefined || ['all', 'pending', 'completed'].includes(status)) {
    return status as 'all' | 'pending' | 'completed' | undefined;
  }
  throw new AppError('Invalid status filter', 400);
}

function getPriorityFilter(value: unknown) {
  const priority = getQueryValue(value, 'priority');
  if (priority === undefined || ['ALL', 'LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
    return priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'ALL' | undefined;
  }
  throw new AppError('Invalid priority filter', 400);
}

function getTaskId(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new AppError('Invalid task id', 400);
  }
  return value;
}

export async function listTasks(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const tasks = await getTasksForUser(req.user.id, {
      status: getStatusFilter(req.query.status),
      priority: getPriorityFilter(req.query.priority),
      category: getQueryValue(req.query.category, 'category'),
      search: getQueryValue(req.query.search, 'search'),
      sort: getQueryValue(req.query.sort, 'sort') as 'newest' | 'oldest' | 'dueDate' | 'priority' | 'completed' | undefined,
    });

    return res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    return next(error);
  }
}

export async function getTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const task = await getTaskById(req.user.id, getTaskId(req.params.id));
    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    return next(error);
  }
}

export async function createTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const task = await createTaskForUser(req.user.id, req.body ?? {});
    return res.status(201).json({ success: true, message: 'Task created successfully', data: task });
  } catch (error) {
    return next(error);
  }
}

export async function updateTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const task = await updateTaskForUser(req.user.id, getTaskId(req.params.id), req.body ?? {});
    return res.status(200).json({ success: true, message: 'Task updated successfully', data: task });
  } catch (error) {
    return next(error);
  }
}

export async function deleteTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const deletedId = await deleteTaskForUser(req.user.id, getTaskId(req.params.id));
    return res.status(200).json({ success: true, message: 'Task deleted successfully', data: { taskId: deletedId } });
  } catch (error) {
    return next(error);
  }
}

export async function toggleTask(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const task = await toggleTaskCompletion(req.user.id, getTaskId(req.params.id));
    return res.status(200).json({ success: true, message: 'Task updated successfully', data: task });
  } catch (error) {
    return next(error);
  }
}

export async function getStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const stats = await getDashboardStats(req.user.id);
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    return next(error);
  }
}
