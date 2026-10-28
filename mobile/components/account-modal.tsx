import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ACCOUNT_TYPES,
  createAccount,
  deleteAccount,
  updateAccount,
  type Account,
  type AccountType,
} from '../lib/api';
import { confirmAction } from '../lib/confirm';
import { formatAccountType } from '../lib/format';
import { AppPalette } from '../constants/theme';

export function AccountModal({
  visible,
  account,
  onClose,
  onSaved,
  onDeleted,
}: {
  visible: boolean;
  account: Account | null;
  onClose: () => void;
  onSaved: (account: Account) => void;
  onDeleted?: (id: number) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CARD');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName(account?.name ?? '');
      setType(account?.type ?? 'CARD');
      setError('');
    }
  }, [visible, account]);

  async function handleSave() {
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSaving(true);

    try {
      const input = { name: name.trim(), type };
      const saved = account ? await updateAccount(account.id, input) : await createAccount(input);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account');
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete() {
    if (!account) return;

    confirmAction(
      'Delete Account',
      `Delete "${account.name}" and all of its transactions? This cannot be undone.`,
      'Delete',
      async () => {
        try {
          await deleteAccount(account.id);
          onDeleted?.(account.id);
          onClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to delete account');
        }
      },
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{account ? 'Edit Account' : 'New Account'}</Text>

          <TextInput
            style={styles.input}
            placeholder="Account name, e.g. Swedbank card"
            placeholderTextColor={AppPalette.muted}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.typeGrid}>
            {ACCOUNT_TYPES.map((item) => {
              const selected = item === type;
              return (
                <Pressable
                  key={item}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setType(item)}>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {formatAccountType(item)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isSaving}>
            <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save Account'}</Text>
          </Pressable>

          {account ? (
            <Pressable style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: AppPalette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#211C33',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: AppPalette.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: AppPalette.muted,
    backgroundColor: AppPalette.elevated,
    color: AppPalette.text,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  label: {
    color: AppPalette.accent,
    fontSize: 12,
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1,
    borderColor: AppPalette.muted,
    backgroundColor: AppPalette.elevated,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: {
    backgroundColor: AppPalette.accent,
    borderColor: AppPalette.accent,
  },
  chipText: {
    color: AppPalette.text,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: AppPalette.void,
  },
  errorText: {
    color: AppPalette.danger,
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: AppPalette.accent,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: AppPalette.void,
    fontWeight: '700',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  deleteButton: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppPalette.danger,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: AppPalette.danger,
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
