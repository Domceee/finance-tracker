import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  deleteTransaction,
  getAccount,
  getTransaction,
  getTransactionNotes,
  type Account,
  type Note,
  type Transaction,
} from '../../lib/api';
import { formatCategoryLabel } from '../../lib/format';
import { NoteCard } from '../../components/note-card';
import { NoteFormModal, type NoteFormState } from '../../components/note-form-modal';
import { NoteViewModal, type NoteTarget } from '../../components/note-view-modal';
import { TransactionEditModal } from '../../components/transaction-edit-modal';
import { useCurrency } from '../../providers/currency-provider';
import { useConfirm } from '../../providers/confirm-provider';
import { useToast } from '../../providers/toast-provider';
import { AppPalette } from '../../constants/theme';
import { FontFamily } from '../../constants/fonts';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = Number(id);
  const { formatCurrency } = useCurrency();
  const confirm = useConfirm();
  const toast = useToast();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewTarget, setViewTarget] = useState<NoteTarget | null>(null);
  const [noteForm, setNoteForm] = useState<NoteFormState | null>(null);

  const loadData = useCallback(async () => {
    setError('');

    try {
      setIsLoading(true);
      const [transactionData, notesData] = await Promise.all([
        getTransaction(transactionId),
        getTransactionNotes(transactionId),
      ]);
      setTransaction(transactionData);
      setNotes(notesData);
      setAccount(await getAccount(transactionData.accountId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction');
    } finally {
      setIsLoading(false);
    }
  }, [transactionId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  async function handleDeleteTransaction() {
    if (!transaction) return;

    const confirmed = await confirm({
      title: 'Delete Transaction',
      message: `Delete "${transaction.title}" and all of its notes? This cannot be undone.`,
      confirmLabel: 'Delete',
    });

    if (!confirmed) return;

    try {
      await deleteTransaction(transaction.id);
      toast.success('Transaction deleted');

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/explore');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete transaction');
    }
  }

  function openNote(note: Note) {
    if (!transaction || !account) return;

    setViewTarget({
      accountId: account.id,
      accountName: account.name,
      transactionId: transaction.id,
      transactionTitle: transaction.title,
      noteId: note.id,
    });
  }

  function handleNoteSaved(saved: Note) {
    setNotes((prev) =>
      prev.some((n) => n.id === saved.id) ? prev.map((n) => (n.id === saved.id ? saved : n)) : [...prev, saved],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

      {isLoading && !transaction ? (
        <ActivityIndicator size="large" color={AppPalette.accent} />
      ) : transaction ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.title}>{transaction.title}</Text>
            <Text style={transaction.type === 'income' ? styles.income : styles.expense}>
              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
            </Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{formatCategoryLabel(transaction.category)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{new Date(transaction.date).toLocaleDateString()}</Text>
            </View>
            {account ? (
              <Pressable
                style={styles.detailRow}
                onPress={() => router.push({ pathname: '/account/[id]', params: { id: String(account.id) } })}>
                <Text style={styles.detailLabel}>Account</Text>
                <Text style={styles.detailLink}>{account.name} ›</Text>
              </Pressable>
            ) : null}
            {transaction.description ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{transaction.description}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable style={styles.editButton} onPress={() => setEditingTransaction(transaction)}>
                <MaterialIcons name="edit" size={18} color={AppPalette.void} />
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={handleDeleteTransaction}>
                <MaterialIcons name="delete-outline" size={18} color={AppPalette.danger} />
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Pressable style={styles.addButton} onPress={() => setNoteForm({ mode: 'create' })}>
              <Text style={styles.addButtonText}>+ Add Note</Text>
            </Pressable>
          </View>

          {notes.length === 0 ? (
            <Text style={styles.emptyText}>No notes yet.</Text>
          ) : (
            notes.map((note) => <NoteCard key={note.id} note={note} onPress={() => openNote(note)} />)
          )}
        </>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TransactionEditModal
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSaved={() => loadData()}
      />

      <NoteViewModal
        target={viewTarget}
        onClose={() => setViewTarget(null)}
        onEdit={(note) => {
          setViewTarget(null);
          setNoteForm({ mode: 'edit', note });
        }}
        onDeleted={(noteId) => setNotes((prev) => prev.filter((n) => n.id !== noteId))}
      />

      <NoteFormModal
        state={noteForm}
        transactionId={transactionId}
        onClose={() => setNoteForm(null)}
        onSaved={handleNoteSaved}
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
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 16,
  },
  backText: {
    color: AppPalette.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: AppPalette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#211C33',
    padding: 20,
    marginBottom: 24,
    gap: 4,
  },
  title: {
    color: AppPalette.text,
    fontSize: 24,
    fontFamily: FontFamily.bold,
  },
  income: {
    color: AppPalette.success,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  expense: {
    color: AppPalette.danger,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#211C33',
  },
  detailLabel: {
    color: AppPalette.accent,
    fontSize: 14,
  },
  detailValue: {
    color: AppPalette.text,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  detailLink: {
    color: AppPalette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppPalette.accent,
    borderRadius: 14,
    padding: 12,
  },
  editText: {
    color: AppPalette.void,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: AppPalette.danger,
    borderRadius: 14,
    padding: 12,
  },
  deleteText: {
    color: AppPalette.danger,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: AppPalette.text,
    fontSize: 18,
    fontFamily: FontFamily.bold,
  },
  addButton: {
    backgroundColor: AppPalette.accent,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  addButtonText: {
    color: AppPalette.void,
    fontWeight: '700',
  },
  emptyText: {
    color: AppPalette.accent,
    marginBottom: 12,
  },
  errorText: {
    color: AppPalette.danger,
    marginTop: 12,
    textAlign: 'center',
  },
});
