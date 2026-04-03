import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { createTransaction } from '../lib/api';

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
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={styles.input}
        placeholder="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <TextInput
        style={styles.input}
        placeholder="Category"
        value={category}
        onChangeText={setCategory}
      />

      <TextInput
        style={styles.input}
        placeholder="Description"
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
    backgroundColor: '#C0C78C',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FEFAE0',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FEFAE0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    color: '#333',
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#B99470',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  activeButton: {
    backgroundColor: '#8A6E52',
  },
  typeButtonText: {
    color: '#FEFAE0',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#8A6E52',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FEFAE0',
    fontWeight: '700',
    fontSize: 16,
  },
});