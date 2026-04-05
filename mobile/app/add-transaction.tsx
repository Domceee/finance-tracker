import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import {
  createTransaction,
  EXPENSE_TRANSACTION_CATEGORIES,
  TransactionCategory,
} from '../lib/api';
import { AppPalette } from '../constants/theme';

function formatCategoryLabel(category: TransactionCategory) {
  if (category === 'EATOUT') {
    return 'Eat Out';
  }

  return category.charAt(0) + category.slice(1).toLowerCase();
}

export default function AddTransactionScreen() {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState<TransactionCategory>('OTHER');
  const [description, setDescription] = useState('');
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  async function handleSubmit() {
    try {
      await createTransaction({
        title,
        amount: Number(amount),
        type,
        category: type === 'income' ? 'SALARY' : category,
        date: new Date().toISOString(),
        description,
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

      <TextInput
        style={styles.input}
        placeholder="Amount"
        placeholderTextColor={AppPalette.muted}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <TextInput
        style={styles.input}
        placeholder="Description"
        placeholderTextColor={AppPalette.muted}
        value={description}
        onChangeText={setDescription}
      />

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
});
