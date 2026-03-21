import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';

const recentTransactions = [
  { id: '1', title: 'Groceries', amount: -30.54, date: 'Today' },
  { id: '2', title: 'Salary', amount: 780, date: 'Yesterday' },
  { id: '3', title: 'Dorm', amount: -110, date: '2 days ago' },
];

const budgetCategories = [
  { id: '1', title: 'Food', amount: 50, limit: 150 },
  { id: '2', title: 'Rent', amount: 110, limit: 110 },
  { id: '3', title: 'Entertainment', amount: 30, limit: 100 },
];

export default function DashboardScreen() {
  const totalBalance = 1240.5;
  const income = 1000;
  const expenses = 540.5;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.titleContainer}>
        <Text style={styles.greeting}>Hello, Dominykas</Text>
        <Text style={styles.subtitle}>March overview</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceTitle}>Total Balance</Text>
        <Text style={styles.balanceAmount}>€{totalBalance.toFixed(2)}</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.smallCard, styles.cardSpacing]}>
          <Text style={styles.balanceTitle}>Income</Text>
          <Text style={styles.incomeText}>€{income.toFixed(2)}</Text>
        </View>

        <View style={styles.smallCard}>
          <Text style={styles.balanceTitle}>Expenses</Text>
          <Text style={styles.expenseText}>€{expenses.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Pressable style={[styles.actionButton, styles.cardSpacing]}>
          <Text style={styles.actionButtonText}>Add Income</Text>
        </Pressable>

        <Pressable style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Add Expense</Text>
        </Pressable> 
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      <View style={styles.sectionCard}>
        {recentTransactions.map((transaction) => (
          <View key={transaction.id} style={styles.listItem}>
            <View>
              <Text style={styles.listTitle}>{transaction.title}</Text>
              <Text style={styles.listDate}>{transaction.date}</Text>
            </View>
            <Text
              style={
                transaction.amount >= 0 ? styles.incomeText : styles.expenseText
              }>
                {transaction.amount >= 0 ? '+' : '-'}€
                {Math.abs(transaction.amount).toFixed(2)}
              </Text>
          </View>
        ))};
      </View>

      <Text style={styles.sectionTitle}>Budget Status</Text>
      <View style={styles.sectionCard}>
        {budgetCategories.map((budget) => (
          <View key={budget.id} style={styles.budgetItem}>
            <View style={styles.budgetHeader}>
              <Text style={styles.listTitle}>{budget.title}</Text>
              <Text style={styles.listDate}>
                €{budget.amount} / €{budget.limit}
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
  )
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
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    color: '#B99470',
  },
  subtitle: {
    fontSize: 16,
    color: '#B99470',
    marginTop: 4,
    marginBottom: 20,
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
  actionButton: {
    flex: 1,
    backgroundColor: '#B99470',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 15,
    color: '#FEFAE0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
    color: '#B99470',
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
});