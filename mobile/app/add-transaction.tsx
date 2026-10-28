import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import {
  createTransaction,
  EXPENSE_TRANSACTION_CATEGORIES,
  getAccounts,
  type Account,
  TransactionCategory,
} from '../lib/api';
import { formatCategoryLabel } from '../lib/format';
import { useCurrency } from '../providers/currency-provider';
import { AppPalette } from '../constants/theme';

export default function AddTransactionScreen() {
  const { currency, toEur } = useCurrency();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState<TransactionCategory>('OTHER');
  const [description, setDescription] = useState('');
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);

  useEffect(() => {
    getAccounts()
      .then((data) => {
        setAccounts(data);
        setAccountId(data[0]?.id ?? null);
      })
      .catch(() => {
        Alert.alert('Error', 'Failed to load accounts');
      });
  }, []);

  async function handleSubmit() {
    if (accountId === null) {
      Alert.alert('Error', 'Create an account first in the Accounts tab');
      return;
    }

    try {
      await createTransaction({
        title,
        amount: toEur(Number(amount)),
        type,
        category: type === 'income' ? 'SALARY' : category,
        date: new Date().toISOString(),
        description,
        accountId,
      });

      Alert.alert('Success', 'Transaction created successfully');
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Error', 'Failed to create transaction');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Transaction</Text>

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
          keyboardType="numeric"
        />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Description"
        placeholderTextColor={AppPalette.muted}
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.categoryLabel}>Account</Text>
      <View style={styles.accountRow}>
        {accounts.length === 0 ? (
          <Text style={styles.noAccountsText}>No accounts yet. Add one in the Accounts tab.</Text>
        ) : (
          accounts.map((account) => (
            <Pressable
              key={account.id}
              style={[styles.accountChip, account.id === accountId && styles.activeButton]}
              onPress={() => setAccountId(account.id)}>
              <Text
                style={[
                  styles.accountChipText,
                  account.id === accountId && styles.activeCategoryOptionText,
                ]}>
                {account.name}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.typeRow}>
        <Pressable
          style={[styles.typeButton, type === 'expense' && styles.activeButton]}
          onPress={() => {
            setType('expense');

            if (category === 'SALARY') {
              setCategory('OTHER');
            }
          }}>
          <Text style={styles.typeButtonText}>Expense</Text>
        </Pressable>

        <Pressable
          style={[styles.typeButton, type === 'income' && styles.activeButton]}
          onPress={() => {
            setType('income');
            setCategory('SALARY');
          }}>
          <Text style={styles.typeButtonText}>Income</Text>
        </Pressable>
      </View>

      {type === 'expense' ? (
        <Pressable
          style={styles.input}
          onPress={() => setIsCategoryModalVisible(true)}>
          <Text style={styles.categoryLabel}>Category</Text>
          <Text style={styles.categoryValue}>{formatCategoryLabel(category)}</Text>
        </Pressable>
      ) : (
        <View style={styles.input}>
          <Text style={styles.categoryLabel}>Category</Text>
          <Text style={styles.categoryValue}>Salary</Text>
        </View>
      )}

      <Pressable style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Save Transaction</Text>
      </Pressable>

      <Modal
        visible={isCategoryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsCategoryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose Category</Text>

            <ScrollView contentContainerStyle={styles.modalList}>
              {EXPENSE_TRANSACTION_CATEGORIES.map((item) => (
                <Pressable
                  key={item}
                  style={[
                    styles.categoryOption,
                    item === category && styles.activeCategoryOption,
                  ]}
                  onPress={() => {
                    setCategory(item);
                    setIsCategoryModalVisible(false);
                  }}>
                  <Text
                    style={[
                      styles.categoryOptionText,
                      item === category && styles.activeCategoryOptionText,
                    ]}>
                    {formatCategoryLabel(item)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setIsCategoryModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: AppPalette.void,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AppPalette.text,
    marginBottom: 20,
    textAlign: 'left',
  },
  input: {
    backgroundColor: AppPalette.surface,
    borderColor: AppPalette.muted,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    color: AppPalette.text,
  },
  categoryLabel: {
    color: AppPalette.accent,
    fontSize: 12,
    marginBottom: 6,
  },
  categoryValue: {
    color: AppPalette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  accountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  accountChip: {
    backgroundColor: AppPalette.surface,
    borderWidth: 1,
    borderColor: AppPalette.muted,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  accountChipText: {
    color: AppPalette.text,
    fontWeight: '600',
  },
  noAccountsText: {
    color: AppPalette.muted,
  },
  typeButton: {
    flex: 1,
    backgroundColor: AppPalette.surface,
    borderWidth: 1,
    borderColor: AppPalette.muted,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginRight: 8,
  },
  activeButton: {
    backgroundColor: AppPalette.accent,
    borderColor: AppPalette.accent,
  },
  typeButtonText: {
    color: AppPalette.text,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: AppPalette.accent,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: AppPalette.void,
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 7, 16, 0.88)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: AppPalette.surface,
    padding: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#211C33',
    maxHeight: '75%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: AppPalette.text,
    marginBottom: 16,
  },
  modalList: {
    gap: 10,
    paddingBottom: 12,
  },
  categoryOption: {
    backgroundColor: AppPalette.elevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppPalette.muted,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  activeCategoryOption: {
    backgroundColor: AppPalette.accent,
    borderColor: AppPalette.accent,
  },
  categoryOptionText: {
    color: AppPalette.text,
    fontWeight: '600',
    fontSize: 16,
  },
  activeCategoryOptionText: {
    color: AppPalette.void,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: AppPalette.accent,
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
});
