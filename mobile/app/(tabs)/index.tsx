import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { getTransactions, Transaction } from '../../lib/api';
import { useAuth } from '../../providers/auth-provider';
import { AppPalette } from '../../constants/theme';

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
          <ActivityIndicator size="large" color={AppPalette.accent} />
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
    backgroundColor: AppPalette.void,
  },
  titleContainer: {
    backgroundColor: AppPalette.surface,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#211C33',
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
    color: AppPalette.text,
  },
  subtitle: {
    fontSize: 16,
    color: AppPalette.accent,
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: AppPalette.elevated,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: AppPalette.muted,
  },
  logoutButtonText: {
    color: AppPalette.text,
    fontWeight: '700',
  },
  balanceCard: {
    backgroundColor: AppPalette.surface,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#211C33',
  },
  balanceTitle: {
    fontSize: 14,
    color: AppPalette.accent,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 30,
    fontWeight: '700',
    color: AppPalette.text,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  smallCard: {
    flex: 1,
    backgroundColor: AppPalette.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#211C33',
  },
  cardSpacing: {
    marginRight: 12,
  },
  incomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: AppPalette.success,
  },
  expenseText: {
    fontSize: 20,
    fontWeight: '700',
    color: AppPalette.danger,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
    color: AppPalette.text,
    textAlign: 'left',
  },
  sectionCard: {
    backgroundColor: AppPalette.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#211C33',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppPalette.elevated,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppPalette.text,
  },
  listDate: {
    fontSize: 13,
    color: AppPalette.accent,
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
    backgroundColor: AppPalette.elevated,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: AppPalette.accent,
    borderRadius: 999,
  },
  emptyText: {
    textAlign: 'center',
    color: AppPalette.accent,
    fontSize: 16,
    paddingVertical: 12,
  },
});
