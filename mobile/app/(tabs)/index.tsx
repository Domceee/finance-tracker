import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { getTransactions, Transaction } from '../../lib/api';
import { useAuth } from '../../providers/auth-provider';

const budgetCategories = [
  { id: '1', title: 'Food', amount: 50, limit: 150 },
  { id: '2', title: 'Rent', amount: 110, limit: 110 },
  { id: '3', title: 'Entertainment', amount: 30, limit: 100 },
];

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const isFocused = useIsFocused();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTransactions() {
      setIsLoading(true);

      try {
        const data = await getTransactions();
        setTransactions(data);
      } catch (error) {
        console.error('Failed to load transactions', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (isFocused) {
      loadTransactions();
    }
  }, [isFocused]);

  const totalBalance = transactions.reduce((sum, transaction) => {
    return transaction.type === 'income'
      ? sum + transaction.amount
      : sum - transaction.amount;
  }, 0);

  const income = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expenses = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.titleContainer}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Hello, {user?.name ?? user?.email ?? 'there'}</Text>
            <Text style={styles.subtitle}>Your finance overview</Text>
          </View>

          <Pressable style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceTitle}>Total Balance</Text>
        <Text style={styles.balanceAmount}>EUR {totalBalance.toFixed(2)}</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.smallCard, styles.cardSpacing]}>
          <Text style={styles.balanceTitle}>Income</Text>
          <Text style={styles.incomeText}>EUR {income.toFixed(2)}</Text>
        </View>

        <View style={styles.smallCard}>
          <Text style={styles.balanceTitle}>Expenses</Text>
          <Text style={styles.expenseText}>EUR {expenses.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      <View style={styles.sectionCard}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#B99470" />
        ) : transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet.</Text>
        ) : (
          transactions.slice(0, 5).map((transaction) => (
            <View key={transaction.id} style={styles.listItem}>
              <View>
                <Text style={styles.listTitle}>{transaction.title}</Text>
                <Text style={styles.listDate}>
                  {new Date(transaction.date).toLocaleDateString()}
                </Text>
              </View>
              <Text
                style={
                  transaction.type === 'income' ? styles.incomeText : styles.expenseText
                }>
                {transaction.type === 'income' ? '+' : '-'}EUR
                {Math.abs(transaction.amount).toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>Budget Status</Text>
      <View style={styles.sectionCard}>
        {budgetCategories.map((budget) => (
          <View key={budget.id} style={styles.budgetItem}>
            <View style={styles.budgetHeader}>
              <Text style={styles.listTitle}>{budget.title}</Text>
              <Text style={styles.listDate}>
                EUR {budget.amount} / EUR {budget.limit}
              </Text>
            </View>

            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${(budget.amount / budget.limit) * 100}%` },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C0C78C',
  },
  titleContainer: {
    backgroundColor: '#FEFAE0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#B99470',
  },
  subtitle: {
    fontSize: 16,
    color: '#B99470',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#B99470',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoutButtonText: {
    color: '#FEFAE0',
    fontWeight: '700',
  },
  balanceCard: {
    backgroundColor: '#FEFAE0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  balanceTitle: {
    fontSize: 14,
    color: '#B99470',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 30,
    fontWeight: '700',
    color: '#B99470',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  smallCard: {
    flex: 1,
    backgroundColor: '#FEFAE0',
    borderRadius: 16,
    padding: 16,
  },
  cardSpacing: {
    marginRight: 12,
  },
  incomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
  },
  expenseText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F44336',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
    color: '#FEFAE0',
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#FEFAE0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#B99470',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B99470',
  },
  listDate: {
    fontSize: 13,
    color: '#B99470',
    marginTop: 4,
  },
  budgetItem: {
    marginBottom: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#B99470',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 999,
  },
  emptyText: {
    textAlign: 'center',
    color: '#B99470',
    fontSize: 16,
    paddingVertical: 12,
  },
});
