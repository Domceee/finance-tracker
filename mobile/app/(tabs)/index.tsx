import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  getTransactions,
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  Transaction,
  Budget,
  EXPENSE_TRANSACTION_CATEGORIES,
  TransactionCategory,
} from '../../lib/api';
import { formatCategoryLabel } from '../../lib/format';
import { useAuth } from '../../providers/auth-provider';
import { useCurrency } from '../../providers/currency-provider';
import { AppPalette } from '../../constants/theme';

function progressColor(spent: number, limit: number) {
  const pct = limit > 0 ? spent / limit : 0;
  if (pct >= 1) return AppPalette.danger;
  if (pct >= 0.75) return '#F59E0B';
  return AppPalette.accent;
}

function BudgetModal({
  visible,
  budget,
  onClose,
  onSaved,
  onDeleted,
}: {
  visible: boolean;
  budget: Budget | null;
  onClose: () => void;
  onSaved: (b: Budget) => void;
  onDeleted?: (id: number) => void;
}) {
  const { currency, formatCurrency } = useCurrency();
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<TransactionCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName(budget?.name ?? '');
      setLimit(budget ? String(budget.limitAmount) : '');
      setSelectedCategories(budget?.categories ?? []);
      setError('');
    }
  }, [visible, budget]);

  function toggleCategory(cat: TransactionCategory) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  async function handleSave() {
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    const limitNum = Number(limit);
    if (!limit || isNaN(limitNum) || limitNum <= 0) {
      setError('Limit must be a positive number');
      return;
    }

    if (selectedCategories.length === 0) {
      setError('Select at least one category');
      return;
    }

    setIsLoading(true);

    try {
      const input = { name: name.trim(), limitAmount: limitNum, categories: selectedCategories };
      const saved = budget
        ? await updateBudget(budget.id, input)
        : await createBudget(input);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budget');
    } finally {
      setIsLoading(false);
    }
  }

  function handleDelete() {
    if (!budget) return;

    Alert.alert('Delete Budget', `Delete "${budget.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBudget(budget.id);
            onDeleted?.(budget.id);
            onClose();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete budget');
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{budget ? 'Edit Budget' : 'Create Budget'}</Text>

          <TextInput
            style={styles.input}
            placeholder="Budget name"
            placeholderTextColor={AppPalette.muted}
            value={name}
            onChangeText={setName}
          />

          <View style={styles.amountRow}>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyBadgeText}>{currency}</Text>
            </View>
            <TextInput
              style={styles.amountInput}
              placeholder="Monthly limit"
              placeholderTextColor={AppPalette.muted}
              value={limit}
              onChangeText={setLimit}
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.categoryLabel}>Categories</Text>
          <View style={styles.categoryGrid}>
            {EXPENSE_TRANSACTION_CATEGORIES.map((cat) => {
              const selected = selectedCategories.includes(cat);
              return (
                <Pressable
                  key={cat}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                  onPress={() => toggleCategory(cat)}>
                  <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                    {formatCategoryLabel(cat)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isLoading}>
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Saving...' : 'Save Budget'}
            </Text>
          </Pressable>

          {budget && (
            <Pressable style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete Budget</Text>
            </Pressable>
          )}

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const isFocused = useIsFocused();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  useEffect(() => {
    if (!isFocused) return;

    async function loadData() {
      setIsLoading(true);

      try {
        const [txData, budgetData] = await Promise.all([getTransactions(), getBudgets()]);
        setTransactions(txData);
        setBudgets(budgetData);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [isFocused]);

  const totalBalance = transactions.reduce(
    (sum, t) => (t.type === 'income' ? sum + t.amount : sum - t.amount),
    0,
  );
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  function openCreate() {
    setEditingBudget(null);
    setModalVisible(true);
  }

  function openEdit(budget: Budget) {
    setEditingBudget(budget);
    setModalVisible(true);
  }

  function handleSaved(saved: Budget) {
    setBudgets((prev) => {
      const idx = prev.findIndex((b) => b.id === saved.id);
      return idx >= 0 ? prev.map((b) => (b.id === saved.id ? saved : b)) : [...prev, saved];
    });
  }

  function handleDeleted(id: number) {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }

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
        <Text style={styles.balanceAmount}>{formatCurrency(totalBalance)}</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.smallCard, styles.cardSpacing]}>
          <Text style={styles.balanceTitle}>Income</Text>
          <Text style={styles.incomeText}>{formatCurrency(income)}</Text>
        </View>

        <View style={styles.smallCard}>
          <Text style={styles.balanceTitle}>Expenses</Text>
          <Text style={styles.expenseText}>{formatCurrency(expenses)}</Text>
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
              <Text style={transaction.type === 'income' ? styles.incomeText : styles.expenseText}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Budgets</Text>
        <Pressable style={styles.addBudgetButton} onPress={openCreate}>
          <Text style={styles.addBudgetButtonText}>+ New</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.sectionCard}>
          <ActivityIndicator size="large" color={AppPalette.accent} />
        </View>
      ) : budgets.length === 0 ? (
        <Pressable style={styles.emptyBudgetCard} onPress={openCreate}>
          <Text style={styles.emptyBudgetTitle}>No budgets yet</Text>
          <Text style={styles.emptyBudgetSub}>Tap to create your first budget</Text>
        </Pressable>
      ) : (
        <View style={styles.sectionCard}>
          {budgets.map((budget, index) => {
            const pct = budget.limitAmount > 0 ? budget.spent / budget.limitAmount : 0;
            const fillColor = progressColor(budget.spent, budget.limitAmount);
            const isLast = index === budgets.length - 1;

            return (
              <Pressable
                key={budget.id}
                style={[styles.budgetItem, !isLast && styles.budgetItemBorder]}
                onPress={() => openEdit(budget)}>
                <View style={styles.budgetHeader}>
                  <Text style={styles.listTitle}>{budget.name}</Text>
                  <Text style={[styles.budgetAmount, pct >= 1 && styles.budgetAmountOver]}>
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.limitAmount)}
                  </Text>
                </View>

                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(pct * 100, 100)}%`, backgroundColor: fillColor },
                    ]}
                  />
                </View>

                <Text style={styles.budgetCategories}>
                  {budget.categories.map(formatCategoryLabel).join(' · ')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <BudgetModal
        visible={modalVisible}
        budget={editingBudget}
        onClose={() => setModalVisible(false)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppPalette.text,
  },
  addBudgetButton: {
    backgroundColor: AppPalette.accent,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  addBudgetButtonText: {
    color: AppPalette.void,
    fontWeight: '700',
    fontSize: 13,
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
    paddingVertical: 14,
  },
  budgetItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: AppPalette.elevated,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetAmount: {
    fontSize: 13,
    color: AppPalette.accent,
  },
  budgetAmountOver: {
    color: AppPalette.danger,
  },
  budgetCategories: {
    fontSize: 12,
    color: AppPalette.muted,
    marginTop: 6,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: AppPalette.elevated,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  emptyBudgetCard: {
    backgroundColor: AppPalette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#211C33',
    borderStyle: 'dashed',
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyBudgetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppPalette.text,
    marginBottom: 6,
  },
  emptyBudgetSub: {
    fontSize: 13,
    color: AppPalette.muted,
  },
  emptyText: {
    textAlign: 'center',
    color: AppPalette.accent,
    fontSize: 16,
    paddingVertical: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: AppPalette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#211C33',
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppPalette.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: AppPalette.muted,
    backgroundColor: AppPalette.elevated,
    color: AppPalette.text,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppPalette.elevated,
    borderColor: AppPalette.muted,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  currencyBadge: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: AppPalette.muted,
  },
  currencyBadgeText: {
    color: AppPalette.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  amountInput: {
    flex: 1,
    padding: 14,
    color: AppPalette.text,
  },
  categoryLabel: {
    color: AppPalette.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppPalette.muted,
    backgroundColor: AppPalette.elevated,
  },
  categoryChipSelected: {
    backgroundColor: AppPalette.accent,
    borderColor: AppPalette.accent,
  },
  categoryChipText: {
    color: AppPalette.muted,
    fontWeight: '600',
    fontSize: 13,
  },
  categoryChipTextSelected: {
    color: AppPalette.void,
  },
  errorText: {
    color: AppPalette.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: AppPalette.accent,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: AppPalette.void,
    fontWeight: '700',
    fontSize: 15,
  },
  deleteButton: {
    padding: 14,
    alignItems: 'center',
    marginBottom: 4,
  },
  deleteButtonText: {
    color: AppPalette.danger,
    fontWeight: '600',
    fontSize: 15,
  },
  cancelButton: {
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: AppPalette.muted,
    fontWeight: '600',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
