import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import app from '../app.js';
import { signAccessToken } from '../lib/jwt.js';
import prisma from '../prisma.js';
import { createAccount } from './helpers.js';

async function createTestUser() {
  return prisma.user.create({
    data: {
      email: `accounts-${Date.now()}-${Math.random()}@example.com`,
      name: 'Accounts User',
      isVerified: true,
    },
  });
}

async function createAuthedUser() {
  const user = await createTestUser();
  const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });

  return { user, accessToken };
}

async function createTransaction(
  userId: number,
  accountId: number,
  overrides: { title?: string; amount?: number; type?: string; date?: Date } = {},
) {
  return prisma.transaction.create({
    data: {
      userId,
      accountId,
      title: overrides.title ?? 'Transaction',
      amount: overrides.amount ?? 10,
      type: overrides.type ?? 'expense',
      category: overrides.type === 'income' ? 'SALARY' : 'FOOD',
      date: overrides.date ?? new Date('2026-04-02T12:00:00.000Z'),
    },
  });
}

describe.sequential('Accounts API', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /accounts returns 401 without auth', async () => {
    const response = await request(app).get('/accounts');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('creates a default Main account on dev-login for a new user', async () => {
    const loginResponse = await request(app).post('/auth/dev-login').send({
      email: `accounts-dev-${Date.now()}@example.com`,
    });

    const response = await request(app)
      .get('/accounts')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ name: 'Main', type: 'OTHER', balance: 0 });
  });

  it('creates a default Main account on register for a new user', async () => {
    const email = `accounts-register-${Date.now()}@example.com`;

    await request(app).post('/auth/register').send({ email, password: 'password123' });

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const accounts = await prisma.account.findMany({ where: { userId: user.id } });

    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.name).toBe('Main');
  });

  it('GET /accounts returns only own accounts with computed balance', async () => {
    const { user, accessToken } = await createAuthedUser();
    const other = await createTestUser();
    const account = await createAccount(user.id, 'Card');
    const otherAccount = await createAccount(other.id, 'Other card');

    await createTransaction(user.id, account.id, { amount: 100, type: 'income' });
    await createTransaction(user.id, account.id, { amount: 30.25, type: 'expense' });
    await createTransaction(other.id, otherAccount.id, { amount: 999, type: 'income' });

    const response = await request(app)
      .get('/accounts')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ id: account.id, name: 'Card', balance: 69.75 });
  });

  it('POST /accounts creates an account', async () => {
    const { user, accessToken } = await createAuthedUser();

    const response = await request(app)
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '  Savings  ', type: 'SAVINGS' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: 'Savings',
      type: 'SAVINGS',
      userId: user.id,
      balance: 0,
    });
    expect(response.body.id).toEqual(expect.any(Number));
  });

  it('POST /accounts defaults type to OTHER', async () => {
    const { accessToken } = await createAuthedUser();

    const response = await request(app)
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Wallet' });

    expect(response.status).toBe(201);
    expect(response.body.type).toBe('OTHER');
  });

  it('POST /accounts rejects a missing name', async () => {
    const { accessToken } = await createAuthedUser();

    const response = await request(app)
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '   ' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Name is required' });
  });

  it('POST /accounts rejects an invalid type', async () => {
    const { accessToken } = await createAuthedUser();

    const response = await request(app)
      .post('/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Wallet', type: 'CRYPTO' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid account type' });
  });

  it('GET /accounts/:id returns an own account with balance', async () => {
    const { user, accessToken } = await createAuthedUser();
    const account = await createAccount(user.id, 'Cash');
    await createTransaction(user.id, account.id, { amount: 20, type: 'income' });

    const response = await request(app)
      .get(`/accounts/${account.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: account.id, name: 'Cash', balance: 20 });
  });

  it('GET /accounts/:id returns 404 for another user\'s account', async () => {
    const { accessToken } = await createAuthedUser();
    const other = await createTestUser();
    const otherAccount = await createAccount(other.id);

    const response = await request(app)
      .get(`/accounts/${otherAccount.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Account not found' });
  });

  it('GET /accounts/:id returns 400 for an invalid id', async () => {
    const { accessToken } = await createAuthedUser();

    const response = await request(app)
      .get('/accounts/not-a-number')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid account ID' });
  });

  it('PATCH /accounts/:id updates name and type', async () => {
    const { user, accessToken } = await createAuthedUser();
    const account = await createAccount(user.id, 'Old');

    const response = await request(app)
      .patch(`/accounts/${account.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'New', type: 'CARD' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: account.id, name: 'New', type: 'CARD', balance: 0 });
  });

  it('PATCH /accounts/:id rejects an empty name', async () => {
    const { user, accessToken } = await createAuthedUser();
    const account = await createAccount(user.id);

    const response = await request(app)
      .patch(`/accounts/${account.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Name is required' });
  });

  it('PATCH /accounts/:id returns 404 for another user\'s account', async () => {
    const { accessToken } = await createAuthedUser();
    const other = await createTestUser();
    const otherAccount = await createAccount(other.id);

    const response = await request(app)
      .patch(`/accounts/${otherAccount.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Hijacked' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Account not found' });
  });

  it('DELETE /accounts/:id deletes the account and its transactions', async () => {
    const { user, accessToken } = await createAuthedUser();
    const account = await createAccount(user.id);
    const transaction = await createTransaction(user.id, account.id);

    const response = await request(app)
      .delete(`/accounts/${account.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(204);
    expect(await prisma.account.findUnique({ where: { id: account.id } })).toBeNull();
    expect(await prisma.transaction.findUnique({ where: { id: transaction.id } })).toBeNull();
  });

  it('DELETE /accounts/:id returns 404 for another user\'s account', async () => {
    const { accessToken } = await createAuthedUser();
    const other = await createTestUser();
    const otherAccount = await createAccount(other.id);

    const response = await request(app)
      .delete(`/accounts/${otherAccount.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(await prisma.account.findUnique({ where: { id: otherAccount.id } })).not.toBeNull();
  });

  it('GET /accounts/:id/transactions returns only that account\'s transactions, newest first', async () => {
    const { user, accessToken } = await createAuthedUser();
    const account = await createAccount(user.id, 'Card');
    const otherOwnAccount = await createAccount(user.id, 'Cash');

    await createTransaction(user.id, account.id, {
      title: 'Older',
      date: new Date('2026-04-01T10:00:00.000Z'),
    });
    await createTransaction(user.id, account.id, {
      title: 'Newer',
      date: new Date('2026-04-03T10:00:00.000Z'),
    });
    await createTransaction(user.id, otherOwnAccount.id, { title: 'Cash purchase' });

    const response = await request(app)
      .get(`/accounts/${account.id}/transactions`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.map((t: { title: string }) => t.title)).toEqual(['Newer', 'Older']);
  });

  it('GET /accounts/:id/transactions returns 404 for another user\'s account', async () => {
    const { accessToken } = await createAuthedUser();
    const other = await createTestUser();
    const otherAccount = await createAccount(other.id);

    const response = await request(app)
      .get(`/accounts/${otherAccount.id}/transactions`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Account not found' });
  });
});
