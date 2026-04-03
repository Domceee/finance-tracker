import { apiFetch } from './api-client';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!BASE_URL) {
  throw new Error('API_BASE_URL environment variable is not defined');
}

export type Transaction = {
  id: number;
  title: string;
  amount: number;
  type: string;
  category: string;
  date: string;
  description?: string | null;
  userId: number;
};

export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
};

type DevLoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type RefreshResponse = {
  accessToken: string;
  user: AuthUser;
};

type CreateTransactionInput = {
  title: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  date: string;
  description?: string;
};

export async function devLogin(email: string, name?: string): Promise<DevLoginResponse> {
  const response = await fetch(`${BASE_URL}/auth/dev-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, name }),
  });

  if (!response.ok) {
    throw new Error('Failed to log in');
  }

  return response.json();
}

export async function refreshSession(refreshToken: string): Promise<RefreshResponse> {
  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh session');
  }

  return response.json();
}

export async function getTransactions(): Promise<Transaction[]> {
  const response = await apiFetch('/transactions');

  if (!response.ok) {
    throw new Error('Failed to fetch transactions');
  }

  return response.json();
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const response = await apiFetch('/transactions', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to create transaction');
  }

  return response.json();
}