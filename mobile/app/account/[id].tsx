import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  getAccount,
  getAccountTransactions,
  type Account,
  type Transaction,
} from '../../lib/api';
import { formatAccountType, formatCategoryLabel } from '../../lib/format';
import { useCurrency } from '../../providers/currency-provider';
import { AccountModal } from '../../components/account-modal';
import { AppPalette } from '../../constants/theme';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Number(id);
  const { formatCurrency } = useCurrency();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    setError('');

    try {
      setIsLoading(true);
      const [accountData, transactionData] = await Promise.all([
        getAccount(accountId),
        getAccountTransactions(accountId),
      ]);
      setAccount(accountData);
      setTransactions(transactionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account');
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

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
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.accountType}>{formatAccountType(account.type)}</Text>
            <Text style={styles.accountName}>{account.name}</Text>
            <Text style={account.balance < 0 ? styles.balanceNegative : styles.balance}>
              {formatCurrency(account.balance)}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Transactions in this account</Text>

          <FlatList
            data={transactions}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: String(item.id) } })}>
                <View style={styles.cardText}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSubtitle}>
                    {formatCategoryLabel(item.category)} • {new Date(item.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={item.type === 'income' ? styles.income : styles.expense}>
                  {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No transactions in this account yet.</Text>
            }
          />
        </>
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
    fontWeight: '700',
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
    fontWeight: '700',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: AppPalette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#211C33',
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppPalette.text,
  },
  itemSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: AppPalette.accent,
  },
  income: {
    color: AppPalette.success,
    fontWeight: '700',
    fontSize: 16,
  },
  expense: {
    color: AppPalette.danger,
    fontWeight: '700',
    fontSize: 16,
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
