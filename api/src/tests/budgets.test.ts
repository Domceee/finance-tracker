import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import app from '../app.js';
import { signAccessToken } from '../lib/jwt.js';
import { hashPassword } from '../lib/password.js';
import prisma from '../prisma.js';
import { createAccount } from './helpers.js';

async function createVerifiedUser(email?: string) {
  return prisma.user.create({
    data: {
      email: email ?? `budget-user-${Date.now()}-${Math.random()}@example.com`,
      passwordHash: hashPassword('password123'),
      isVerified: true,
    },
  });
}

describe.sequential('Budgets API', () => {
  beforeEach(async () => {
    await prisma.budget.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await prisma.budget.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /budgets returns 401 without auth', async () => {
    const response = await request(app).get('/budgets');
    expect(response.status).toBe(401);
  });

  it('GET /budgets returns empty array when no budgets', async () => {
    const user = await createVerifiedUser('budgets-empty@example.com');
    const token = signAccessToken({ userId: user.id, email: user.email });

    const response = await request(app).get('/budgets').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('GET /budgets returns budgets with current-month spending', async () => {
    const user = await createVerifiedUser('budgets-spending@example.com');
    const token = signAccessToken({ userId: user.id, email: user.email });

    await prisma.budget.create({
      data: { userId: user.id, name: 'Food Budget', limitAmount: 200, categories: 'FOOD' },
    });

    const account = await createAccount(user.id);
    const now = new Date();
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        title: 'Lunch',
        amount: 15,
        type: 'expense',
        category: 'FOOD',
        date: new Date(now.getFullYear(), now.getMonth(), 10),
      },
    });

    const response = await request(app).get('/budgets').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Food Budget');
    expect(response.body[0].limitAmount).toBe(200);
    expect(response.body[0].spent).toBe(15);
    expect(response.body[0].categories).toEqual(['FOOD']);
  });

  it('GET /budgets excludes transactions from other months', async () => {
    const user = await createVerifiedUser('budgets-other-month@example.com');
    const token = signAccessToken({ userId: user.id, email: user.email });

    await prisma.budget.create({
      data: { userId: user.id, name: 'Food Budget', limitAmount: 200, categories: 'FOOD' },
    });

    const account = await createAccount(user.id);
    const now = new Date();
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        title: 'Old Lunch',
        amount: 50,
        type: 'expense',
        category: 'FOOD',
        date: new Date(now.getFullYear(), now.getMonth() - 1, 10),
      },
    });

    const response = await request(app).get('/budgets').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body[0].spent).toBe(0);
  });

  it('GET /budgets uses UTC month boundaries regardless of server timezone', async () => {
    vi.stubEnv('TZ', 'Europe/Vilnius');
    const user = await createVerifiedUser('budgets-utc@example.com');
    const token = signAccessToken({ userId: user.id, email: user.email });
    const account = await createAccount(user.id);

    await prisma.budget.create({
      data: { userId: user.id, name: 'Food Budget', limitAmount: 200, categories: 'FOOD' },
    });

    const now = new Date();
    const lastMomentOfPreviousUtcMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 1,
    );

    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        title: 'Late night snack',
        amount: 40,
        type: 'expense',
        category: 'FOOD',
        date: lastMomentOfPreviousUtcMonth,
      },
    });

    const response = await request(app).get('/budgets').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body[0].spent).toBe(0);
  });

  it('GET /budgets/:id returns an own budget with current-month spending', async () => {
    const user = await createVerifiedUser('budget-get@example.com');
    const token = signAccessToken({ userId: user.id, email: user.email });
    const account = await createAccount(user.id);

    const budget = await prisma.budget.create({
      data: { userId: user.id, name: 'Fun', limitAmount: 80, categories: 'BAR,ENTERTAINMENT' },
    });

    const now = new Date();
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: account.id,
        title: 'Cinema',
        amount: 12.5,
        type: 'expense',
        category: 'ENTERTAINMENT',
        date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10)),
      },
    });

    const response = await request(app)
      .get(`/budgets/${budget.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: budget.id,
      name: 'Fun',
      limitAmount: 80,
      categories: ['BAR', 'ENTERTAINMENT'],
      spent: 12.5,
    });
  });

  it('GET /budgets/:id returns 404 for another user\'s budget', async () => {
    const owner = await createVerifiedUser('budget-get-owner@example.com');
    const other = await createVerifiedUser('budget-get-other@example.com');
    const token = signAccessToken({ userId: other.id, email: other.email });

    const budget = await prisma.budget.create({
      data: { userId: owner.id, name: 'Mine', limitAmount: 100, categories: 'FOOD' },
    });

    const response = await request(app)
      .get(`/budgets/${budget.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Budget not found' });
  });

  it('GET /budgets/:id returns 400 for an invalid id', async () => {
    const user = await createVerifiedUser('budget-get-invalid@example.com');
    const token = signAccessToken({ userId: user.id, email: user.email });

    const response = await request(app)
      .get('/budgets/not-a-number')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid budget id' });
  });

  it('POST /budgets returns 401 without auth', async () => {
    const response = await request(app)
      .post('/budgets')
      .send({ name: 'Test', limitAmount: 100, categories: ['FOOD'] });

    expect(response.status).toBe(401);
  });

  it('POST /budgets rejects missing name', async () => {
    const user = await createVerifiedUser('budgets-no-name@example.com');
    const token = signAccessToken({ userId: user.id, email: user.email });

    const response = await request(app)
      .post('/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ limitAmount: 100, categories: ['FOOD'] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Name is required' });
  });

  it('POST /budgets rejects invalid limitAmount', async () => {
    const user = await createVerifiedUser('budgets-bad-limit@example.com');
    const token = signAccessToken({ userId: user.id, email: user.email });

    const response = await request(app)
      .post('/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', limitAmount: -50, categories: ['FOOD'] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Limit must be a positive number' });
  });

  it('POST /budgets rejects empty categories', async () => {
    const user = await createVerifiedUser('budgets-no-cats@example.com');
    const token = signAccessToken({ userId: user.id, email: user.email });

    const response = await request(app)
      .post('/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', limitAmount: 100, categories: [] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'At least one category is required' });
  });

  it('POST /budgets rejects invalid category', async () => {
    const user = await createVerifiedUser('budgets-bad-cat@example.com');
    const token = signAccessToken({ userId: user.id, email: user.email });

    const response = await request(app)
      .post('/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', limitAmount: 100, categories: ['FAKE'] });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid category');
  });

  it('POST /budgets creates and returns a budget', async () => {
    const user = await createVerifiedUser('budgets-create@example.com');
    const token = signAccessToken({ userId: user.id, email: user.email });

    const response = await request(app)
      .post('/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Eating Out', limitAmount: 150, categories: ['FOOD', 'BAR', 'EATOUT'] });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Eating Out');
    expect(response.body.limitAmount).toBe(150);
    expect(response.body.categories).toEqual(['FOOD', 'BAR', 'EATOUT']);
    expect(response.body.spent).toBe(0);
  });

  it('PATCH /budgets/:id returns 404 for another user\'s budget', async () => {
    const owner = await createVerifiedUser('budget-owner@example.com');
    const other = await createVerifiedUser('budget-other@example.com');
    const token = signAccessToken({ userId: other.id, email: other.email });

    const budget = await prisma.budget.create({
      data: { userId: owner.id, name: 'Mine', limitAmount: 100, categories: 'FOOD' },
    });

    const response = await request(app)
      .patch(`/budgets/${budget.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hijacked' });

    expect(response.status).toBe(404);
  });

  it('PATCH /budgets/:id updates name and returns updated budget', async () => {
    const user = await createVerifiedUser('budget-patch@example.com');
    const token = signAccessToken({ userId: user.id, email: user.email });

    const budget = await prisma.budget.create({
      data: { userId: user.id, name: 'Old Name', limitAmount: 100, categories: 'FOOD' },
    });

    const response = await request(app)
      .patch(`/budgets/${budget.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('New Name');
    expect(response.body.limitAmount).toBe(100);
  });

  it('DELETE /budgets/:id returns 404 for another user\'s budget', async () => {
    const owner = await createVerifiedUser('budget-del-owner@example.com');
    const other = await createVerifiedUser('budget-del-other@example.com');
    const token = signAccessToken({ userId: other.id, email: other.email });

    const budget = await prisma.budget.create({
      data: { userId: owner.id, name: 'Mine', limitAmount: 100, categories: 'FOOD' },
    });

    const response = await request(app)
      .delete(`/budgets/${budget.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });

  it('DELETE /budgets/:id deletes the budget and returns 204', async () => {
    const user = await createVerifiedUser('budget-delete@example.com');
    const token = signAccessToken({ userId: user.id, email: user.email });

    const budget = await prisma.budget.create({
      data: { userId: user.id, name: 'To Delete', limitAmount: 100, categories: 'FOOD' },
    });

    const response = await request(app)
      .delete(`/budgets/${budget.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(204);

    const deleted = await prisma.budget.findUnique({ where: { id: budget.id } });
    expect(deleted).toBeNull();
  });
});
