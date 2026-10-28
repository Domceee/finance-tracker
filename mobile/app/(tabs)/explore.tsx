import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getTransactions, Transaction } from '@/lib/api';
import { formatCategoryLabel } from '@/lib/format';
import { useCurrency } from '../../providers/currency-provider';
import { AppPalette } from '../../constants/theme';

export default function TransactionsScreen() {
  const { formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getTransactions();
      setTransactions(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions]),
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={AppPalette.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Pressable style={styles.addButton} onPress={() => router.push('/add-transaction')}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: String(item.id) } })}>
            <View>
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
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions yet.</Text>}
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
  emptyText: {
    textAlign: 'center',
    color: AppPalette.accent,
    marginTop: 40,
  },
});
