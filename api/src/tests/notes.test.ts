import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import app from '../app.js';
import { signAccessToken } from '../lib/jwt.js';
import prisma from '../prisma.js';
import { createAccount } from './helpers.js';

async function createAuthedUser() {
  const user = await prisma.user.create({
    data: {
      email: `notes-${Date.now()}-${Math.random()}@example.com`,
      isVerified: true,
    },
  });
  const account = await createAccount(user.id);
  const accessToken = signAccessToken({ userId: user.id, email: user.email });

  return { user, account, accessToken };
}

async function createTransaction(userId: number, accountId: number) {
  return prisma.transaction.create({
    data: {
      userId,
      accountId,
      title: 'Groceries',
      amount: 25,
      type: 'expense',
      category: 'FOOD',
      date: new Date('2026-04-02T12:00:00.000Z'),
    },
  });
}

async function createNote(transactionId: number, content = 'Bought for the party') {
  return prisma.note.create({
    data: { transactionId, content },
  });
}

describe.sequential('Notes API', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /transactions/:id/notes returns 401 without auth', async () => {
    const response = await request(app).get('/transactions/1/notes');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('POST /transactions/:id/notes creates a note', async () => {
    const { user, account, accessToken } = await createAuthedUser();
    const transaction = await createTransaction(user.id, account.id);

    const response = await request(app)
      .post(`/transactions/${transaction.id}/notes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: '  Split with Tom  ' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      content: 'Split with Tom',
      transactionId: transaction.id,
    });
    expect(response.body.id).toEqual(expect.any(Number));
  });

  it('POST /transactions/:id/notes rejects empty content', async () => {
    const { user, account, accessToken } = await createAuthedUser();
    const transaction = await createTransaction(user.id, account.id);

    const response = await request(app)
      .post(`/transactions/${transaction.id}/notes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: '   ' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Content is required' });
  });

  it('POST /transactions/:id/notes returns 404 for another user\'s transaction', async () => {
    const { accessToken } = await createAuthedUser();
    const other = await createAuthedUser();
    const otherTransaction = await createTransaction(other.user.id, other.account.id);

    const response = await request(app)
      .post(`/transactions/${otherTransaction.id}/notes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'Sneaky' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Transaction not found' });
  });

  it('GET /transactions/:id/notes lists the transaction notes oldest first', async () => {
    const { user, account, accessToken } = await createAuthedUser();
    const transaction = await createTransaction(user.id, account.id);
    const otherTransaction = await createTransaction(user.id, account.id);

    await createNote(transaction.id, 'First');
    await createNote(transaction.id, 'Second');
    await createNote(otherTransaction.id, 'Elsewhere');

    const response = await request(app)
      .get(`/transactions/${transaction.id}/notes`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.map((n: { content: string }) => n.content)).toEqual(['First', 'Second']);
  });

  it('GET /transactions/:id/notes returns 404 for another user\'s transaction', async () => {
    const { accessToken } = await createAuthedUser();
    const other = await createAuthedUser();
    const otherTransaction = await createTransaction(other.user.id, other.account.id);

    const response = await request(app)
      .get(`/transactions/${otherTransaction.id}/notes`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Transaction not found' });
  });

  it('GET /notes/:id returns an own note', async () => {
    const { user, account, accessToken } = await createAuthedUser();
    const transaction = await createTransaction(user.id, account.id);
    const note = await createNote(transaction.id);

    const response = await request(app)
      .get(`/notes/${note.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: note.id, content: note.content });
  });

  it('GET /notes/:id returns 404 for another user\'s note', async () => {
    const { accessToken } = await createAuthedUser();
    const other = await createAuthedUser();
    const otherTransaction = await createTransaction(other.user.id, other.account.id);
    const otherNote = await createNote(otherTransaction.id);

    const response = await request(app)
      .get(`/notes/${otherNote.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Note not found' });
  });

  it('GET /notes/:id returns 400 for an invalid id', async () => {
    const { accessToken } = await createAuthedUser();

    const response = await request(app)
      .get('/notes/not-a-number')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid note ID' });
  });

  it('PATCH /notes/:id updates the content', async () => {
    const { user, account, accessToken } = await createAuthedUser();
    const transaction = await createTransaction(user.id, account.id);
    const note = await createNote(transaction.id);

    const response = await request(app)
      .patch(`/notes/${note.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'Updated' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: note.id, content: 'Updated' });
  });

  it('PATCH /notes/:id rejects empty content', async () => {
    const { user, account, accessToken } = await createAuthedUser();
    const transaction = await createTransaction(user.id, account.id);
    const note = await createNote(transaction.id);

    const response = await request(app)
      .patch(`/notes/${note.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Content is required' });
  });

  it('PATCH /notes/:id returns 404 for another user\'s note', async () => {
    const { accessToken } = await createAuthedUser();
    const other = await createAuthedUser();
    const otherTransaction = await createTransaction(other.user.id, other.account.id);
    const otherNote = await createNote(otherTransaction.id);

    const response = await request(app)
      .patch(`/notes/${otherNote.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'Hijacked' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Note not found' });
  });

  it('DELETE /notes/:id deletes an own note', async () => {
    const { user, account, accessToken } = await createAuthedUser();
    const transaction = await createTransaction(user.id, account.id);
    const note = await createNote(transaction.id);

    const response = await request(app)
      .delete(`/notes/${note.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(204);
    expect(await prisma.note.findUnique({ where: { id: note.id } })).toBeNull();
  });

  it('DELETE /notes/:id returns 404 for another user\'s note', async () => {
    const { accessToken } = await createAuthedUser();
    const other = await createAuthedUser();
    const otherTransaction = await createTransaction(other.user.id, other.account.id);
    const otherNote = await createNote(otherTransaction.id);

    const response = await request(app)
      .delete(`/notes/${otherNote.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(await prisma.note.findUnique({ where: { id: otherNote.id } })).not.toBeNull();
  });

  it('deleting a transaction deletes its notes', async () => {
    const { user, account, accessToken } = await createAuthedUser();
    const transaction = await createTransaction(user.id, account.id);
    const note = await createNote(transaction.id);

    await request(app)
      .delete(`/transactions/${transaction.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(await prisma.note.findUnique({ where: { id: note.id } })).toBeNull();
  });
});
