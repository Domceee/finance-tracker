import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { listResponse, parsePagination } from '../lib/pagination.js';

function fakeRequest(baseUrl: string, path: string, query: Record<string, unknown> = {}) {
  return { baseUrl, path, query } as unknown as Request;
}

describe('parsePagination', () => {
  it('uses defaults when nothing is given', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('computes skip from page and limit', () => {
    expect(parsePagination({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  it('rejects invalid values', () => {
    const invalid = [{ page: '0' }, { page: 'abc' }, { page: '1.5' }, { limit: '0' }, { limit: '101' }, { page: ['1', '2'] }];

    for (const query of invalid) {
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
