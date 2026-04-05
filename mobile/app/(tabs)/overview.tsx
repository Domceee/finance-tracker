import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppPalette } from '../../constants/theme';
import {
  getOverview,
  Overview,
  OverviewCategoryBreakdown,
  TransactionCategory,
} from '../../lib/api';

const CHART_COLORS: Record<TransactionCategory, string> = {
  FOOD: '#A78BFA',
  SHOPPING: '#F472B6',
  RENT: '#60A5FA',
  TRANSPORT: '#34D399',
  SALARY: '#8BE9A8',
  ENTERTAINMENT: '#F59E0B',
  BAR: '#FB7185',
  EATOUT: '#22D3EE',
  OTHER: '#94A3B8',
};

type MonthSelection = {
  year: number;
  month: number;
};

function getCurrentMonthSelection(): MonthSelection {
  const now = new Date();

  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
  };
}

function getPreviousMonth(selection: MonthSelection): MonthSelection {
  if (selection.month === 1) {
    return { year: selection.year - 1, month: 12 };
  }

  return { year: selection.year, month: selection.month - 1 };
}

function getNextMonth(selection: MonthSelection): MonthSelection {
  if (selection.month === 12) {
    return { year: selection.year + 1, month: 1 };
  }

  return { year: selection.year, month: selection.month + 1 };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCategoryLabel(category: TransactionCategory) {
  switch (category) {
    case 'EATOUT':
      return 'Eat Out';
    default:
      return category.charAt(0) + category.slice(1).toLowerCase();
  }
}

function getMonthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeSlice(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function SpendingPieChart({ data }: { data: OverviewCategoryBreakdown[] }) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const size = 188;
  const radius = 78;
  const center = size / 2;

  if (total <= 0) {
    return null;
  }

  let currentAngle = 0;

  return (
    <View style={styles.chartWrapper}>
      <Svg width={size} height={size}>
        {data.length === 1 ? (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill={CHART_COLORS[data[0].category]}
          />
        ) : (
          data.map((item) => {
            const sliceAngle = (item.amount / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + sliceAngle;
            currentAngle = endAngle;

            return (
              <Path
                key={item.category}
                d={describeSlice(center, center, radius, startAngle, endAngle)}
                fill={CHART_COLORS[item.category]}
                stroke={AppPalette.surface}
                strokeWidth={2}
              />
            );
          })
        )}

        <Circle
          cx={center}
          cy={center}
          r={36}
          fill={AppPalette.surface}
          stroke={AppPalette.elevated}
          strokeWidth={1}
        />
      </Svg>

      <View style={styles.chartCenterLabel}>
        <Text style={styles.chartCenterValue}>{data.length}</Text>
        <Text style={styles.chartCenterText}>categories</Text>
      </View>
    </View>
  );
}

export default function OverviewScreen() {
  const isFocused = useIsFocused();
  const currentMonth = getCurrentMonthSelection();
  const [selectedMonth, setSelectedMonth] = useState<MonthSelection>(currentMonth);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      setIsLoading(true);

      try {
        const data = await getOverview(selectedMonth.year, selectedMonth.month);
        setOverview(data);
      } catch (error) {
        console.error('Failed to load overview', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (isFocused) {
      loadOverview();
    }
  }, [isFocused, selectedMonth.month, selectedMonth.year]);

  const monthLabel = overview
    ? getMonthLabel(overview.year, overview.month)
    : getMonthLabel(selectedMonth.year, selectedMonth.month);
  const categoryData = overview?.categoryBreakdown ?? [];
  const income = overview?.incomeTotal ?? 0;
  const spent = overview?.spentTotal ?? 0;
  const left = overview?.leftTotal ?? 0;
  const isViewingCurrentMonth =
    selectedMonth.year === currentMonth.year && selectedMonth.month === currentMonth.month;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Overview</Text>

      <View style={styles.monthSwitcher}>
        <Pressable
          style={styles.monthButton}
          onPress={() => setSelectedMonth((current) => getPreviousMonth(current))}>
          <Text style={styles.monthButtonText}>Prev</Text>
        </Pressable>

        <Text style={styles.subtitle}>{monthLabel} summary</Text>

        <Pressable
          style={[styles.monthButton, isViewingCurrentMonth && styles.monthButtonDisabled]}
          disabled={isViewingCurrentMonth}
          onPress={() => setSelectedMonth((current) => getNextMonth(current))}>
          <Text
            style={[
              styles.monthButtonText,
              isViewingCurrentMonth && styles.monthButtonTextDisabled,
            ]}>
            Next
          </Text>
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Income</Text>
          <Text style={styles.incomeText}>{formatCurrency(income)}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Spent</Text>
          <Text style={styles.expenseText}>{formatCurrency(spent)}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.cardLabel}>Left</Text>
          <Text style={styles.leftText}>{formatCurrency(left)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Spending Breakdown</Text>
      <View style={styles.sectionCard}>
        {isLoading ? (
          <ActivityIndicator size="large" color={AppPalette.accent} />
        ) : categoryData.length === 0 ? (
          <Text style={styles.emptyText}>No expense transactions for this month.</Text>
        ) : (
          <>
            <SpendingPieChart data={categoryData} />

            {categoryData.map((item) => (
              <View key={item.category} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <View
                    style={[
                      styles.categorySwatch,
                      { backgroundColor: CHART_COLORS[item.category] },
                    ]}
                  />
                  <View>
                    <Text style={styles.categoryName}>{formatCategoryLabel(item.category)}</Text>
                    <Text style={styles.categoryPercent}>{item.percentage}% of total</Text>
                  </View>
                </View>
                <Text style={styles.categoryAmount}>{formatCurrency(item.amount)}</Text>
              </View>
            ))}
          </>
        )}
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
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  monthButton: {
    minWidth: 62,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: AppPalette.surface,
    borderWidth: 1,
    borderColor: AppPalette.muted,
    alignItems: 'center',
  },
  monthButtonDisabled: {
    opacity: 0.45,
  },
  monthButtonText: {
    color: AppPalette.text,
    fontWeight: '700',
  },
  monthButtonTextDisabled: {
    color: AppPalette.muted,
  },
  subtitle: {
    flex: 1,
    fontSize: 16,
    color: AppPalette.accent,
    textAlign: 'center',
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
  chartWrapper: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartCenterLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  chartCenterValue: {
    fontSize: 22,
    fontWeight: '700',
    color: AppPalette.text,
  },
  chartCenterText: {
    fontSize: 12,
    color: AppPalette.accent,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppPalette.elevated,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categorySwatch: {
    width: 12,
    height: 12,
    borderRadius: 999,
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
  emptyText: {
    color: AppPalette.accent,
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
