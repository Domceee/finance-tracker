import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import app from '../app.js';
import prisma from '../prisma.js';

async function createTestUser() {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      googleId: `dev-${Date.now()}-${Math.random()}`,
      name: 'Test User',
    },
  });
}

async function loginTestUser() {
  const email = `login-${Date.now()}-${Math.random()}@example.com`;

  const response = await request(app).post('/auth/dev-login').send({
    email,
    name: 'Test User',
  });

  return {
    accessToken: response.body.accessToken as string,
    user: response.body.user as { id: number; email: string; name: string | null },
  };
}

describe.sequential('Transactions API', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns 401 when requesting transactions without auth', async () => {
    const response = await request(app).get('/transactions');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('gets an empty transactions list for the logged-in user', async () => {
    const { accessToken } = await loginTestUser();

    const response = await request(app)
      .get('/transactions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('creates a transaction for the logged-in user', async () => {
    const { accessToken, user } = await loginTestUser();

    const response = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Groceries',
        amount: 24.5,
        type: 'expense',
        category: 'FOOD',
        date: '2026-04-02T12:00:00.000Z',
        description: 'Weekly shopping',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: 'Groceries',
      amount: 24.5,
      type: 'expense',
      category: 'FOOD',
      description: 'Weekly shopping',
      userId: user.id,
    });
    expect(response.body.id).toEqual(expect.any(Number));
  });

  it('returns 401 when creating a transaction without auth', async () => {
    const response = await request(app).post('/transactions').send({
      title: 'Groceries',
      amount: 24.5,
      type: 'expense',
      category: 'FOOD',
      date: '2026-04-02T12:00:00.000Z',
      description: 'Weekly shopping',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('creates an income transaction with salary category automatically', async () => {
    const { accessToken, user } = await loginTestUser();

    const response = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Payday',
        amount: 1200,
        type: 'income',
        category: 'OTHER',
        date: '2026-04-02T12:00:00.000Z',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: 'Payday',
      amount: 1200,
      type: 'income',
      category: 'SALARY',
      userId: user.id,
    });
  });

  it('rejects salary as an expense category', async () => {
    const { accessToken } = await loginTestUser();

    const response = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Bad expense',
        amount: 24.5,
        type: 'expense',
        category: 'SALARY',
        date: '2026-04-02T12:00:00.000Z',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid transaction category' });
  });

  it('returns only the logged-in user transactions ordered by date descending', async () => {
    const { accessToken, user } = await loginTestUser();
    const otherUser = await createTestUser();

    await prisma.transaction.create({
      data: {
        title: 'Older transaction',
        amount: 10,
        type: 'expense',
        category: 'OTHER',
        date: new Date('2026-04-01T10:00:00.000Z'),
        userId: user.id,
      },
    });

    await prisma.transaction.create({
      data: {
        title: 'Newer transaction',
        amount: 100,
        type: 'income',
        category: 'SALARY',
        date: new Date('2026-04-03T10:00:00.000Z'),
        userId: user.id,
      },
    });

    await prisma.transaction.create({
      data: {
        title: 'Other user transaction',
        amount: 999,
        type: 'income',
        category: 'OTHER',
        date: new Date('2026-04-04T10:00:00.000Z'),
        userId: otherUser.id,
      },
    });

    const response = await request(app)
      .get('/transactions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].title).toBe('Newer transaction');
    expect(response.body[1].title).toBe('Older transaction');
  });

  it('updates a transaction owned by the logged-in user', async () => {
    const { accessToken, user } = await loginTestUser();

    const transaction = await prisma.transaction.create({
      data: {
        title: 'Coffee',
        amount: 3.5,
        type: 'expense',
        category: 'FOOD',
        date: new Date('2026-04-02T08:00:00.000Z'),
        userId: user.id,
      },
    });

    const response = await request(app)
      .patch(`/transactions/${transaction.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Coffee beans',
        amount: 8.99,
        category: 'SHOPPING',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: transaction.id,
      title: 'Coffee beans',
      amount: 8.99,
      type: 'expense',
      category: 'SHOPPING',
      userId: user.id,
    });
  });

  it('returns 401 when updating a transaction without auth', async () => {
    const response = await request(app)
      .patch('/transactions/1')
      .send({ title: 'Updated title' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('updates the category to salary automatically when type changes to income', async () => {
    const { accessToken, user } = await loginTestUser();

    const transaction = await prisma.transaction.create({
      data: {
        title: 'Freelance',
        amount: 150,
        type: 'expense',
        category: 'SHOPPING',
        date: new Date('2026-04-02T08:00:00.000Z'),
        userId: user.id,
      },
    });

    const response = await request(app)
      .patch(`/transactions/${transaction.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'income',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: transaction.id,
      type: 'income',
      category: 'SALARY',
      userId: user.id,
    });
  });

  it('rejects salary when updating an expense category', async () => {
    const { accessToken, user } = await loginTestUser();

    const transaction = await prisma.transaction.create({
      data: {
        title: 'Dinner',
        amount: 30,
        type: 'expense',
        category: 'EATOUT',
        date: new Date('2026-04-02T08:00:00.000Z'),
        userId: user.id,
      },
    });

    const response = await request(app)
      .patch(`/transactions/${transaction.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        category: 'SALARY',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid transaction category' });
  });

  it('deletes a transaction owned by the logged-in user', async () => {
    const { accessToken, user } = await loginTestUser();

    const transaction = await prisma.transaction.create({
      data: {
        title: 'Bus ticket',
        amount: 2.5,
        type: 'expense',
        category: 'TRANSPORT',
        date: new Date('2026-04-02T09:00:00.000Z'),
        userId: user.id,
      },
    });

    const response = await request(app)
      .delete(`/transactions/${transaction.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(204);

    const deleted = await prisma.transaction.findUnique({
      where: { id: transaction.id },
    });

    expect(deleted).toBeNull();
  });

  it('returns 401 when deleting a transaction without auth', async () => {
    const response = await request(app).delete('/transactions/1');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 for invalid delete id', async () => {
    const { accessToken } = await loginTestUser();

    const response = await request(app)
      .delete('/transactions/not-a-number')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid transaction ID' });
  });

  it('returns 400 for invalid patch id', async () => {
    const { accessToken } = await loginTestUser();

    const response = await request(app)
      .patch('/transactions/not-a-number')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated title' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid transaction ID' });
  });

  it('returns 404 when deleting a missing transaction', async () => {
    const { accessToken } = await loginTestUser();

    const response = await request(app)
      .delete('/transactions/999999')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Transaction not found' });
  });

  it('returns 404 when updating a missing transaction', async () => {
    const { accessToken } = await loginTestUser();

    const response = await request(app)
      .patch('/transactions/999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Does not exist' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Transaction not found' });
  });
});
