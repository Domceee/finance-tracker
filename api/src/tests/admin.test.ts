import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import app from '../app.js';
import { signAccessToken } from '../lib/jwt.js';
import prisma from '../prisma.js';
import { createAccount } from './helpers.js';

async function createUser(role: 'USER' | 'ADMIN' = 'USER') {
  const user = await prisma.user.create({
    data: {
      email: `admin-test-${Date.now()}-${Math.random()}@example.com`,
      name: role === 'ADMIN' ? 'Admin' : 'Member',
      passwordHash: 'not-a-real-hash',
      isVerified: true,
      role,
    },
  });
  const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });

  return { user, accessToken };
}

describe.sequential('Admin API', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /admin/users returns 401 for a guest', async () => {
    const response = await request(app).get('/admin/users');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('GET /admin/users returns 403 for a regular user', async () => {
    const { accessToken } = await createUser('USER');

    const response = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Forbidden' });
  });

  it('GET /admin/users lists all users without password data', async () => {
    const { user: admin, accessToken } = await createUser('ADMIN');
    const { user: member } = await createUser('USER');

    const response = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.map((u: { id: number }) => u.id)).toEqual([admin.id, member.id]);
    expect(response.body[1]).toMatchObject({ email: member.email, role: 'USER', isVerified: true });
    expect(response.body[1]).not.toHaveProperty('passwordHash');
    expect(response.body[1]).not.toHaveProperty('verificationCode');
  });

  it('GET /admin/users/:id returns a user', async () => {
    const { accessToken } = await createUser('ADMIN');
    const { user: member } = await createUser('USER');

    const response = await request(app)
      .get(`/admin/users/${member.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: member.id, email: member.email, role: 'USER' });
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('GET /admin/users/:id returns 404 for a missing user', async () => {
    const { accessToken } = await createUser('ADMIN');

    const response = await request(app)
      .get('/admin/users/999999')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  it('GET /admin/users/:id returns 400 for an invalid id', async () => {
    const { accessToken } = await createUser('ADMIN');

    const response = await request(app)
      .get('/admin/users/not-a-number')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid user ID' });
  });

  it('PATCH /admin/users/:id promotes a user to admin and renames them', async () => {
    const { accessToken } = await createUser('ADMIN');
    const { user: member } = await createUser('USER');

    const response = await request(app)
      .patch(`/admin/users/${member.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: 'ADMIN', name: '  New Name  ' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: member.id, role: 'ADMIN', name: 'New Name' });
  });

  it('PATCH /admin/users/:id rejects an invalid role', async () => {
    const { accessToken } = await createUser('ADMIN');
    const { user: member } = await createUser('USER');

    const response = await request(app)
      .patch(`/admin/users/${member.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: 'SUPERUSER' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid role' });
  });

  it('PATCH /admin/users/:id rejects an empty name', async () => {
    const { accessToken } = await createUser('ADMIN');
    const { user: member } = await createUser('USER');

    const response = await request(app)
      .patch(`/admin/users/${member.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '   ' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Name must be a non-empty string' });
  });

  it('PATCH /admin/users/:id does not let an admin demote themselves', async () => {
    const { user: admin, accessToken } = await createUser('ADMIN');

    const response = await request(app)
      .patch(`/admin/users/${admin.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: 'USER' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'You cannot change your own role' });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).role).toBe('ADMIN');
  });

  it('PATCH /admin/users/:id returns 404 for a missing user', async () => {
    const { accessToken } = await createUser('ADMIN');

    const response = await request(app)
      .patch('/admin/users/999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: 'ADMIN' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  it('PATCH /admin/users/:id returns 403 for a regular user', async () => {
    const { accessToken } = await createUser('USER');
    const { user: other } = await createUser('USER');

    const response = await request(app)
      .patch(`/admin/users/${other.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: 'ADMIN' });

    expect(response.status).toBe(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: other.id } })).role).toBe('USER');
  });

  it('DELETE /admin/users/:id deletes a user and their data', async () => {
    const { accessToken } = await createUser('ADMIN');
    const { user: member } = await createUser('USER');
    const account = await createAccount(member.id);

    const response = await request(app)
      .delete(`/admin/users/${member.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(204);
    expect(await prisma.user.findUnique({ where: { id: member.id } })).toBeNull();
    expect(await prisma.account.findUnique({ where: { id: account.id } })).toBeNull();
  });

  it('DELETE /admin/users/:id does not let an admin delete themselves', async () => {
    const { user: admin, accessToken } = await createUser('ADMIN');

    const response = await request(app)
      .delete(`/admin/users/${admin.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'You cannot delete your own account here' });
    expect(await prisma.user.findUnique({ where: { id: admin.id } })).not.toBeNull();
  });

  it('DELETE /admin/users/:id returns 404 for a missing user', async () => {
    const { accessToken } = await createUser('ADMIN');

    const response = await request(app)
      .delete('/admin/users/999999')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });
});
