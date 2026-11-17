import { AccountType, Prisma, Role, TransactionCategory } from '@prisma/client';
import type { Request } from 'express';
import { parseId } from './ids.js';
import { parseDate, parseType } from './transaction-input.js';

type Query = Request['query'];
type Result<T> = { where: T } | { error: string };

const accountTypes = new Set<string>(Object.values(AccountType));
const categories = new Set<string>(Object.values(TransactionCategory));
const roles = new Set<string>(Object.values(Role));

function readString(query: Query, key: string): string | undefined | null {
  const value = query[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function contains(text: string) {
  return { contains: text, mode: 'insensitive' as const };
}

export function parseAccountFilters(query: Query): Result<Prisma.AccountWhereInput> {
  const where: Prisma.AccountWhereInput = {};

  const type = readString(query, 'type');

  if (type === null || (type !== undefined && !accountTypes.has(type))) {
    return { error: `type must be one of: ${[...accountTypes].join(', ')}` };
  }

  if (type !== undefined) {
    where.type = type as AccountType;
  }

  const search = readString(query, 'search');

  if (search === null) {
    return { error: 'search must be a non-empty string' };
  }

  if (search !== undefined) {
    where.name = contains(search);
  }

  return { where };
}

export function parseTransactionFilters(query: Query): Result<Prisma.TransactionWhereInput> {
  const where: Prisma.TransactionWhereInput = {};

  const type = readString(query, 'type');

  if (type !== undefined) {
    const parsedType = parseType(type);

    if (parsedType === null) {
      return { error: "type must be 'income' or 'expense'" };
    }

    where.type = parsedType;
  }

  const category = readString(query, 'category');

  if (category === null || (category !== undefined && !categories.has(category))) {
    return { error: `category must be one of: ${[...categories].join(', ')}` };
  }

  if (category !== undefined) {
    where.category = category as TransactionCategory;
  }

  const accountId = readString(query, 'accountId');

  if (accountId !== undefined) {
    const parsedAccountId = parseId(accountId);

    if (parsedAccountId === null) {
      return { error: 'accountId must be a valid ID' };
    }

    where.accountId = parsedAccountId;
  }

  const from = readString(query, 'from');
  const to = readString(query, 'to');
  const fromDate = from === undefined ? undefined : parseDate(from);
  const toDate = to === undefined ? undefined : parseDate(to);

  if (fromDate === null || toDate === null) {
    return { error: 'from and to must be valid dates' };
  }

  if (fromDate && toDate && fromDate > toDate) {
    return { error: 'from must be before to' };
  }

  if (fromDate || toDate) {
    where.date = {};

    if (fromDate) {
      where.date.gte = fromDate;
    }

    if (toDate) {
      where.date.lte = toDate;
    }
  }

  const search = readString(query, 'search');

  if (search === null) {
    return { error: 'search must be a non-empty string' };
  }

  if (search !== undefined) {
    where.title = contains(search);
  }

  return { where };
}

export function parseNoteFilters(query: Query): Result<Prisma.NoteWhereInput> {
  const search = readString(query, 'search');

  if (search === null) {
    return { error: 'search must be a non-empty string' };
  }

  if (search === undefined) {
    return { where: {} };
  }

  return { where: { content: contains(search) } };
}

export function parseBudgetFilters(query: Query): Result<Prisma.BudgetWhereInput> {
  const search = readString(query, 'search');

  if (search === null) {
    return { error: 'search must be a non-empty string' };
  }

  if (search === undefined) {
    return { where: {} };
  }

  return { where: { name: contains(search) } };
}

export function parseUserFilters(query: Query): Result<Prisma.UserWhereInput> {
  const where: Prisma.UserWhereInput = {};

  const role = readString(query, 'role');

  if (role === null || (role !== undefined && !roles.has(role))) {
    return { error: `role must be one of: ${[...roles].join(', ')}` };
  }

  if (role !== undefined) {
    where.role = role as Role;
  }

  const search = readString(query, 'search');

  if (search === null) {
    return { error: 'search must be a non-empty string' };
  }

  if (search !== undefined) {
    where.OR = [{ email: contains(search) }, { name: contains(search) }];
  }

  return { where };
}
