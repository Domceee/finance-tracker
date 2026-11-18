import type { TransactionCategory } from './api';

export type TransactionTypeFilter = 'income' | 'expense' | null;

export type TransactionFilters = {
  search: string;
  type: TransactionTypeFilter;
  category: TransactionCategory | null;
};

export const EMPTY_TRANSACTION_FILTERS: TransactionFilters = {
  search: '',
  type: null,
  category: null,
};

export function hasActiveFilters(filters: TransactionFilters) {
  return filters.search.trim().length > 0 || filters.type !== null || filters.category !== null;
}

export function transactionFilterParams(filters: TransactionFilters) {
  const params = new URLSearchParams();
  const search = filters.search.trim();

  if (search) params.set('search', search);
  if (filters.type) params.set('type', filters.type);
  if (filters.category) params.set('category', filters.category);

  return params;
}
