import jwt from 'jsonwebtoken';

type AuthPayload = {
    userId: number;
    email: string;
};

const accessSecret = process.env.JWT_ACCESS_SECRET!;
const refreshSecret = process.env.JWT_REFRESH_SECRET!;

export function signAccessToken(payload: AuthPayload) {
  return jwt.sign(payload, accessSecret, { expiresIn: '15m' });
}

export function signRefreshToken(payload: AuthPayload) {
  return jwt.sign(payload, refreshSecret, { expiresIn: '30d' });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, accessSecret) as AuthPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, refreshSecret) as AuthPayload;
}