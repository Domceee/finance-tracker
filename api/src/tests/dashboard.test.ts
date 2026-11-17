import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import app from '../app.js';
import prisma from '../prisma.js';
import { signAccessToken } from '../lib/jwt.js';

async function loginTestUser() {
  const email = `dashboard-${Date.now()}-${Math.random()}@example.com`;
  const response = await request(app).post('/auth/dev-login').send({ email, name: 'Dash User' });

  return {
    accessToken: response.body.accessToken as string,
    userId: response.body.user.id as number,
    email,
  };
}

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function thisMonth(day: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 12));
}

describe.sequential('Dashboard API', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('combines user, accounts, current month, recent transactions and budgets', async () => {
    const { accessToken, userId, email } = await loginTestUser();
    const main = await prisma.account.findFirstOrThrow({ where: { userId } });
    const cash = await prisma.account.create({ data: { userId, name: 'Cash', type: 'CASH' } });

    await prisma.transaction.createMany({
      data: [
        { title: 'Salary', amount: 1000, type: 'income', category: 'SALARY', date: thisMonth(1), userId, accountId: main.id },
        { title: 'Groceries', amount: 80, type: 'expense', category: 'FOOD', date: thisMonth(2), userId, accountId: main.id },
        { title: 'Bus', amount: 20, type: 'expense', category: 'TRANSPORT', date: thisMonth(2), userId, accountId: cash.id },
        { title: 'Old rent', amount: 500, type: 'expense', category: 'RENT', date: daysAgo(400), userId, accountId: main.id },
      ],
    });

    await prisma.budget.create({ data: { userId, name: 'Food', limitAmount: 200, categories: 'FOOD' } });

    const response = await request(app).get('/dashboard').set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ id: userId, email, name: 'Dash User' });
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body.totalBalance).toBe(400);
    expect(response.body.accounts.map((a: { name: string; balance: number }) => [a.name, a.balance])).toEqual([
      ['Main', 420],
      ['Cash', -20],
    ]);
    expect(response.body.currentMonth).toMatchObject({ incomeTotal: 1000, spentTotal: 100, leftTotal: 900 });
    expect(response.body.recentTransactions).toHaveLength(4);
    expect(response.body.recentTransactions[3].title).toBe('Old rent');
    expect(response.body.recentTransactions[0]._links.self.href).toMatch(/^\/transactions\/\d+$/);
    expect(response.body.budgets).toEqual([
      expect.objectContaining({ name: 'Food', limitAmount: 200, spent: 80, categories: ['FOOD'] }),
    ]);
    expect(response.body._links.self).toEqual({ href: '/dashboard', method: 'GET' });
  });

  it('limits recent transactions to five', async () => {
    const { accessToken, userId } = await loginTestUser();
    const main = await prisma.account.findFirstOrThrow({ where: { userId } });

    for (let day = 1; day <= 7; day += 1) {
      await prisma.transaction.create({
        data: { title: `Coffee ${day}`, amount: 3, type: 'expense', category: 'FOOD', date: daysAgo(day), userId, accountId: main.id },
      });
    }

    const response = await request(app).get('/dashboard').set('Authorization', `Bearer ${accessToken}`);

    expect(response.body.recentTransactions.map((t: { title: string }) => t.title)).toEqual([
      'Coffee 1', 'Coffee 2', 'Coffee 3', 'Coffee 4', 'Coffee 5',
    ]);
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/dashboard');

    expect(response.status).toBe(401);
  });

  it('returns 404 when the user no longer exists', async () => {
    const token = signAccessToken({ userId: 999999, email: 'gone@example.com', role: 'USER' });

    const response = await request(app).get('/dashboard').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });
});
