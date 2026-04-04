import { Router } from 'express';
import prisma from '../prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { sendVerificationEmail } from '../lib/mail.js';

const router = Router();
const VERIFICATION_CODE_LENGTH = 6;
const VERIFICATION_EXPIRY_MS = 10 * 60 * 1000;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateVerificationCode() {
  return Math.floor(Math.random() * 10 ** VERIFICATION_CODE_LENGTH)
    .toString()
    .padStart(VERIFICATION_CODE_LENGTH, '0');
}

function buildAuthResponse(user: {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}) {
  const payload = {
    userId: user.id,
    email: user.email,
  };

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  };
}

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser?.isVerified) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const verificationCode = generateVerificationCode();
  const verificationExpiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_MS);

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash: hashPassword(password),
        name: typeof name === 'string' ? name : null,
        verificationCode,
        verificationExpiresAt,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: hashPassword(password),
        name: typeof name === 'string' ? name : null,
        verificationCode,
        verificationExpiresAt,
      },
    });
  }

  await sendVerificationEmail(normalizedEmail, verificationCode);

  return res.status(201).json({
    message: 'Verification code sent',
  });
});

router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Verification code is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return res.status(404).json({ error: 'Verification request not found' });
  }

  if (user.isVerified) {
    return res.status(409).json({ error: 'Account is already verified' });
  }

  if (!user.verificationCode || !user.verificationExpiresAt) {
    return res.status(400).json({ error: 'No verification code found for this account' });
  }

  if (user.verificationExpiresAt < new Date()) {
    return res.status(400).json({ error: 'Verification code has expired' });
  }

  if (user.verificationCode !== code.trim()) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  const verifiedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      verificationCode: null,
      verificationExpiresAt: null,
    },
  });

  const authResponse = buildAuthResponse(verifiedUser);

  await prisma.session.create({
    data: {
      userId: verifiedUser.id,
      refreshToken: authResponse.refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return res.json(authResponse);
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.isVerified) {
    return res.status(403).json({ error: 'Please verify your email before signing in' });
  }

  const authResponse = buildAuthResponse(user);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: authResponse.refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return res.json(authResponse);
});

router.post('/dev-login', async (req, res) => {
  const { email, name } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: typeof name === 'string' ? name : null,
        googleId: `dev-${email}`,
      },
    });
  }

  const authResponse = buildAuthResponse(user);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: authResponse.refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return res.json(authResponse);
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);

    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({
        where: { id: session.id },
      });

      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const newAccessToken = signAccessToken({
      userId: payload.userId,
      email: payload.email,
    });

    return res.json({
      accessToken: newAccessToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        avatarUrl: session.user.avatarUrl,
      },
    });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  await prisma.session.deleteMany({
    where: { refreshToken },
  });

  return res.status(204).send();
});

export default router;
