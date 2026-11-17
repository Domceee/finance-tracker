import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createNote, updateNote, type Note } from '../lib/api';
import { useToast } from '../providers/toast-provider';
import { ModalCard } from './modal-card';
import { AppPalette } from '../constants/theme';

export type NoteFormState = { mode: 'create' } | { mode: 'edit'; note: Note };

export function NoteFormModal({
  state,
  transactionId,
  onClose,
  onSaved,
}: {
  state: NoteFormState | null;
  transactionId: number;
  onClose: () => void;
  onSaved: (note: Note) => void;
}) {
  const toast = useToast();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = state?.mode === 'edit';

  useEffect(() => {
    if (!state) return;

    setContent(state.mode === 'edit' ? state.note.content : '');
    setError('');
  }, [state]);

  async function handleSave() {
    if (!state) return;

    setError('');

    if (!content.trim()) {
      setError('Note cannot be empty');
      return;
    }

    setIsSaving(true);

    try {
      const saved =
        state.mode === 'edit'
          ? await updateNote(state.note.id, content.trim())
          : await createNote(transactionId, content.trim());
      onSaved(saved);
      onClose();
      toast.success(state.mode === 'edit' ? 'Note updated' : 'Note added');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModalCard visible={state !== null} title={isEdit ? 'Edit Note' : 'New Note'} onClose={onClose}>
      <TextInput
        style={styles.input}
        placeholder="e.g. Split with Tom"
        placeholderTextColor={AppPalette.muted}
        value={content}
        onChangeText={setContent}
        multiline
        autoFocus
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable style={[styles.saveButton, isSaving && styles.disabled]} disabled={isSaving} onPress={handleSave}>
          <Text style={styles.saveText}>{isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Note'}</Text>
        </Pressable>
      </View>
    </ModalCard>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: AppPalette.muted,
    backgroundColor: AppPalette.elevated,
    color: AppPalette.text,
    borderRadius: 14,
    padding: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 12,
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
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  cancelText: {
    color: AppPalette.text,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: AppPalette.accent,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  saveText: {
    color: AppPalette.void,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
