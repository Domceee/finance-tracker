import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getAccounts, type Account } from '../../lib/api';
import { formatAccountType } from '../../lib/format';
import { useCurrency } from '../../providers/currency-provider';
import { AccountModal } from '../../components/account-modal';
import { AppPalette } from '../../constants/theme';

export default function AccountsScreen() {
  const { formatCurrency } = useCurrency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const loadAccounts = useCallback(async () => {
    setError('');

    try {
      setIsLoading(true);
      setAccounts(await getAccounts());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [loadAccounts]),
  );

  const total = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Accounts</Text>
        <Pressable style={styles.addButton} onPress={() => setIsModalVisible(true)}>
          <Text style={styles.addButtonText}>+ New</Text>
        </Pressable>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>All accounts</Text>
        <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {isLoading ? (
        <ActivityIndicator size="large" color={AppPalette.accent} />
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push({ pathname: '/account/[id]', params: { id: String(item.id) } })}>
              <View>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemSubtitle}>{formatAccountType(item.type)}</Text>
              </View>
              <Text style={item.balance < 0 ? styles.negative : styles.positive}>
                {formatCurrency(item.balance)}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No accounts yet. Tap + New to add one.</Text>
          }
        />
      )}

      <AccountModal
        visible={isModalVisible}
        account={null}
        onClose={() => setIsModalVisible(false)}
        onSaved={(saved) => setAccounts((prev) => [...prev, saved])}
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
  title: {
    fontSize: 28,
    fontWeight: '700',
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
  totalCard: {
    backgroundColor: AppPalette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#211C33',
    padding: 20,
    marginBottom: 16,
  },
  totalLabel: {
    color: AppPalette.accent,
    fontSize: 14,
    marginBottom: 6,
  },
  totalAmount: {
    color: AppPalette.text,
    fontSize: 28,
    fontWeight: '700',
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
  positive: {
    color: AppPalette.success,
    fontWeight: '700',
    fontSize: 16,
  },
  negative: {
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
    marginTop: 40,
  },
});
