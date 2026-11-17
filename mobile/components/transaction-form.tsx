import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAccounts, type Account, type Transaction, type TransactionCategory, type TransactionInput } from '../lib/api';
import { atNoon } from '../lib/dates';
import { useCurrency } from '../providers/currency-provider';
import { AccountPicker } from './account-picker';
import { CategoryPicker } from './category-picker';
import { DateInput } from './date-input';
import { AppPalette } from '../constants/theme';

type TransactionType = TransactionInput['type'];

export function TransactionForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Transaction;
  submitLabel: string;
  onSubmit: (input: TransactionInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const { currency, toEur, fromEur } = useCurrency();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [amount, setAmount] = useState(initial ? fromEur(initial.amount).toFixed(2) : '');
  const [type, setType] = useState<TransactionType>(initial?.type === 'income' ? 'income' : 'expense');
  const [category, setCategory] = useState<TransactionCategory>(initial?.category ?? 'OTHER');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(() => (initial ? new Date(initial.date) : atNoon(new Date())));
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<number | null>(initial?.accountId ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAccounts()
      .then((data) => {
        setAccounts(data);
        setAccountId((current) => current ?? data[0]?.id ?? null);
      })
      .catch(() => setError('Failed to load accounts'));
  }, []);

  function selectType(next: TransactionType) {
    setType(next);

    if (next === 'income') {
      setCategory('SALARY');
    } else if (category === 'SALARY') {
      setCategory('OTHER');
    }
  }

  async function handleSubmit() {
    setError('');
    const parsedAmount = Number(amount.replace(',', '.'));

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (accountId === null) {
      setError('Create an account first in the Accounts tab');
      return;
    }

    setIsSaving(true);

    try {
      await onSubmit({
        title: title.trim(),
        amount: toEur(parsedAmount),
        type,
        category: type === 'income' ? 'SALARY' : category,
        date: date.toISOString(),
        description: description.trim(),
        accountId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder="Title"
        placeholderTextColor={AppPalette.muted}
        value={title}
        onChangeText={setTitle}
      />

      <View style={styles.amountRow}>
        <View style={styles.currencyBadge}>
          <Text style={styles.currencyBadgeText}>{currency}</Text>
        </View>
        <TextInput
          style={styles.amountInput}
          placeholder="0.00"
          placeholderTextColor={AppPalette.muted}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.typeRow}>
        {(['expense', 'income'] as const).map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: type === option }}
            style={[styles.typeButton, type === option && styles.typeButtonActive]}
            onPress={() => selectType(option)}>
            <Text style={[styles.typeButtonText, type === option && styles.typeButtonTextActive]}>
              {option === 'expense' ? 'Expense' : 'Income'}
            </Text>
          </Pressable>
        ))}
      </View>

      {type === 'expense' ? (
        <CategoryPicker value={category} onChange={setCategory} />
      ) : (
        <View style={styles.input}>
          <Text style={styles.fieldLabel}>Category</Text>
          <Text style={styles.fieldValue}>Salary</Text>
        </View>
      )}

      <DateInput value={date} onChange={setDate} />

      <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} />

      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Description (optional)"
        placeholderTextColor={AppPalette.muted}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        {onCancel ? (
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.submitButton, isSaving && styles.disabled]}
          disabled={isSaving}
          onPress={handleSubmit}>
          <Text style={styles.submitText}>{isSaving ? 'Saving...' : submitLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: AppPalette.surface,
    borderColor: AppPalette.muted,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    color: AppPalette.text,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fieldLabel: {
    color: AppPalette.accent,
    fontSize: 12,
    marginBottom: 6,
  },
  fieldValue: {
    color: AppPalette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppPalette.surface,
    borderColor: AppPalette.muted,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  currencyBadge: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: AppPalette.muted,
    backgroundColor: AppPalette.elevated,
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
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    backgroundColor: AppPalette.surface,
    borderWidth: 1,
    borderColor: AppPalette.muted,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: AppPalette.accent,
    borderColor: AppPalette.accent,
  },
  typeButtonText: {
    color: AppPalette.text,
    fontWeight: '700',
  },
  typeButtonTextActive: {
    color: AppPalette.void,
  },
  error: {
    color: AppPalette.danger,
    marginBottom: 12,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppPalette.muted,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  cancelText: {
    color: AppPalette.text,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: AppPalette.accent,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitText: {
    color: AppPalette.void,
    fontWeight: '700',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
});
