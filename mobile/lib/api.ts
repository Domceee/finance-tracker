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
  category: TransactionCategory;
  date: string;
  description?: string | null;
  userId: number;
};

export const TRANSACTION_CATEGORIES = [
  'FOOD',
  'SHOPPING',
  'RENT',
  'TRANSPORT',
  'SALARY',
  'ENTERTAINMENT',
  'BAR',
  'EATOUT',
  'OTHER',
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];
export const EXPENSE_TRANSACTION_CATEGORIES = TRANSACTION_CATEGORIES.filter(
  (category) => category !== 'SALARY',
);

export type OverviewInsights = {
  summary: string;
  warning: string;
  tip: string;
};

export type OverviewInsightsResponse = {
  insights: OverviewInsights;
  cached: boolean;
  generatedAt: string | null;
};

export type OverviewCategoryBreakdown = {
  category: TransactionCategory;
  amount: number;
  percentage: number;
};

export type Overview = {
  year: number;
  month: number;
  incomeTotal: number;
  spentTotal: number;
  leftTotal: number;
  categoryBreakdown: OverviewCategoryBreakdown[];
};

export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  currency: string;
  role: 'USER' | 'ADMIN';
};

export const SUPPORTED_CURRENCIES = [
  'EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY',
  'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'HRK',
  'TRY', 'BRL', 'INR', 'KRW', 'SGD', 'HKD', 'NZD', 'MXN',
  'ZAR', 'AED', 'SAR', 'ILS', 'RUB', 'UAH',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type CreateTransactionInput = {
  title: string;
  amount: number;
  type: 'expense' | 'income';
  category: TransactionCategory;
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

export async function getOverview(year?: number, month?: number): Promise<Overview> {
  const searchParams = new URLSearchParams();

  if (year !== undefined) {
    searchParams.set('year', String(year));
  }

  if (month !== undefined) {
    searchParams.set('month', String(month));
  }

  const query = searchParams.toString();
  const response = await apiFetch(`/overview${query ? `?${query}` : ''}`);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to fetch overview'));
  }

  return response.json();
}

export async function updateProfile(avatarUrl: string | null): Promise<AuthUser> {
  const response = await apiFetch('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ avatarUrl }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to update profile'));
  }

  return response.json();
}

export async function updateCurrency(currency: string): Promise<AuthUser> {
  const response = await apiFetch('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ currency }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to update currency'));
  }

  return response.json();
}

export type Budget = {
  id: number;
  name: string;
  limitAmount: number;
  categories: TransactionCategory[];
  spent: number;
  createdAt: string;
};

type CreateBudgetInput = {
  name: string;
  limitAmount: number;
  categories: TransactionCategory[];
};

type UpdateBudgetInput = Partial<CreateBudgetInput>;

export type RatesResponse = {
  rates: Record<string, number>;
  cachedAt: string;
};

export async function getBudgets(): Promise<Budget[]> {
  const response = await apiFetch('/budgets');

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to fetch budgets'));
  }

  return response.json();
}

export async function createBudget(input: CreateBudgetInput): Promise<Budget> {
  const response = await apiFetch('/budgets', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to create budget'));
  }

  return response.json();
}

export async function updateBudget(id: number, input: UpdateBudgetInput): Promise<Budget> {
  const response = await apiFetch(`/budgets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to update budget'));
  }

  return response.json();
}

export async function deleteBudget(id: number): Promise<void> {
  const response = await apiFetch(`/budgets/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to delete budget'));
  }
}

export async function getRates(): Promise<RatesResponse> {
  const response = await apiFetch('/rates');

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to fetch exchange rates'));
  }

  return response.json();
}

export async function forgotPassword(email: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to send reset code'));
  }
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to reset password'));
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const response = await apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to change password'));
  }
}

export async function deleteAccount(): Promise<void> {
  const response = await apiFetch('/auth/account', {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to delete account'));
  }
}

export async function getOverviewInsights(
  year: number,
  month: number,
): Promise<OverviewInsightsResponse> {
  const response = await apiFetch('/ai/overview-insights', {
    method: 'POST',
    body: JSON.stringify({ year, month }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Failed to fetch overview insights'));
  }

  return response.json();
}