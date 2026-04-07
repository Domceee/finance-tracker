import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/mail.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import app from '../app.js';
import { signAccessToken, signRefreshToken } from '../lib/jwt.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../lib/mail.js';
import { hashPassword } from '../lib/password.js';
import prisma from '../prisma.js';

const mockedSendVerificationEmail = vi.mocked(sendVerificationEmail);
const mockedSendPasswordResetEmail = vi.mocked(sendPasswordResetEmail);

async function createVerifiedUser(email?: string) {
  const uniqueEmail = email ?? `verified-${Date.now()}-${Math.random()}@example.com`;

  return prisma.user.create({
    data: {
      email: uniqueEmail,
      passwordHash: hashPassword('password123'),
      name: 'Verified User',
      isVerified: true,
    },
  });
}

async function createUnverifiedUser(overrides?: {
  email?: string;
  verificationCode?: string | null;
  verificationExpiresAt?: Date | null;
}) {
  return prisma.user.create({
    data: {
      email: overrides?.email ?? `pending-${Date.now()}-${Math.random()}@example.com`,
      passwordHash: hashPassword('password123'),
      name: 'Pending User',
      isVerified: false,
      verificationCode:
        overrides && 'verificationCode' in overrides ? overrides.verificationCode : '123456',
      verificationExpiresAt:
        overrides && 'verificationExpiresAt' in overrides
          ? overrides.verificationExpiresAt
          : new Date(Date.now() + 10 * 60 * 1000),
    },
  });
}

