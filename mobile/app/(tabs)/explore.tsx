import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';

const transactions = [
  { id: '1', title: 'Groceries', category: 'Food', amount: -24.5, date: '2026-03-20' },
  { id: '2', title: 'Salary', category: 'Income', amount: 1200, date: '2026-03-18' },
  { id: '3', title: 'Coffee', category: 'Food', amount: -3.2, date: '2026-03-18' },
  { id: '4', title: 'Bus ticket', category: 'Transport', amount: -1.5, date: '2026-03-17' },
];

export default function TransactionsScreen() {
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
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <View>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSubtitle}>
                {item.category} • {item.date}
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