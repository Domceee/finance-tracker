import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { createTransaction, type TransactionInput } from '../lib/api';
import { TransactionForm } from '../components/transaction-form';
import { useToast } from '../providers/toast-provider';
import { AppPalette } from '../constants/theme';
import { FontFamily } from '../constants/fonts';

export default function AddTransactionScreen() {
  const toast = useToast();

  async function handleSubmit(input: TransactionInput) {
    await createTransaction(input);
    toast.success('Transaction created');
    router.replace('/(tabs)');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

      <Text style={styles.title}>Add Transaction</Text>

      <TransactionForm submitLabel="Save Transaction" onSubmit={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppPalette.void,
  },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: 24,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    color: AppPalette.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    color: AppPalette.text,
    marginBottom: 20,
  },
});
