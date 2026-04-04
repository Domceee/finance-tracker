import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppPalette } from '../../constants/theme';

const categoryData = [
  { id: '1', name: 'Food', amount: 220, percent: 22 },
  { id: '2', name: 'Rent', amount: 400, percent: 40 },
  { id: '3', name: 'Transport', amount: 80, percent: 8 },
  { id: '4', name: 'Entertainment', amount: 100, percent: 10 },
  { id: '5', name: 'Left / Unspent', amount: 200, percent: 20 },
];

const insights = [
  'Food is your biggest flexible spending category.',
  'You can spend about €10/day for the rest of the month.',
  'Entertainment spending is slightly above your average.',
];

export default function OverviewScreen() {
  const income = 1000;
  const spent = 800;
  const left = 200;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Overview</Text>
      <Text style={styles.subtitle}>March summary</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Income</Text>
          <Text style={styles.incomeText}>€{income}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Spent</Text>
          <Text style={styles.expenseText}>€{spent}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Left</Text>
          <Text style={styles.leftText}>€{left}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Spending Breakdown</Text>
      <View style={styles.sectionCard}>
        {categoryData.map((item) => (
          <View key={item.id} style={styles.categoryRow}>
            <View>
              <Text style={styles.categoryName}>{item.name}</Text>
              <Text style={styles.categoryPercent}>{item.percent}% of total</Text>
            </View>
            <Text style={styles.categoryAmount}>€{item.amount}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Budget Insight</Text>
      <View style={styles.highlightCard}>
        <Text style={styles.highlightLabel}>Unspent This Month</Text>
        <Text style={styles.highlightAmount}>€{left}</Text>
        <Text style={styles.highlightText}>
          You still have room to spend, but keeping this amount unspent improves savings.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Recommendations</Text>
      <View style={styles.sectionCard}>
        {insights.map((item, index) => (
          <View key={index} style={styles.insightItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.insightText}>{item}</Text>
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
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 20,
    color: AppPalette.text,
  },
  subtitle: {
    fontSize: 16,
    color: AppPalette.accent,
    marginTop: 4,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: AppPalette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#211C33',
    padding: 14,
  },
  cardLabel: {
    fontSize: 13,
    color: AppPalette.accent,
    marginBottom: 8,
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
  leftText: {
    fontSize: 20,
    fontWeight: '700',
    color: AppPalette.text,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
    color: AppPalette.text,
  },
  sectionCard: {
    backgroundColor: AppPalette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#211C33',
    padding: 16,
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppPalette.elevated,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppPalette.text,
  },
  categoryPercent: {
    fontSize: 13,
    color: AppPalette.accent,
    marginTop: 4,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: AppPalette.text,
  },
  highlightCard: {
    backgroundColor: AppPalette.elevated,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppPalette.muted,
  },
  highlightLabel: {
    fontSize: 14,
    color: AppPalette.accent,
    marginBottom: 8,
  },
  highlightAmount: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
    color: AppPalette.text,
  },
  highlightText: {
    fontSize: 14,
    color: AppPalette.text,
    lineHeight: 20,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bullet: {
    fontSize: 18,
    marginRight: 8,
    lineHeight: 20,
    color: AppPalette.accent,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: AppPalette.text,
    lineHeight: 20,
  },
});
