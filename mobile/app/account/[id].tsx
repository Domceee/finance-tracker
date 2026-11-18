import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { getAccount, getAccountTransactionPage, PAGE_SIZE, type Account } from '../../lib/api';
import { formatAccountType } from '../../lib/format';
import { useCurrency } from '../../providers/currency-provider';
import { usePagedList } from '../../hooks/use-paged-list';
import { AccountModal } from '../../components/account-modal';
import { FadeInItem } from '../../components/fade-in-item';
import { LoadMoreButton } from '../../components/load-more-button';
import { TransactionRow } from '../../components/transaction-row';
import { AppPalette } from '../../constants/theme';
import { FontFamily } from '../../constants/fonts';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Number(id);
  const { formatCurrency } = useCurrency();
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const fetchPage = useCallback((page: number) => getAccountTransactionPage(accountId, page), [accountId]);
  const transactions = usePagedList(fetchPage);
  const { reload } = transactions;

  const loadData = useCallback(async () => {
    setError('');

    try {
      setIsLoading(true);
      setAccount(await getAccount(accountId));
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account');
    } finally {
      setIsLoading(false);
    }
  }, [accountId, reload]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        {account ? (
          <Pressable style={styles.editButton} onPress={() => setIsModalVisible(true)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {isLoading && !account ? (
        <ActivityIndicator size="large" color={AppPalette.accent} />
      ) : account ? (
        <FlatList
          data={transactions.items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <View style={styles.summaryCard}>
                <Text style={styles.accountType}>{formatAccountType(account.type)}</Text>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={account.balance < 0 ? styles.balanceNegative : styles.balance}>
                  {formatCurrency(account.balance)}
                </Text>
              </View>
              <Text style={styles.sectionTitle}>Transactions in this account</Text>
            </>
          }
          renderItem={({ item, index }) => (
            <FadeInItem index={index % PAGE_SIZE}>
              <TransactionRow transaction={item} />
            </FadeInItem>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No transactions in this account yet.</Text>}
          ListFooterComponent={
            <>
              {transactions.error ? <Text style={styles.errorText}>{transactions.error}</Text> : null}
              <LoadMoreButton
                shown={transactions.items.length}
                total={transactions.total}
                hasMore={transactions.hasMore}
                isLoading={transactions.isLoadingMore}
                onPress={transactions.loadMore}
              />
            </>
          }
        />
      ) : null}

      <AccountModal
        visible={isModalVisible}
        account={account}
        onClose={() => setIsModalVisible(false)}
        onSaved={(saved) => setAccount(saved)}
        onDeleted={() => router.back()}
      />
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
  backText: {
    color: AppPalette.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    borderWidth: 1,
    borderColor: AppPalette.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  editButtonText: {
    color: AppPalette.accent,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: AppPalette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#211C33',
    padding: 20,
    marginBottom: 20,
  },
  accountType: {
    color: AppPalette.accent,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountName: {
    color: AppPalette.text,
    fontSize: 24,
    fontFamily: FontFamily.bold,
    marginBottom: 12,
  },
  balance: {
    color: AppPalette.success,
    fontSize: 28,
    fontWeight: '700',
  },
  balanceNegative: {
    color: AppPalette.danger,
    fontSize: 28,
    fontWeight: '700',
  },
  sectionTitle: {
    color: AppPalette.text,
    fontSize: 18,
    fontFamily: FontFamily.bold,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  errorText: {
    color: AppPalette.danger,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: AppPalette.accent,
    marginTop: 24,
  },
});
