import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { EXPENSE_TRANSACTION_CATEGORIES } from '../lib/api';
import { formatCategoryLabel } from '../lib/format';
import {
  EMPTY_TRANSACTION_FILTERS,
  hasActiveFilters,
  type TransactionFilters,
  type TransactionTypeFilter,
} from '../lib/transaction-filters';
import { FilterChip } from './filter-chip';
import { AppPalette } from '../constants/theme';

const TYPE_OPTIONS: { label: string; value: TransactionTypeFilter }[] = [
  { label: 'All', value: null },
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
];

export function TransactionFilterBar({
  filters,
  onChange,
}: {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}) {
  const showCategories = filters.type !== 'income';

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search by title"
        placeholderTextColor={AppPalette.muted}
        value={filters.search}
        onChangeText={(search) => onChange({ ...filters, search })}
        autoCorrect={false}
        returnKeyType="search"
      />

      <View style={styles.row}>
        {TYPE_OPTIONS.map((option) => (
          <FilterChip
            key={option.label}
            label={option.label}
            active={filters.type === option.value}
            onPress={() =>
              onChange({
                ...filters,
                type: option.value,
                category: option.value === 'income' ? null : filters.category,
              })
            }
          />
        ))}
        {hasActiveFilters(filters) ? (
          <Pressable style={styles.clear} onPress={() => onChange(EMPTY_TRANSACTION_FILTERS)}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {showCategories ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          <FilterChip
            label="Any category"
            active={filters.category === null}
            onPress={() => onChange({ ...filters, category: null })}
          />
          {EXPENSE_TRANSACTION_CATEGORIES.map((category) => (
            <FilterChip
              key={category}
              label={formatCategoryLabel(category)}
              active={filters.category === category}
              onPress={() => onChange({ ...filters, category })}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 16,
  },
  search: {
    backgroundColor: AppPalette.surface,
    borderColor: AppPalette.muted,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: AppPalette.text,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  categories: {
    gap: 8,
    paddingRight: 8,
  },
  clear: {
    marginLeft: 'auto',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  clearText: {
    color: AppPalette.danger,
    fontWeight: '600',
  },
});
