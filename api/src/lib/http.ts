import type { Request } from 'express';

export const MAX_ID = 2_147_483_647;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function parseId(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return null;
  }

  const text = String(raw).trim();

  if (!/^\d+$/.test(text)) {
    return null;
  }

  const id = Number(text);

  return id >= 1 && id <= MAX_ID ? id : null;
}

export type Pagination = {
  page: number;
  limit: number;
  skip: number;
};

function parsePositiveInt(value: unknown, fallback: number): number | null {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsed = Number(value);

  return parsed >= 1 && Number.isSafeInteger(parsed) ? parsed : null;
}

export function parsePagination(query: Request['query']): Pagination | null {
  const page = parsePositiveInt(query.page, 1);
  const limit = parsePositiveInt(query.limit, DEFAULT_PAGE_SIZE);

  if (page === null || limit === null || limit > MAX_PAGE_SIZE) {
    return null;
  }

  return { page, limit, skip: (page - 1) * limit };
}

export const INVALID_PAGINATION_MESSAGE =
  `page must be a positive integer and limit must be between 1 and ${MAX_PAGE_SIZE}`;

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type Link = {
  href: string;
  method: HttpMethod;
};

const link = (href: string, method: HttpMethod = 'GET'): Link => ({ href, method });

function requestPath(req: Request) {
  const path = req.baseUrl + (req.path === '/' ? '' : req.path);
  return path || '/';
}

function pageHref(req: Request, page: number, limit: number) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'page' && key !== 'limit' && typeof value === 'string') {
      params.set(key, value);
    }
  }

  params.set('page', String(page));
  params.set('limit', String(limit));

  return `${requestPath(req)}?${params.toString()}`;
}

export function listResponse<T>(req: Request, data: T[], total: number, pagination: Pagination) {
  const { page, limit } = pagination;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageLink = (target: number) => link(pageHref(req, target, limit));

  return {
    data,
    meta: { page, limit, total, totalPages },
    _links: {
      self: pageLink(page),
      first: pageLink(1),
      last: pageLink(totalPages),
      ...(page > 1 && { prev: pageLink(Math.min(page - 1, totalPages)) }),
      ...(page < totalPages && { next: pageLink(page + 1) }),
    },
  };
}

export function accountLinks(account: { id: number }) {
  const self = `/accounts/${account.id}`;

  return {
    self: link(self),
    update: link(self, 'PATCH'),
    delete: link(self, 'DELETE'),
    transactions: link(`${self}/transactions`),
  };
}

export function transactionLinks(transaction: { id: number; accountId: number }) {
  const self = `/transactions/${transaction.id}`;

  return {
    self: link(self),
    update: link(self, 'PATCH'),
    delete: link(self, 'DELETE'),
    account: link(`/accounts/${transaction.accountId}`),
    notes: link(`${self}/notes`),
    createNote: link(`${self}/notes`, 'POST'),
  };
}

export function noteLinks(note: { id: number; transactionId: number }) {
  const self = `/notes/${note.id}`;

  return {
    self: link(self),
    update: link(self, 'PATCH'),
    delete: link(self, 'DELETE'),
    transaction: link(`/transactions/${note.transactionId}`),
  };
}

export function withLinks<T extends object, L extends Record<string, Link>>(resource: T, links: L) {
  return { ...resource, _links: links };
}
