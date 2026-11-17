import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import app from '../app.js';
import prisma from '../prisma.js';
import { createAccount } from './helpers.js';
import { signAccessToken } from '../lib/jwt.js';

async function loginTestUser() {
  const email = `lists-${Date.now()}-${Math.random()}@example.com`;
  const response = await request(app).post('/auth/dev-login').send({ email, name: 'List User' });

  return {
    accessToken: response.body.accessToken as string,
    userId: response.body.user.id as number,
  };
}

async function seedTransactions(userId: number, accountId: number, count: number) {
  for (let index = 1; index <= count; index += 1) {
    await prisma.transaction.create({
      data: {
        title: index % 2 === 0 ? `Coffee ${index}` : `Salary ${index}`,
        amount: index,
        type: index % 2 === 0 ? 'expense' : 'income',
        category: index % 2 === 0 ? 'FOOD' : 'SALARY',
        date: new Date(Date.UTC(2026, 3, index)),
        userId,
        accountId,
      },
    });
  }
}

describe.sequential('List endpoints', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('paginates transactions with meta and page links', async () => {
    const { accessToken, userId } = await loginTestUser();
    const account = await createAccount(userId);
    await seedTransactions(userId, account.id, 5);

    const response = await request(app)
      .get('/transactions?page=2&limit=2')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(response.body._links.prev.href).toBe('/transactions?page=1&limit=2');
    expect(response.body._links.next.href).toBe('/transactions?page=3&limit=2');
    expect(response.body.data[0]._links.self).toEqual({
      href: `/transactions/${response.body.data[0].id}`,
      method: 'GET',
    });
  });

  it('filters transactions by type, date range and search', async () => {
    const { accessToken, userId } = await loginTestUser();
    const account = await createAccount(userId);
    await seedTransactions(userId, account.id, 6);

    const response = await request(app)
      .get('/transactions?type=expense&from=2026-04-03&to=2026-04-06T23:59:59Z&search=coffee')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.map((t: { title: string }) => t.title)).toEqual(['Coffee 6', 'Coffee 4']);
    expect(response.body.meta.total).toBe(2);
    expect(response.body._links.self.href).toContain('type=expense');
  });

  it('filters accounts by type', async () => {
    const { accessToken, userId } = await loginTestUser();
    await prisma.account.create({ data: { userId, name: 'Wallet', type: 'CASH' } });
    await prisma.account.create({ data: { userId, name: 'Visa', type: 'CARD' } });

    const response = await request(app)
      .get('/accounts?type=CARD')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.map((a: { name: string }) => a.name)).toEqual(['Visa']);
    expect(response.body.data[0]._links.transactions.href).toBe(`/accounts/${response.body.data[0].id}/transactions`);
  });

  it.each([
    '/transactions?page=0',
    '/transactions?limit=500',
    '/transactions?type=transfer',
    '/transactions?category=PETS',
    '/transactions?from=yesterday',
    '/transactions?from=2026-05-01&to=2026-04-01',
    '/transactions?accountId=abc',
    '/accounts?type=GOLD',
    '/accounts?search=',
    '/budgets?page=abc',
  ])('returns 400 for %s', async (path) => {
    const { accessToken } = await loginTestUser();

    const response = await request(app).get(path).set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('filters transactions by category and account', async () => {
    const { accessToken, userId } = await loginTestUser();
    const card = await createAccount(userId, 'Card');
    const cash = await createAccount(userId, 'Cash');
    await seedTransactions(userId, card.id, 4);
    await seedTransactions(userId, cash.id, 2);

    const response = await request(app)
      .get(`/transactions?category=FOOD&accountId=${card.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.map((t: { title: string }) => t.title)).toEqual(['Coffee 4', 'Coffee 2']);
    expect(response.body.data.every((t: { accountId: number }) => t.accountId === card.id)).toBe(true);
  });

  it('filters an account transaction list through the nested route', async () => {
    const { accessToken, userId } = await loginTestUser();
    const account = await createAccount(userId);
    await seedTransactions(userId, account.id, 4);

    const response = await request(app)
      .get(`/accounts/${account.id}/transactions?type=income&limit=1`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.map((t: { title: string }) => t.title)).toEqual(['Salary 3']);
    expect(response.body.meta).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 });
    expect(response.body._links.next.href).toBe(`/accounts/${account.id}/transactions?type=income&page=2&limit=1`);
  });

  it('searches accounts by name, case-insensitively', async () => {
    const { accessToken, userId } = await loginTestUser();
    await prisma.account.create({ data: { userId, name: 'Holiday Savings', type: 'SAVINGS' } });
    await prisma.account.create({ data: { userId, name: 'Daily Card', type: 'CARD' } });

    const response = await request(app)
      .get('/accounts?search=SAVINGS')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.map((a: { name: string }) => a.name)).toEqual(['Holiday Savings']);
  });

  it('searches notes of a transaction', async () => {
    const { accessToken, userId } = await loginTestUser();
    const account = await createAccount(userId);
    await seedTransactions(userId, account.id, 1);
    const transaction = await prisma.transaction.findFirstOrThrow({ where: { userId } });
    await prisma.note.createMany({
      data: [
        { transactionId: transaction.id, content: 'Paid by card' },
        { transactionId: transaction.id, content: 'Receipt in drawer' },
      ],
    });

    const response = await request(app)
      .get(`/transactions/${transaction.id}/notes?search=receipt`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.map((n: { content: string }) => n.content)).toEqual(['Receipt in drawer']);
    expect(response.body.data[0]._links.transaction.href).toBe(`/transactions/${transaction.id}`);
  });

  it('paginates and searches budgets', async () => {
    const { accessToken, userId } = await loginTestUser();
    await prisma.budget.createMany({
      data: [
        { userId, name: 'Food', limitAmount: 200, categories: 'FOOD' },
        { userId, name: 'Fun', limitAmount: 100, categories: 'BAR,ENTERTAINMENT' },
        { userId, name: 'Food out', limitAmount: 80, categories: 'EATOUT' },
      ],
    });

    const response = await request(app)
      .get('/budgets?search=food&limit=1&page=2')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.map((b: { name: string }) => b.name)).toEqual(['Food out']);
    expect(response.body.meta).toEqual({ page: 2, limit: 1, total: 2, totalPages: 2 });
  });

  it('filters admin users by role and search', async () => {
    const admin = await prisma.user.create({
      data: { email: `admin-${Date.now()}@example.com`, name: 'Admin', role: 'ADMIN', isVerified: true },
    });
    await prisma.user.create({ data: { email: `ona-${Date.now()}@example.com`, name: 'Ona', isVerified: true } });
    await prisma.user.create({ data: { email: `jonas-${Date.now()}@example.com`, name: 'Jonas', isVerified: true } });
    const token = signAccessToken({ userId: admin.id, email: admin.email, role: 'ADMIN' });

    const byRole = await request(app).get('/admin/users?role=USER').set('Authorization', `Bearer ${token}`);
    const bySearch = await request(app).get('/admin/users?search=ona').set('Authorization', `Bearer ${token}`);
    const badRole = await request(app).get('/admin/users?role=OWNER').set('Authorization', `Bearer ${token}`);

    expect(byRole.status).toBe(200);
    expect(byRole.body.data.map((u: { name: string }) => u.name)).toEqual(['Ona', 'Jonas']);
    expect(bySearch.body.data.map((u: { name: string }) => u.name)).toEqual(['Ona', 'Jonas']);
    expect(badRole.status).toBe(400);
  });

  it('returns an empty page past the end instead of an error', async () => {
    const { accessToken, userId } = await loginTestUser();
    const account = await createAccount(userId);
    await seedTransactions(userId, account.id, 2);

    const response = await request(app)
      .get('/transactions?page=5&limit=10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta).toEqual({ page: 5, limit: 10, total: 2, totalPages: 1 });
  });
});
