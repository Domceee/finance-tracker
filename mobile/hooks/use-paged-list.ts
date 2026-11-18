import { useCallback, useState } from 'react';
import type { Paginated } from '../lib/api';

export function usePagedList<T extends { id: number }>(fetchPage: (page: number) => Promise<Paginated<T>>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const applyMeta = useCallback((result: Paginated<T>) => {
    setPage(result.meta.page);
    setTotalPages(result.meta.totalPages);
    setTotal(result.meta.total);
  }, []);

  const reload = useCallback(async () => {
    setError('');
    setIsLoading(true);

    try {
      const result = await fetchPage(1);
      setItems(result.data);
      applyMeta(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load list');
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage, applyMeta]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || page >= totalPages) return;

    setError('');
    setIsLoadingMore(true);

    try {
      const result = await fetchPage(page + 1);
      setItems((prev) => [...prev, ...result.data.filter((item) => !prev.some((p) => p.id === item.id))]);
      applyMeta(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchPage, applyMeta, isLoadingMore, page, totalPages]);

  return {
    items,
    total,
    hasMore: page < totalPages,
    isLoading,
    isLoadingMore,
    error,
    reload,
    loadMore,
  };
}
