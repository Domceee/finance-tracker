import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import app from '../app.js';
import prisma from '../prisma.js';

async function createTestUser() {
  return prisma.user.create({
    data: {
      email: `overview-${Date.now()}-${Math.random()}@example.com`,
      googleId: `dev-overview-${Date.now()}-${Math.random()}`,
      name: 'Overview User',
    },
  });
}

async function loginTestUser() {
  const email = `overview-login-${Date.now()}-${Math.random()}@example.com`;

  const response = await request(app).post('/auth/dev-login').send({
    email,
    name: 'Overview User',
  });

  return {
    accessToken: response.body.accessToken as string,
    user: response.body.user as { id: number },
  };
}

describe.sequential('Overview API', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.monthlyCategorySummary.deleteMany();
    await prisma.monthlySummary.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.monthlyCategorySummary.deleteMany();
    await prisma.monthlySummary.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns 401 when requesting overview without auth', async () => {
    const response = await request(app).get('/overview');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 for an invalid month', async () => {
    const { accessToken } = await loginTestUser();

    const response = await request(app)
      .get('/overview?year=2026&month=13')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid year or month' });
  });

  it('returns monthly totals for the selected month only', async () => {
    const { accessToken, user } = await loginTestUser();
    const otherUser = await createTestUser();

    await prisma.transaction.createMany({
      data: [
        {
          title: 'Salary',
          amount: 1000,
          type: 'income',
          category: 'SALARY',
          date: new Date('2026-04-05T12:00:00.000Z'),
          userId: user.id,
        },
        {
          title: 'Groceries',
          amount: 200,
          type: 'expense',
          category: 'FOOD',
          date: new Date('2026-04-06T12:00:00.000Z'),
          userId: user.id,
        },
        {
          title: 'Old month',
          amount: 999,
          type: 'expense',
          category: 'OTHER',
          date: new Date('2026-03-06T12:00:00.000Z'),
          userId: user.id,
        },
        {
          title: 'Other user',
          amount: 500,
          type: 'expense',
          category: 'SHOPPING',
          date: new Date('2026-04-10T12:00:00.000Z'),
          userId: otherUser.id,
        },
      ],
    });

    const response = await request(app)
      .get('/overview?year=2026&month=4')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      year: 2026,
      month: 4,
      incomeTotal: 1000,
      spentTotal: 200,
      leftTotal: 800,
    });
  });

  it('returns the expense breakdown grouped by category', async () => {
    const { accessToken, user } = await loginTestUser();

    await prisma.transaction.createMany({
      data: [
        {
          title: 'Salary',
          amount: 1000,
          type: 'income',
          category: 'SALARY',
          date: new Date('2026-04-05T12:00:00.000Z'),
          userId: user.id,
        },
        {
          title: 'Groceries',
          amount: 150,
          type: 'expense',
          category: 'FOOD',
          date: new Date('2026-04-06T12:00:00.000Z'),
          userId: user.id,
        },
        {
          title: 'Dinner',
          amount: 50,
          type: 'expense',
          category: 'EATOUT',
          date: new Date('2026-04-07T12:00:00.000Z'),
          userId: user.id,
        },
      ],
    });

    const response = await request(app)
      .get('/overview?year=2026&month=4')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.categoryBreakdown).toEqual([
      { category: 'FOOD', amount: 150, percentage: 75 },
      { category: 'EATOUT', amount: 50, percentage: 25 },
    ]);
  });
});
