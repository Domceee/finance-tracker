import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getTransactions, Transaction } from '@/lib/api'; 

export default function TransactionsScreen() {
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
    }, [loadTransactions])
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FEFAE0" />
      </View>
    )
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
          <Pressable style={styles.card}>
            <View>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSubtitle}>
                {item.category} • {new Date(item.date).toLocaleDateString()}
              </Text>
            </View>

            <Text style={item.amount >= 0 ? styles.income : styles.expense}>
              {item.amount >= 0 ? '+' : '-'}€{Math.abs(item.amount).toFixed(2)}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No transactions yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C0C78C',
    padding: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#B99470',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FEFAE0',
  },
  addButton: {
    backgroundColor: '#B99470',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#FEFAE0',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FEFAE0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B99470',
  },
  itemSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#B99470',
  },
  income: {
    color: '#2e7d32',
    fontWeight: '700',
    fontSize: 16,
  },
  expense: {
    color: '#c62828',
    fontWeight: '700',
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#B99470',
    marginTop: 40,
  },
});