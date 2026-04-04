import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { createTransaction } from '../lib/api';
import { AppPalette } from '../constants/theme';

export default function AddTransactionScreen() {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  async function handleSubmit() {
    try {
      await createTransaction({
        title,
        amount: Number(amount),
        type,
        category,
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
        placeholder="Category"
        placeholderTextColor={AppPalette.muted}
        value={category}
        onChangeText={setCategory}
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
          onPress={() => setType('expense')}>
          <Text style={styles.typeButtonText}>Expense</Text>
        </Pressable>

        <Pressable
          style={[styles.typeButton, type === 'income' && styles.activeButton]}
          onPress={() => setType('income')}>
          <Text style={styles.typeButtonText}>Income</Text>
        </Pressable>
      </View>

      <Pressable style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Save Transaction</Text>
      </Pressable>
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
});
