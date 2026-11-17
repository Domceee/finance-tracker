import { TransactionCategory } from '@prisma/client';
import { parseId } from './ids.js';

export type TransactionType = 'income' | 'expense';

export type TransactionData = {
  title: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  date: Date;
  description: string | null;
  accountId: number;
};

type Result<T> = { data: T } | { error: string };

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

const categories = new Set<string>(Object.values(TransactionCategory));

export function parseTitle(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

export function parseAmount(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

export function parseType(value: unknown): TransactionType | null {
  if (value === 'income' || value === 'expense') {
    return value;
  }

  return null;
}

export function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getUTCFullYear();

  if (year < MIN_YEAR || year > MAX_YEAR) {
    return null;
  }

  return date;
}

function resolveCategory(type: TransactionType, category: unknown): TransactionCategory | null {
  if (type === 'income') {
    return TransactionCategory.SALARY;
  }

  if (typeof category !== 'string' || !categories.has(category) || category === TransactionCategory.SALARY) {
    return null;
  }

  return category as TransactionCategory;
}

export function validateTransactionCreate(body: Record<string, unknown>): Result<TransactionData> {
  const amount = parseAmount(body.amount);

  if (amount === null) {
    return { error: 'Amount must be greater than 0' };
  }

  if (body.accountId === undefined || body.accountId === null) {
    return { error: 'Account is required' };
  }

  const accountId = parseId(body.accountId);

  if (accountId === null) {
    return { error: 'Invalid account' };
  }

  const type = parseType(body.type);

  if (type === null) {
    return { error: "Type must be 'income' or 'expense'" };
  }

  const category = resolveCategory(type, body.category);

  if (category === null) {
    return { error: 'Invalid transaction category' };
  }

  const title = parseTitle(body.title);

  if (title === null) {
    return { error: 'Title is required' };
  }

  const date = parseDate(body.date);

  if (date === null) {
    return { error: 'Date must be a valid date' };
  }

  if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
    return { error: 'Description must be a string' };
  }

  const description = typeof body.description === 'string' ? body.description : null;

  return { data: { title, amount, type, category, date, description, accountId } };
}

export function validateTransactionUpdate(
  body: Record<string, unknown>,
  existing: { type: string; category: TransactionCategory },
): Result<Partial<TransactionData>> {
  const data: Partial<TransactionData> = {};

  if (body.amount !== undefined) {
    const amount = parseAmount(body.amount);

    if (amount === null) {
      return { error: 'Amount must be greater than 0' };
    }

    data.amount = amount;
  }

  if (body.accountId !== undefined) {
    const accountId = parseId(body.accountId);

    if (accountId === null) {
      return { error: 'Invalid account' };
    }

    data.accountId = accountId;
  }

  if (body.type !== undefined) {
    const type = parseType(body.type);

    if (type === null) {
      return { error: "Type must be 'income' or 'expense'" };
    }

    data.type = type;
  }

  const nextType = data.type ?? parseType(existing.type) ?? 'expense';
  const category = resolveCategory(nextType, body.category ?? existing.category);

  if (category === null) {
    return { error: 'Invalid transaction category' };
  }

  data.category = category;

  if (body.title !== undefined) {
    const title = parseTitle(body.title);

    if (title === null) {
      return { error: 'Title is required' };
    }

    data.title = title;
  }

  if (body.date !== undefined) {
    const date = parseDate(body.date);

    if (date === null) {
      return { error: 'Date must be a valid date' };
    }

    data.date = date;
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      return { error: 'Description must be a string' };
    }

    data.description = body.description;
  }

  return { data };
}
