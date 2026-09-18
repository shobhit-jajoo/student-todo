import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let authToken = '';
let userId = '';
let taskId = '';

beforeAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: ['test@example.com', 'second@example.com', 'other@example.com'] } },
  });

  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test Student',
      email: 'test@example.com',
      password: 'Password123!',
    })
    .expect(201);

  authToken = registerResponse.body.data.token;
  userId = registerResponse.body.data.user.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: ['test@example.com', 'second@example.com', 'other@example.com'] } },
  });
  await prisma.$disconnect();
});

describe('API endpoints', () => {
  it('registers a user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Second Student', email: 'second@example.com', password: 'Password123!' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('second@example.com');
  });

  it('blocks unauthenticated task access', async () => {
    await request(app).get('/api/tasks').expect(401);
  });

  it('logs in a user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password123!' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeTruthy();
  });

  it('returns current user for protected route', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('test@example.com');
  });

  it('creates a task', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Database Lab',
        description: 'Prepare ER diagram',
        priority: 'HIGH',
        dueDate: '2026-09-20T00:00:00.000Z',
        category: 'Academic',
      })
      .expect(201);

    taskId = response.body.data.id;
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Database Lab');
  });

  it('gets tasks for user', async () => {
    const response = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('filters tasks by priority and completion status', async () => {
    await request(app)
      .get('/api/tasks?priority=HIGH')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    await request(app)
      .get('/api/tasks?status=pending')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    await request(app)
      .get('/api/tasks?status=completed')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });

  it('updates a task', async () => {
    const response = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Database Lab Updated', priority: 'MEDIUM' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Database Lab Updated');
  });

  it('toggles task completion', async () => {
    const response = await request(app)
      .patch(`/api/tasks/${taskId}/toggle`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(typeof response.body.data.completed).toBe('boolean');
  });

  it('deletes a task', async () => {
    const response = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('rejects unauthorized access for another user task', async () => {
    const otherUser = await prisma.user.create({
      data: {
        name: 'Other User',
        email: 'other@example.com',
        passwordHash: 'hash',
      },
    });

    const anotherTask = await prisma.task.create({
      data: {
        title: 'Other user task',
        description: 'should not be accessible',
        priority: 'MEDIUM',
        userId: otherUser.id,
      },
    });

    await request(app)
      .get(`/api/tasks/${anotherTask.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    await prisma.task.delete({ where: { id: anotherTask.id } });
    await prisma.user.delete({ where: { id: otherUser.id } });
  });
});
