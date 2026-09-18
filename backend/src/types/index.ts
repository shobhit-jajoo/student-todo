export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  category: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface TaskFilters {
  status?: 'all' | 'pending' | 'completed';
  priority?: Priority | 'ALL';
  category?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'dueDate' | 'priority' | 'completed';
}
