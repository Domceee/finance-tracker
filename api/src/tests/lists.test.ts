import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import app from '../app.js';
import prisma from '../prisma.js';
import { createAccount } from './helpers.js';

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
