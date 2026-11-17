import type { Request } from 'express';
import { link, type Link } from './links.js';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const INVALID_PAGINATION_MESSAGE =
  `page must be a positive integer and limit must be between 1 and ${MAX_PAGE_SIZE}`;

export type Pagination = {
  page: number;
  limit: number;
  skip: number;
};

type PageLinks = {
  self: Link;
  first: Link;
  last: Link;
  prev?: Link;
  next?: Link;
};

function parsePositiveInt(value: unknown, fallback: number): number | null {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsed = Number(value);

  if (parsed < 1 || !Number.isSafeInteger(parsed)) {
    return null;
  }

  return parsed;
}

export function parsePagination(query: Request['query']): Pagination | null {
  const page = parsePositiveInt(query.page, 1);
  const limit = parsePositiveInt(query.limit, DEFAULT_PAGE_SIZE);

  if (page === null || limit === null || limit > MAX_PAGE_SIZE) {
    return null;
  }

  return { page, limit, skip: (page - 1) * limit };
}

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

  const links: PageLinks = {
    self: link(pageHref(req, page, limit)),
    first: link(pageHref(req, 1, limit)),
    last: link(pageHref(req, totalPages, limit)),
  };

  if (page > 1) {
    links.prev = link(pageHref(req, Math.min(page - 1, totalPages), limit));
  }

  if (page < totalPages) {
    links.next = link(pageHref(req, page + 1, limit));
  }

  return {
    data,
    meta: { page, limit, total, totalPages },
    _links: links,
  };
}
