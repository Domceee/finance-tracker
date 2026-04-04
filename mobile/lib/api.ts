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

type AuthResponse = {
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

type RegisterStartResponse = {
  message: string;
};

async function getErrorMessage(response: Response, fallbackMessage: string) {
  try {
    const data = (await response.json()) as { error?: string };

    if (data?.error && typeof data.error === 'string') {
      return data.error;
    }
  } catch {
    return fallbackMessage;
  }

  return fallbackMessage;
}

export async function register(email: string, password: string, name?: string): Promise<RegisterStartResponse> {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to register'));
  }

  return response.json();
}

export async function verifyEmail(email: string, code: string): Promise<AuthResponse> {
  const response = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to verify email'));
  }

  return response.json();
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to log in'));
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
    throw new Error(await getErrorMessage(response, 'Failed to refresh session'));
  }

  return response.json();
}

export async function logoutSession(refreshToken: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to log out'));
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  const response = await apiFetch('/transactions');

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to fetch transactions'));
  }

  return response.json();
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const response = await apiFetch('/transactions', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to create transaction'));
  }

  return response.json();
}
