import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { deleteNote, getAccountTransactionNote, type Note } from '../lib/api';
import { useConfirm } from '../providers/confirm-provider';
import { useToast } from '../providers/toast-provider';
import { ModalCard } from './modal-card';
import { AppPalette } from '../constants/theme';

export type NoteTarget = {
  accountId: number;
  accountName: string;
  transactionId: number;
  transactionTitle: string;
  noteId: number;
};

export function NoteViewModal({
  target,
  onClose,
  onEdit,
  onDeleted,
}: {
  target: NoteTarget | null;
  onClose: () => void;
  onEdit: (note: Note) => void;
  onDeleted: (noteId: number) => void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!target) return;

    setNote(null);
    setError('');
    getAccountTransactionNote(target.accountId, target.transactionId, target.noteId)
      .then(setNote)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load note'));
  }, [target]);

  async function handleDelete() {
    if (!note) return;

    const confirmed = await confirm({ title: 'Delete Note', message: 'Delete this note?', confirmLabel: 'Delete' });

    if (!confirmed) return;

    try {
      await deleteNote(note.id);
      onDeleted(note.id);
      onClose();
      toast.success('Note deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  }

  return (
    <ModalCard visible={target !== null} title="Note" onClose={onClose}>
      {target ? (
        <Text style={styles.breadcrumb} numberOfLines={1}>
          {target.accountName} › {target.transactionTitle} › Note #{target.noteId}
        </Text>
      ) : null}

      {note ? (
        <>
          <Text style={styles.content}>{note.content}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Created</Text>
            <Text style={styles.metaValue}>{new Date(note.createdAt).toLocaleString()}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Last updated</Text>
            <Text style={styles.metaValue}>{new Date(note.updatedAt).toLocaleString()}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.editButton} onPress={() => onEdit(note)}>
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        </>
      ) : error ? null : (
        <ActivityIndicator color={AppPalette.accent} />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ModalCard>
  );
}

const styles = StyleSheet.create({
  breadcrumb: {
    color: AppPalette.muted,
    fontSize: 12,
    marginBottom: 12,
  },
  content: {
    color: AppPalette.text,
    fontSize: 16,
    lineHeight: 23,
    backgroundColor: AppPalette.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#211C33',
  },
  metaLabel: {
    color: AppPalette.accent,
    fontSize: 13,
  },
  metaValue: {
    color: AppPalette.text,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  editButton: {
    flex: 1,
    backgroundColor: AppPalette.accent,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  editText: {
    color: AppPalette.void,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppPalette.danger,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  deleteText: {
    color: AppPalette.danger,
    fontWeight: '700',
  },
  error: {
    color: AppPalette.danger,
    marginTop: 12,
    textAlign: 'center',
  },
});
