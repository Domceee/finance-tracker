import { describe, expect, it } from 'vitest';
import {
  parseAmount,
  parseDate,
  validateTransactionCreate,
  validateTransactionUpdate,
} from '../lib/transaction-input.js';

const validBody = {
  title: ' Groceries ',
  amount: 24.5,
  type: 'expense',
  category: 'FOOD',
  date: '2026-04-02T12:00:00.000Z',
  accountId: 3,
};

describe('parseAmount', () => {
  it('accepts positive numbers and numeric strings', () => {
    expect(parseAmount(10)).toBe(10);
    expect(parseAmount('2.5')).toBe(2.5);
  });

  it('rejects zero, negatives and non-numbers', () => {
    for (const value of [0, -1, '', 'abc', true, null, undefined, Infinity]) {
      expect(parseAmount(value)).toBeNull();
    }
  });
});

describe('parseDate', () => {
  it('accepts ISO dates', () => {
    expect(parseDate('2026-04-02T12:00:00.000Z')?.toISOString()).toBe('2026-04-02T12:00:00.000Z');
  });

  it('rejects invalid and out-of-range dates', () => {
    for (const value of ['not-a-date', '', null, undefined, '1800-01-01', '3000-01-01']) {
      expect(parseDate(value)).toBeNull();
    }
  });
});

describe('validateTransactionCreate', () => {
  it('returns clean data for a valid expense', () => {
    expect(validateTransactionCreate(validBody)).toEqual({
      data: {
        title: 'Groceries',
        amount: 24.5,
        type: 'expense',
        category: 'FOOD',
        date: new Date('2026-04-02T12:00:00.000Z'),
        description: null,
        accountId: 3,
      },
    });
  });

  it('forces SALARY for income', () => {
    const result = validateTransactionCreate({ ...validBody, type: 'income', category: 'FOOD' });

    expect(result).toMatchObject({ data: { category: 'SALARY' } });
  });

  it('rejects SALARY for an expense', () => {
    expect(validateTransactionCreate({ ...validBody, category: 'SALARY' })).toEqual({
      error: 'Invalid transaction category',
    });
  });
});

describe('validateTransactionUpdate', () => {
  const existing = { type: 'expense', category: 'FOOD' as const };

  it('only returns the fields that were sent, plus the resolved category', () => {
    expect(validateTransactionUpdate({ title: 'Lunch' }, existing)).toEqual({
      data: { title: 'Lunch', category: 'FOOD' },
    });
  });

  it('switches to SALARY when the type changes to income', () => {
    expect(validateTransactionUpdate({ type: 'income' }, existing)).toEqual({
      data: { type: 'income', category: 'SALARY' },
    });
  });

  it('rejects an empty title', () => {
    expect(validateTransactionUpdate({ title: '  ' }, existing)).toEqual({ error: 'Title is required' });
  });
});
