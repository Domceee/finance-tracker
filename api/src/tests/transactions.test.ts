import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import app from '../app.js';
import prisma from '../prisma.js';

describe('Transactions API', () => {
  beforeEach(async () => {
    await prisma.transaction.deleteMany();
  });

  afterEach(async () => {
    await prisma.transaction.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('gets an empty transactions list', async () => {
    const response = await request(app).get('/transactions');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('creates a transaction', async () => {
    const response = await request(app).post('/transactions').send({
      title: 'Groceries',
      amount: 24.5,
      type: 'expense',
      category: 'Food',
      date: '2026-04-02T12:00:00.000Z',
      description: 'Weekly shopping',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: 'Groceries',
      amount: 24.5,
      type: 'expense',
      category: 'Food',
      description: 'Weekly shopping',
    });
    expect(response.body.id).toEqual(expect.any(Number));
  });

  it('returns transactions ordered by date descending', async () => {
    await prisma.transaction.create({
      data: {
        title: 'Older transaction',
        amount: 10,
        type: 'expense',
        category: 'Misc',
        date: new Date('2026-04-01T10:00:00.000Z'),
      },
    });

    await prisma.transaction.create({
      data: {
        title: 'Newer transaction',
        amount: 100,
        type: 'income',
        category: 'Salary',
        date: new Date('2026-04-03T10:00:00.000Z'),
      },
    });

    const response = await request(app).get('/transactions');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].title).toBe('Newer transaction');
    expect(response.body[1].title).toBe('Older transaction');
  });

  it('updates a transaction', async () => {
    const transaction = await prisma.transaction.create({
      data: {
        title: 'Coffee',
        amount: 3.5,
        type: 'expense',
        category: 'Food',
        date: new Date('2026-04-02T08:00:00.000Z'),
      },
    });

    const response = await request(app)
      .patch(`/transactions/${transaction.id}`)
      .send({
        title: 'Coffee beans',
        amount: 8.99,
        category: 'Groceries',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: transaction.id,
      title: 'Coffee beans',
      amount: 8.99,
      type: 'expense',
      category: 'Groceries',
    });
  });

  it('deletes a transaction', async () => {
    const transaction = await prisma.transaction.create({
      data: {
        title: 'Bus ticket',
        amount: 2.5,
        type: 'expense',
        category: 'Transport',
        date: new Date('2026-04-02T09:00:00.000Z'),
      },
    });

    const response = await request(app).delete(`/transactions/${transaction.id}`);

    expect(response.status).toBe(204);

    const deleted = await prisma.transaction.findUnique({
      where: { id: transaction.id },
    });

    expect(deleted).toBeNull();
  });

  it('returns 400 for invalid delete id', async () => {
    const response = await request(app).delete('/transactions/not-a-number');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid transaction ID' });
  });

  it('returns 400 for invalid patch id', async () => {
    const response = await request(app)
      .patch('/transactions/not-a-number')
      .send({ title: 'Updated title' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid transaction ID' });
  });

  it('returns 404 when deleting a missing transaction', async () => {
    const response = await request(app).delete('/transactions/999999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Transaction not found' });
  });

  it('returns 404 when updating a missing transaction', async () => {
    const response = await request(app)
      .patch('/transactions/999999')
      .send({ title: 'Does not exist' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Transaction not found' });
  });
});
