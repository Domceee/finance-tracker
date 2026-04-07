import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../providers/auth-provider';
import { changePassword } from '../../lib/api';
import { AppPalette } from '../../constants/theme';

function AvatarCircle({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name
        .trim()
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : (email[0] ?? '?').toUpperCase();

  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

function ChangePasswordModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function reset() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setIsLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      reset();
      onClose();
      Alert.alert('Success', 'Your password has been updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Change Password</Text>

          <TextInput
            style={styles.input}
            placeholder="Current password"
            placeholderTextColor={AppPalette.muted}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor={AppPalette.muted}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor={AppPalette.muted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}>
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Updating...' : 'Update Password'}
            </Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) {
    return null;
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.profileCard}>
        <AvatarCircle name={user?.name ?? null} email={user?.email ?? ''} />
        <Text style={styles.name}>{user?.name ?? 'No name set'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Pressable style={styles.actionButton} onPress={() => setShowChangePassword(true)}>
          <Text style={styles.actionButtonText}>Change Password</Text>
        </Pressable>

        <Pressable
          style={[styles.dangerButton, isLoggingOut && styles.buttonDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}>
          <Text style={styles.dangerButtonText}>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</Text>
        </Pressable>
      </View>

      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
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
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 24,
    color: AppPalette.text,
  },
  profileCard: {
    backgroundColor: AppPalette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#211C33',
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppPalette.elevated,
    borderWidth: 2,
    borderColor: AppPalette.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: AppPalette.text,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: AppPalette.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: AppPalette.accent,
  },
  section: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: AppPalette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#211C33',
    padding: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: AppPalette.text,
    fontWeight: '600',
    fontSize: 15,
  },
  dangerButton: {
    backgroundColor: AppPalette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppPalette.danger,
    padding: 16,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: AppPalette.danger,
    fontWeight: '600',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: AppPalette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#211C33',
    padding: 24,
  },
  modalTitle: {
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
    marginBottom: 12,
  },
  errorText: {
    color: AppPalette.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: AppPalette.accent,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: AppPalette.void,
    fontWeight: '700',
    fontSize: 15,
  },
  cancelButton: {
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: AppPalette.muted,
    fontWeight: '600',
    fontSize: 15,
  },
});
