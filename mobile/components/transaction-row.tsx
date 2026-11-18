import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Transaction } from '../lib/api';
import { formatCategoryLabel } from '../lib/format';
import { useCurrency } from '../providers/currency-provider';
import { AppPalette } from '../constants/theme';

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const { formatCurrency } = useCurrency();
  const isIncome = transaction.type === 'income';

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: String(transaction.id) } })}>
      <View style={styles.text}>
        <Text style={styles.title}>{transaction.title}</Text>
        <Text style={styles.subtitle}>
          {formatCategoryLabel(transaction.category)} • {new Date(transaction.date).toLocaleDateString()}
        </Text>
      </View>
      <Text style={isIncome ? styles.income : styles.expense}>
        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  text: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: AppPalette.text,
  },
  subtitle: {
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
});
