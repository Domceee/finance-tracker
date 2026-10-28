import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  createNote,
  deleteNote,
  getAccount,
  getTransaction,
  getTransactionNotes,
  updateNote,
  type Account,
  type Note,
  type Transaction,
} from '../../lib/api';
import { confirmAction } from '../../lib/confirm';
import { formatCategoryLabel } from '../../lib/format';
import { useCurrency } from '../../providers/currency-provider';
import { AppPalette } from '../../constants/theme';

function NoteItem({
  note,
  onUpdated,
  onDeleted,
}: {
  note: Note;
  onUpdated: (note: Note) => void;
  onDeleted: (id: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');

    if (!draft.trim()) {
      setError('Note cannot be empty');
      return;
    }

    try {
      onUpdated(await updateNote(note.id, draft.trim()));
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
    }
  }

  function handleDelete() {
    confirmAction('Delete Note', 'Delete this note?', 'Delete', async () => {
      try {
        await deleteNote(note.id);
        onDeleted(note.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete note');
      }
    });
  }

  return (
    <View style={styles.noteCard}>
      {isEditing ? (
        <TextInput
          style={styles.noteInput}
          value={draft}
          onChangeText={setDraft}
          multiline
          autoFocus
        />
      ) : (
        <Text style={styles.noteText}>{note.content}</Text>
      )}

      <Text style={styles.noteDate}>
        {new Date(note.createdAt).toLocaleString()}
        {note.updatedAt !== note.createdAt ? ' · edited' : ''}
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.noteActions}>
        {isEditing ? (
          <>
            <Pressable onPress={handleSave}>
              <Text style={styles.noteActionText}>Save</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setDraft(note.content);
                setIsEditing(false);
              }}>
              <Text style={styles.noteActionMuted}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable onPress={() => setIsEditing(true)}>
              <Text style={styles.noteActionText}>Edit</Text>
            </Pressable>
            <Pressable onPress={handleDelete}>
              <Text style={styles.noteActionDanger}>Delete</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = Number(id);
  const { formatCurrency } = useCurrency();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

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

  async function handleAddNote() {
    setError('');

    if (!newNote.trim()) {
      setError('Write something before adding a note');
      return;
    }

    setIsAdding(true);

    try {
      const created = await createNote(transactionId, newNote.trim());
      setNotes((prev) => [...prev, created]);
      setNewNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
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
          </View>

          <Text style={styles.sectionTitle}>Notes</Text>

          {notes.length === 0 ? (
            <Text style={styles.emptyText}>No notes yet. Add the first one below.</Text>
          ) : (
            notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onUpdated={(updated) =>
                  setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
                }
                onDeleted={(noteId) => setNotes((prev) => prev.filter((n) => n.id !== noteId))}
              />
            ))
          )}

          <View style={styles.addCard}>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note, e.g. Split with Tom"
              placeholderTextColor={AppPalette.muted}
              value={newNote}
              onChangeText={setNewNote}
              multiline
            />
            <Pressable
              style={[styles.addButton, isAdding && styles.buttonDisabled]}
              onPress={handleAddNote}
              disabled={isAdding}>
              <Text style={styles.addButtonText}>{isAdding ? 'Adding...' : 'Add Note'}</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    fontWeight: '700',
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
  sectionTitle: {
    color: AppPalette.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  noteCard: {
    backgroundColor: AppPalette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#211C33',
    padding: 14,
    marginBottom: 10,
  },
  noteText: {
    color: AppPalette.text,
    fontSize: 15,
    lineHeight: 21,
  },
  noteDate: {
    color: AppPalette.muted,
    fontSize: 12,
    marginTop: 8,
  },
  noteActions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 10,
  },
  noteActionText: {
    color: AppPalette.accent,
    fontWeight: '700',
  },
  noteActionMuted: {
    color: AppPalette.muted,
    fontWeight: '700',
  },
  noteActionDanger: {
    color: AppPalette.danger,
    fontWeight: '700',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: AppPalette.muted,
    backgroundColor: AppPalette.elevated,
    color: AppPalette.text,
    borderRadius: 14,
    padding: 12,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  addCard: {
    marginTop: 8,
    gap: 10,
  },
  addButton: {
    backgroundColor: AppPalette.accent,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  addButtonText: {
    color: AppPalette.void,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
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
