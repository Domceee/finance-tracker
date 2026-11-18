import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getTransactionPage, PAGE_SIZE } from '../../lib/api';
import { EMPTY_TRANSACTION_FILTERS, hasActiveFilters, type TransactionFilters } from '../../lib/transaction-filters';
import { usePagedList } from '../../hooks/use-paged-list';
import { useDebouncedValue } from '../../hooks/use-debounced-value';
import { FadeInItem } from '../../components/fade-in-item';
import { LoadMoreButton } from '../../components/load-more-button';
import { TransactionFilterBar } from '../../components/transaction-filter-bar';
import { TransactionRow } from '../../components/transaction-row';
import { AppPalette } from '../../constants/theme';
import { FontFamily } from '../../constants/fonts';

export default function TransactionsScreen() {
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_TRANSACTION_FILTERS);
  const search = useDebouncedValue(filters.search, 350);
  const appliedFilters = useMemo(
    () => ({ search, type: filters.type, category: filters.category }),
    [search, filters.type, filters.category],
  );
  const fetchPage = useCallback((page: number) => getTransactionPage(page, appliedFilters), [appliedFilters]);
  const list = usePagedList(fetchPage);
  const { reload } = list;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Pressable style={styles.addButton} onPress={() => router.push('/add-transaction')}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>

      <TransactionFilterBar filters={filters} onChange={setFilters} />

      {list.isLoading && list.items.length === 0 ? (
        <ActivityIndicator size="large" color={AppPalette.accent} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <FadeInItem index={index % PAGE_SIZE}>
              <TransactionRow transaction={item} />
            </FadeInItem>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {hasActiveFilters(appliedFilters) ? 'No transactions match these filters.' : 'No transactions yet.'}
            </Text>
          }
          ListFooterComponent={
            <>
              {list.error ? <Text style={styles.errorText}>{list.error}</Text> : null}
              <LoadMoreButton
                shown={list.items.length}
                total={list.total}
                hasMore={list.hasMore}
                isLoading={list.isLoadingMore}
                onPress={list.loadMore}
              />
            </>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppPalette.void,
    padding: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    color: AppPalette.text,
  },
  addButton: {
    backgroundColor: AppPalette.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  addButtonText: {
    color: AppPalette.void,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: AppPalette.accent,
    marginTop: 40,
  },
  errorText: {
    textAlign: 'center',
    color: AppPalette.danger,
    marginBottom: 8,
  },
});
