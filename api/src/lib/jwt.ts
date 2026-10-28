import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';

type AccessPayload = {
    userId: number;
    email: string;
    role: Role;
};

type RefreshPayload = {
    userId: number;
    email: string;
};

const accessSecret = process.env.JWT_ACCESS_SECRET!;
const refreshSecret = process.env.JWT_REFRESH_SECRET!;

export function signAccessToken(payload: AccessPayload) {
  return jwt.sign(payload, accessSecret, { expiresIn: '15m' });
}

export function signRefreshToken(payload: RefreshPayload) {
  return jwt.sign(payload, refreshSecret, { expiresIn: '30d', jwtid: randomUUID() });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, accessSecret) as AccessPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, refreshSecret) as RefreshPayload;
}