async function createSession(userId: number, refreshToken?: string, expiresAt?: Date) {
  const token =
    refreshToken ??
    signRefreshToken({
      userId,
      email: `session-${Date.now()}-${Math.random()}@example.com`,
    });

  return prisma.session.create({
    data: {
      userId,
      refreshToken: token,
      expiresAt: expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

describe.sequential('Auth API', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await prisma.session.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('POST /auth/register rejects missing email', async () => {
    const response = await request(app).post('/auth/register').send({
      password: 'password123',
      name: 'Test User',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Email is required' });
  });

  it('POST /auth/register rejects invalid email', async () => {
    const response = await request(app).post('/auth/register').send({
      email: 'invalid-email',
      password: 'password123',
      name: 'Test User',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Please enter a valid email address' });
  });

  it('POST /auth/register rejects short password', async () => {
    const response = await request(app).post('/auth/register').send({
      email: 'test@example.com',
      password: '123',
      name: 'Test User',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Password must be at least 6 characters long' });
  });

  it('POST /auth/register rejects an existing verified user', async () => {
    await createVerifiedUser('existing@example.com');

    const response = await request(app).post('/auth/register').send({
      email: 'existing@example.com',
      password: 'password123',
      name: 'Test User',
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'User already exists' });
  });

  it('POST /auth/register returns a success message for a new user', async () => {
    const response = await request(app).post('/auth/register').send({
      email: 'new-user@example.com',
      password: 'password123',
      name: 'Test User',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Verification code sent' });
  });

  it('POST /auth/register stores verification data for a new user', async () => {
    await request(app).post('/auth/register').send({
      email: 'new-user@example.com',
      password: 'password123',
      name: 'Test User',
    });

    const user = await prisma.user.findUnique({
      where: { email: 'new-user@example.com' },
    });

    expect(user).toMatchObject({
      email: 'new-user@example.com',
      isVerified: false,
      name: 'Test User',
    });
    expect(user?.verificationCode).toEqual(expect.any(String));
    expect(user?.verificationExpiresAt).toBeInstanceOf(Date);
  });

  it('POST /auth/register updates an existing unverified user', async () => {
    const user = await createUnverifiedUser({
      email: 'pending@example.com',
      verificationCode: '111111',
    });

    await request(app).post('/auth/register').send({
      email: 'pending@example.com',
      password: 'newpassword123',
      name: 'Updated User',
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(updatedUser?.name).toBe('Updated User');
    expect(updatedUser?.verificationCode).not.toBe('111111');
  });

  it('POST /auth/register sends a verification email', async () => {
    await request(app).post('/auth/register').send({
      email: 'mail-check@example.com',
      password: 'password123',
      name: 'Mail Check',
    });

    expect(mockedSendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendVerificationEmail).toHaveBeenCalledWith(
      'mail-check@example.com',
      expect.any(String),
    );
  });

  it('POST /auth/verify-email rejects missing email', async () => {
    const response = await request(app).post('/auth/verify-email').send({
      code: '123456',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Email is required' });
  });

  it('POST /auth/verify-email rejects missing code', async () => {
    const response = await request(app).post('/auth/verify-email').send({
      email: 'pending@example.com',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Verification code is required' });
  });

  it('POST /auth/verify-email rejects an unknown user', async () => {
    const response = await request(app).post('/auth/verify-email').send({
      email: 'missing@example.com',
      code: '123456',
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Verification request not found' });
  });

  it('POST /auth/verify-email rejects an already verified user', async () => {
    await createVerifiedUser('verified@example.com');

    const response = await request(app).post('/auth/verify-email').send({
      email: 'verified@example.com',
      code: '123456',
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Account is already verified' });
  });

  it('POST /auth/verify-email rejects a user without a stored code', async () => {
    await createUnverifiedUser({
      email: 'nocode@example.com',
      verificationCode: null,
      verificationExpiresAt: null,
    });

    const response = await request(app).post('/auth/verify-email').send({
      email: 'nocode@example.com',
      code: '123456',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'No verification code found for this account' });
  });

  it('POST /auth/verify-email rejects an expired code', async () => {
    await createUnverifiedUser({
      email: 'expired@example.com',
      verificationCode: '123456',
      verificationExpiresAt: new Date(Date.now() - 60_000),
    });

    const response = await request(app).post('/auth/verify-email').send({
      email: 'expired@example.com',
      code: '123456',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Verification code has expired' });
  });

  it('POST /auth/verify-email rejects an invalid code', async () => {
    await createUnverifiedUser({
      email: 'wrong-code@example.com',
      verificationCode: '123456',
    });

    const response = await request(app).post('/auth/verify-email').send({
      email: 'wrong-code@example.com',
      code: '654321',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid verification code' });
  });

  it('POST /auth/verify-email returns auth tokens for a valid code', async () => {
    await createUnverifiedUser({
      email: 'verify-me@example.com',
      verificationCode: '123456',
    });

    const response = await request(app).post('/auth/verify-email').send({
      email: 'verify-me@example.com',
      code: '123456',
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.user.email).toBe('verify-me@example.com');
  });

  it('POST /auth/verify-email marks the user as verified', async () => {
    const user = await createUnverifiedUser({
      email: 'verify-status@example.com',
      verificationCode: '123456',
    });

    await request(app).post('/auth/verify-email').send({
      email: 'verify-status@example.com',
      code: '123456',
    });

    const verifiedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(verifiedUser?.isVerified).toBe(true);
  });

  it('POST /auth/verify-email clears verification fields after success', async () => {
    const user = await createUnverifiedUser({
      email: 'verify-clear@example.com',
      verificationCode: '123456',
    });

    await request(app).post('/auth/verify-email').send({
      email: 'verify-clear@example.com',
      code: '123456',
    });

    const verifiedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(verifiedUser?.verificationCode).toBeNull();
    expect(verifiedUser?.verificationExpiresAt).toBeNull();
  });

  it('POST /auth/verify-email creates a session after success', async () => {
    const user = await createUnverifiedUser({
      email: 'verify-session@example.com',
      verificationCode: '123456',
    });

    await request(app).post('/auth/verify-email').send({
      email: 'verify-session@example.com',
      code: '123456',
    });

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
    });

    expect(sessions).toHaveLength(1);
  });

  it('POST /auth/login rejects missing email', async () => {
    const response = await request(app).post('/auth/login').send({
      password: 'password123',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Email is required' });
  });

  it('POST /auth/login rejects missing password', async () => {
    const response = await request(app).post('/auth/login').send({
      email: 'user@example.com',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Password is required' });
  });

  it('POST /auth/login rejects invalid credentials', async () => {
    await createVerifiedUser('login-user@example.com');

    const response = await request(app).post('/auth/login').send({
      email: 'login-user@example.com',
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid email or password' });
  });

  it('POST /auth/login rejects an unverified user', async () => {
    await createUnverifiedUser({
      email: 'pending-login@example.com',
      verificationCode: '123456',
    });

    const response = await request(app).post('/auth/login').send({
      email: 'pending-login@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Please verify your email before signing in' });
  });

  it('POST /auth/login returns auth tokens for a verified user', async () => {
    await createVerifiedUser('verified-login@example.com');

    const response = await request(app).post('/auth/login').send({
      email: 'verified-login@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.user.email).toBe('verified-login@example.com');
  });

  it('POST /auth/login creates a session for a verified user', async () => {
    const user = await createVerifiedUser('verified-session@example.com');

    await request(app).post('/auth/login').send({
      email: 'verified-session@example.com',
      password: 'password123',
    });

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
    });

    expect(sessions).toHaveLength(1);
  });

  it('POST /auth/dev-login rejects missing email', async () => {
    const response = await request(app).post('/auth/dev-login').send({
      name: 'Test User',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Email is required' });
  });

  it('POST /auth/dev-login creates a user when one does not exist', async () => {
    await request(app).post('/auth/dev-login').send({
      email: 'dev-user@example.com',
      name: 'Test User',
    });

    const user = await prisma.user.findUnique({
      where: { email: 'dev-user@example.com' },
    });

    expect(user?.email).toBe('dev-user@example.com');
  });

  it('POST /auth/dev-login returns tokens for an existing user', async () => {
    await createVerifiedUser('dev-existing@example.com');

    const response = await request(app).post('/auth/dev-login').send({
      email: 'dev-existing@example.com',
      name: 'Test User',
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
  });

  it('POST /auth/dev-login creates a session', async () => {
    const user = await createVerifiedUser('dev-session@example.com');

    await request(app).post('/auth/dev-login').send({
      email: 'dev-session@example.com',
      name: 'Test User',
    });

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
    });

    expect(sessions).toHaveLength(1);
  });

  it('POST /auth/refresh rejects missing refresh token', async () => {
    const response = await request(app).post('/auth/refresh').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Refresh token is required' });
  });

  it('POST /auth/refresh rejects an invalid refresh token', async () => {
    const response = await request(app).post('/auth/refresh').send({
      refreshToken: 'not-a-valid-token',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid refresh token' });
  });

  it('POST /auth/refresh rejects a missing session', async () => {
    const refreshToken = signRefreshToken({
      userId: 999999,
      email: 'missing-session@example.com',
    });

    const response = await request(app).post('/auth/refresh').send({
      refreshToken,
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid refresh token' });
  });

  it('POST /auth/refresh rejects an expired session', async () => {
    const user = await createVerifiedUser('expired-session@example.com');
    const refreshToken = signRefreshToken({
      userId: user.id,
      email: user.email,
    });

    await createSession(user.id, refreshToken, new Date(Date.now() - 60_000));

    const response = await request(app).post('/auth/refresh').send({
      refreshToken,
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Refresh token expired' });
  });

  it('POST /auth/refresh returns a new access token for a valid session', async () => {
    const user = await createVerifiedUser('refresh-success@example.com');
    const refreshToken = signRefreshToken({
      userId: user.id,
      email: user.email,
    });

    await createSession(user.id, refreshToken);

    const response = await request(app).post('/auth/refresh').send({
      refreshToken,
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user.email).toBe('refresh-success@example.com');
  });

  it('POST /auth/logout rejects missing refresh token', async () => {
    const response = await request(app).post('/auth/logout').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Refresh token is required' });
  });

  it('POST /auth/logout returns 204 for an existing session', async () => {
    const user = await createVerifiedUser('logout-existing@example.com');
    const refreshToken = signRefreshToken({
      userId: user.id,
      email: user.email,
    });

    await createSession(user.id, refreshToken);

    const response = await request(app).post('/auth/logout').send({
      refreshToken,
    });

    expect(response.status).toBe(204);
  });

  it('POST /auth/logout deletes the matching session', async () => {
    const user = await createVerifiedUser('logout-delete@example.com');
    const refreshToken = signRefreshToken({
      userId: user.id,
      email: user.email,
    });

    const session = await createSession(user.id, refreshToken);

    await request(app).post('/auth/logout').send({
      refreshToken,
    });

    const deletedSession = await prisma.session.findUnique({
      where: { id: session.id },
    });

    expect(deletedSession).toBeNull();
  });

  it('POST /auth/logout still returns 204 for an unknown session token', async () => {
    const response = await request(app).post('/auth/logout').send({
      refreshToken: 'missing-session-token',
    });

    expect(response.status).toBe(204);
  });

  it('POST /auth/forgot-password rejects missing email', async () => {
    const response = await request(app).post('/auth/forgot-password').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Email is required' });
  });

  it('POST /auth/forgot-password returns success for an unknown email', async () => {
    const response = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'A reset code has been sent to recipient' });
  });

  it('POST /auth/forgot-password returns success for an unverified user', async () => {
    await createUnverifiedUser({ email: 'unverified-forgot@example.com' });

    const response = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'unverified-forgot@example.com' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'A reset code has been sent to recipient' });
  });

  it('POST /auth/forgot-password sends a reset code for a verified user', async () => {
    await createVerifiedUser('forgot-sends@example.com');

    await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'forgot-sends@example.com' });

    expect(mockedSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendPasswordResetEmail).toHaveBeenCalledWith(
      'forgot-sends@example.com',
      expect.any(String),
    );
  });

  it('POST /auth/forgot-password stores a reset code for a verified user', async () => {
    const user = await createVerifiedUser('forgot-stores@example.com');

    await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'forgot-stores@example.com' });

    const updated = await prisma.user.findUnique({ where: { id: user.id } });

    expect(updated?.verificationCode).toEqual(expect.any(String));
    expect(updated?.verificationExpiresAt).toBeInstanceOf(Date);
  });

  it('POST /auth/reset-password rejects missing email', async () => {
    const response = await request(app)
      .post('/auth/reset-password')
      .send({ code: '123456', newPassword: 'newpassword123' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Email is required' });
  });

  it('POST /auth/reset-password rejects missing code', async () => {
    const response = await request(app)
      .post('/auth/reset-password')
      .send({ email: 'user@example.com', newPassword: 'newpassword123' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Reset code is required' });
  });

  it('POST /auth/reset-password rejects a short new password', async () => {
    const response = await request(app)
      .post('/auth/reset-password')
      .send({ email: 'user@example.com', code: '123456', newPassword: '123' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Password must be at least 6 characters long' });
  });

  it('POST /auth/reset-password rejects an unknown or unverified email', async () => {
    const response = await request(app)
      .post('/auth/reset-password')
      .send({ email: 'nobody@example.com', code: '123456', newPassword: 'newpassword123' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid or expired reset code' });
  });

  it('POST /auth/reset-password rejects an expired code', async () => {
    await createVerifiedUser('reset-expired@example.com');
    await prisma.user.update({
      where: { email: 'reset-expired@example.com' },
      data: {
        verificationCode: '123456',
        verificationExpiresAt: new Date(Date.now() - 60_000),
      },
    });

    const response = await request(app).post('/auth/reset-password').send({
      email: 'reset-expired@example.com',
      code: '123456',
      newPassword: 'newpassword123',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid or expired reset code' });
  });

  it('POST /auth/reset-password rejects a wrong code', async () => {
    await createVerifiedUser('reset-wrong-code@example.com');
    await prisma.user.update({
      where: { email: 'reset-wrong-code@example.com' },
      data: {
        verificationCode: '123456',
        verificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const response = await request(app).post('/auth/reset-password').send({
      email: 'reset-wrong-code@example.com',
      code: '654321',
      newPassword: 'newpassword123',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid or expired reset code' });
  });

  it('POST /auth/reset-password succeeds with a valid code', async () => {
    await createVerifiedUser('reset-success@example.com');
    await prisma.user.update({
      where: { email: 'reset-success@example.com' },
      data: {
        verificationCode: '123456',
        verificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const response = await request(app).post('/auth/reset-password').send({
      email: 'reset-success@example.com',
      code: '123456',
      newPassword: 'newpassword123',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Password reset successfully' });
  });

  it('POST /auth/reset-password updates the password and clears the code', async () => {
    await createVerifiedUser('reset-updates@example.com');
    await prisma.user.update({
      where: { email: 'reset-updates@example.com' },
      data: {
        verificationCode: '123456',
        verificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await request(app).post('/auth/reset-password').send({
      email: 'reset-updates@example.com',
      code: '123456',
      newPassword: 'newpassword123',
    });

    const loginWithNew = await request(app).post('/auth/login').send({
      email: 'reset-updates@example.com',
      password: 'newpassword123',
    });

    const loginWithOld = await request(app).post('/auth/login').send({
      email: 'reset-updates@example.com',
      password: 'password123',
    });

    const user = await prisma.user.findUnique({ where: { email: 'reset-updates@example.com' } });

    expect(loginWithNew.status).toBe(200);
    expect(loginWithOld.status).toBe(401);
    expect(user?.verificationCode).toBeNull();
    expect(user?.verificationExpiresAt).toBeNull();
  });

  it('POST /auth/change-password rejects missing auth token', async () => {
    const response = await request(app).post('/auth/change-password').send({
      currentPassword: 'password123',
      newPassword: 'newpassword123',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('POST /auth/change-password rejects an invalid auth token', async () => {
    const response = await request(app)
      .post('/auth/change-password')
      .set('Authorization', 'Bearer not-a-valid-token')
      .send({
        currentPassword: 'password123',
        newPassword: 'newpassword123',
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid or expired token' });
  });

  it('POST /auth/change-password rejects missing currentPassword', async () => {
    await createVerifiedUser('change-pwd-missing-current@example.com');
    const { body } = await request(app).post('/auth/login').send({
      email: 'change-pwd-missing-current@example.com',
      password: 'password123',
    });

    const response = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .send({ newPassword: 'newpassword123' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Current password is required' });
  });

  it('POST /auth/change-password rejects a short newPassword', async () => {
    await createVerifiedUser('change-pwd-short-new@example.com');
    const { body } = await request(app).post('/auth/login').send({
      email: 'change-pwd-short-new@example.com',
      password: 'password123',
    });

    const response = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .send({ currentPassword: 'password123', newPassword: '123' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'New password must be at least 6 characters long' });
  });

  it('POST /auth/change-password rejects a wrong currentPassword', async () => {
    await createVerifiedUser('change-pwd-wrong-current@example.com');
    const { body } = await request(app).post('/auth/login').send({
      email: 'change-pwd-wrong-current@example.com',
      password: 'password123',
    });

    const response = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .send({ currentPassword: 'wrong-password', newPassword: 'newpassword123' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Current password is incorrect' });
  });

  it('POST /auth/change-password succeeds with correct credentials', async () => {
    await createVerifiedUser('change-pwd-success@example.com');
    const { body } = await request(app).post('/auth/login').send({
      email: 'change-pwd-success@example.com',
      password: 'password123',
    });

    const response = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .send({ currentPassword: 'password123', newPassword: 'newpassword123' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Password updated successfully' });
  });

  it('POST /auth/change-password updates the stored password hash', async () => {
    const user = await createVerifiedUser('change-pwd-hash@example.com');
    const accessToken = signAccessToken({ userId: user.id, email: user.email });

    await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'password123', newPassword: 'newpassword123' });

    const loginWithOld = await request(app).post('/auth/login').send({
      email: 'change-pwd-hash@example.com',
      password: 'password123',
    });

    const loginWithNew = await request(app).post('/auth/login').send({
      email: 'change-pwd-hash@example.com',
      password: 'newpassword123',
    });

    expect(loginWithOld.status).toBe(401);
    expect(loginWithNew.status).toBe(200);
  });

  it('DELETE /auth/account rejects missing auth token', async () => {
    const response = await request(app).delete('/auth/account');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('DELETE /auth/account rejects an invalid token', async () => {
    const response = await request(app)
      .delete('/auth/account')
      .set('Authorization', 'Bearer not-a-valid-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid or expired token' });
  });

  it('DELETE /auth/account deletes the user and returns 204', async () => {
    const user = await createVerifiedUser('delete-me@example.com');
    const accessToken = signAccessToken({ userId: user.id, email: user.email });

    const response = await request(app)
      .delete('/auth/account')
      .set('Authorization', `Bearer ${accessToken}`);

    const deletedUser = await prisma.user.findUnique({ where: { id: user.id } });

    expect(response.status).toBe(204);
    expect(deletedUser).toBeNull();
  });

  it('DELETE /auth/account cascades to user transactions', async () => {
    const user = await createVerifiedUser('delete-cascade@example.com');
    const accessToken = signAccessToken({ userId: user.id, email: user.email });

    await prisma.transaction.create({
      data: {
        userId: user.id,
        title: 'Test',
        amount: 10,
        type: 'expense',
        category: 'FOOD',
        date: new Date(),
      },
    });

    await request(app)
      .delete('/auth/account')
      .set('Authorization', `Bearer ${accessToken}`);

    const transactions = await prisma.transaction.findMany({ where: { userId: user.id } });

    expect(transactions).toHaveLength(0);
  });
});
