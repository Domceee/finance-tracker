import { useCallback, useRef, useState } from 'react';
import type { Paginated } from '../lib/api';

export function usePagedList<T extends { id: number }>(fetchPage: (page: number) => Promise<Paginated<T>>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const applyMeta = useCallback((result: Paginated<T>) => {
    setPage(result.meta.page);
    setTotalPages(result.meta.totalPages);
    setTotal(result.meta.total);
  }, []);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setError('');
    setIsLoading(true);

    try {
      const result = await fetchPage(1);
      if (id !== requestId.current) return;
      setItems(result.data);
      applyMeta(result);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load list');
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [fetchPage, applyMeta]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || page >= totalPages) return;

    const id = requestId.current;
    setError('');
    setIsLoadingMore(true);

    try {
      const result = await fetchPage(page + 1);
      if (id !== requestId.current) return;
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
