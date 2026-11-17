import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import {
  accountLinks,
  listResponse,
  noteLinks,
  parseId,
  parsePagination,
  transactionLinks,
  withLinks,
} from '../lib/http.js';

function fakeRequest(baseUrl: string, path: string, query: Record<string, unknown> = {}) {
  return { baseUrl, path, query } as unknown as Request;
}

describe('parseId', () => {
  it('accepts positive integers as strings or numbers', () => {
    expect(parseId('1')).toBe(1);
    expect(parseId(' 42 ')).toBe(42);
    expect(parseId(7)).toBe(7);
    expect(parseId('2147483647')).toBe(2147483647);
  });

  it('rejects anything that is not a valid int4 ID', () => {
    for (const value of ['0', '-1', '1.5', 'abc', '', '1e3', '2147483648', '99999999999', 1.5, true, null, undefined, {}]) {
      expect(parseId(value)).toBeNull();
    }
  });
});

describe('parsePagination', () => {
  it('uses defaults when nothing is given', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('computes skip from page and limit', () => {
    expect(parsePagination({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  it('rejects invalid values', () => {
    for (const query of [{ page: '0' }, { page: 'abc' }, { page: '1.5' }, { limit: '0' }, { limit: '101' }, { page: ['1', '2'] }]) {
      expect(parsePagination(query as Request['query'])).toBeNull();
    }
  });
});

describe('listResponse', () => {
  it('builds meta and page links that keep filters', () => {
    const req = fakeRequest('/transactions', '/', { type: 'expense', page: '2', limit: '20' });
    const body = listResponse(req, ['a'], 57, { page: 2, limit: 20, skip: 20 });

    expect(body.data).toEqual(['a']);
    expect(body.meta).toEqual({ page: 2, limit: 20, total: 57, totalPages: 3 });
    expect(body._links.self.href).toBe('/transactions?type=expense&page=2&limit=20');
    expect(body._links.first.href).toBe('/transactions?type=expense&page=1&limit=20');
    expect(body._links.last.href).toBe('/transactions?type=expense&page=3&limit=20');
    expect(body._links.prev?.href).toBe('/transactions?type=expense&page=1&limit=20');
    expect(body._links.next?.href).toBe('/transactions?type=expense&page=3&limit=20');
  });

  it('omits prev on the first page and next on the last page', () => {
    const req = fakeRequest('/accounts', '/5/transactions');
    const body = listResponse(req, [], 0, { page: 1, limit: 20, skip: 0 });

    expect(body.meta.totalPages).toBe(1);
    expect(body._links.self.href).toBe('/accounts/5/transactions?page=1&limit=20');
    expect(body._links).not.toHaveProperty('prev');
    expect(body._links).not.toHaveProperty('next');
  });
});

describe('resource links', () => {
  it('links an account to itself and its transactions', () => {
    expect(accountLinks({ id: 3 })).toEqual({
      self: { href: '/accounts/3', method: 'GET' },
      update: { href: '/accounts/3', method: 'PATCH' },
      delete: { href: '/accounts/3', method: 'DELETE' },
      transactions: { href: '/accounts/3/transactions', method: 'GET' },
    });
  });

  it('links a transaction to its account and notes', () => {
    const links = transactionLinks({ id: 9, accountId: 3 });

    expect(links.account).toEqual({ href: '/accounts/3', method: 'GET' });
    expect(links.notes).toEqual({ href: '/transactions/9/notes', method: 'GET' });
    expect(links.createNote).toEqual({ href: '/transactions/9/notes', method: 'POST' });
  });

  it('links a note to its transaction', () => {
    expect(noteLinks({ id: 4, transactionId: 9 }).transaction).toEqual({ href: '/transactions/9', method: 'GET' });
  });

  it('withLinks adds _links without changing the resource', () => {
    const account = { id: 3, name: 'Main' };

    expect(withLinks(account, accountLinks(account))).toEqual({ ...account, _links: accountLinks(account) });
    expect(account).not.toHaveProperty('_links');
  });
});
