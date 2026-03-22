import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';

export default function AddTransactionScreen() {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Transaction</Text>

      <View style={styles.row}>
        <Pressable
          style={[styles.typeButton, type === 'expense' && styles.activeButton]}
          onPress={() => setType('expense')}
        >
          <Text style={[styles.typeText, type === 'expense' && styles.activeText]}>
            Expense
          </Text>
        </Pressable>

        <Pressable
          style={[styles.typeButton, type === 'income' && styles.activeButton]}
          onPress={() => setType('income')}
        >
          <Text style={[styles.typeText, type === 'income' && styles.activeText]}>
            Income
          </Text>
        </Pressable>
      </View>

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

      <Pressable style={styles.saveButton} onPress={() => router.back()}>
        <Text style={styles.saveButtonText}>Save Transaction</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C0C78C',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    color: '#FEFAE0',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#B99470',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 10,
  },
  activeButton: {
    backgroundColor: '#FEFAE0',
  },
  typeText: {
    fontWeight: '600',
    color: '#FEFAE0',
  },
  activeText: {
    color: '#B99470',
  },
  input: {
    backgroundColor: '#FEFAE0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#B99470',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FEFAE0',
    fontWeight: '700',
  },
});