import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import app from '../app.js';
import prisma from '../prisma.js';
import { createAccount } from './helpers.js';

async function loginTestUser() {
  const email = `nested-${Date.now()}-${Math.random()}@example.com`;
  const response = await request(app).post('/auth/dev-login').send({ email, name: 'Nested User' });

  return {
    accessToken: response.body.accessToken as string,
    userId: response.body.user.id as number,
  };
}

async function createTransaction(userId: number, accountId: number, title = 'Dinner') {
  return prisma.transaction.create({
    data: {
      title,
      amount: 42,
      type: 'expense',
      category: 'EATOUT',
      date: new Date('2026-04-10T19:00:00.000Z'),
      userId,
      accountId,
    },
  });
}

async function setup() {
  const { accessToken, userId } = await loginTestUser();
  const account = await createAccount(userId, 'Card');
  const transaction = await createTransaction(userId, account.id);
  const note = await prisma.note.create({ data: { transactionId: transaction.id, content: 'Split with Tom' } });

  return { accessToken, userId, account, transaction, note };
}

describe.sequential('Nested account → transaction → note routes', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('gets a transaction through its account', async () => {
    const { accessToken, account, transaction } = await setup();

    const response = await request(app)
      .get(`/accounts/${account.id}/transactions/${transaction.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: transaction.id, title: 'Dinner', accountId: account.id });
    expect(response.body._links.notes.href).toBe(`/transactions/${transaction.id}/notes`);
  });

  it('lists notes across all three levels', async () => {
    const { accessToken, account, transaction } = await setup();

    const response = await request(app)
      .get(`/accounts/${account.id}/transactions/${transaction.id}/notes`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.map((n: { content: string }) => n.content)).toEqual(['Split with Tom']);
    expect(response.body.meta.total).toBe(1);
    expect(response.body._links.self.href).toBe(
      `/accounts/${account.id}/transactions/${transaction.id}/notes?page=1&limit=20`,
    );
  });

  it('gets a single note across all three levels', async () => {
    const { accessToken, account, transaction, note } = await setup();

    const response = await request(app)
      .get(`/accounts/${account.id}/transactions/${transaction.id}/notes/${note.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: note.id, content: 'Split with Tom', transactionId: transaction.id });
  });

  it('creates a note across all three levels', async () => {
    const { accessToken, account, transaction } = await setup();

    const response = await request(app)
      .post(`/accounts/${account.id}/transactions/${transaction.id}/notes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: '  Paid back  ' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ content: 'Paid back', transactionId: transaction.id });
  });

  it('rejects an empty note', async () => {
    const { accessToken, account, transaction } = await setup();

    const response = await request(app)
      .post(`/accounts/${account.id}/transactions/${transaction.id}/notes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: ' ' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Content is required' });
  });

  it('returns 404 when the transaction belongs to a different account of the same user', async () => {
    const { accessToken, userId, transaction } = await setup();
    const otherAccount = await createAccount(userId, 'Cash');

    const response = await request(app)
      .get(`/accounts/${otherAccount.id}/transactions/${transaction.id}/notes`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Transaction not found' });
  });

  it('returns 404 when the note belongs to a different transaction', async () => {
    const { accessToken, userId, account, transaction } = await setup();
    const otherTransaction = await createTransaction(userId, account.id, 'Taxi');
    const otherNote = await prisma.note.create({ data: { transactionId: otherTransaction.id, content: 'Late night' } });

    const response = await request(app)
      .get(`/accounts/${account.id}/transactions/${transaction.id}/notes/${otherNote.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Note not found' });
  });

  it("returns 404 for another user's account", async () => {
    const { account, transaction } = await setup();
    const stranger = await loginTestUser();

    const response = await request(app)
      .get(`/accounts/${account.id}/transactions/${transaction.id}/notes`)
      .set('Authorization', `Bearer ${stranger.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Account not found' });
  });

  it('returns 400 for a bad account ID', async () => {
    const { accessToken } = await setup();

    const response = await request(app)
      .get('/accounts/abc/transactions/1/notes/1')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid account ID' });
  });

  it('returns 400 for a bad transaction ID', async () => {
    const { accessToken, account } = await setup();

    const response = await request(app)
      .get(`/accounts/${account.id}/transactions/1.5/notes/1`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid transaction ID' });
  });

  it('returns 400 for a bad note ID', async () => {
    const { accessToken, account, transaction } = await setup();

    const response = await request(app)
      .get(`/accounts/${account.id}/transactions/${transaction.id}/notes/xyz`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid note ID' });
  });

  it('requires authentication', async () => {
    const { account, transaction } = await setup();

    const response = await request(app).get(`/accounts/${account.id}/transactions/${transaction.id}/notes`);

    expect(response.status).toBe(401);
  });
});
