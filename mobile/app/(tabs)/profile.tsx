import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../providers/auth-provider';
import { changePassword, updateProfile } from '../../lib/api';
import { AppPalette } from '../../constants/theme';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

async function uploadToCloudinary(uri: string): Promise<string> {
  const form = new FormData();
  form.append('file', { uri, type: 'image/jpeg', name: 'avatar.jpg' } as any);
  form.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form },
  );

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  const data = await response.json();
  return data.secure_url as string;
}

function Avatar({ name, email, avatarUrl, onPress, isUploading }: {
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  onPress: () => void;
  isUploading: boolean;
}) {
  const initials = name
    ? name.trim().split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : (email[0] ?? '?').toUpperCase();

  return (
    <Pressable onPress={onPress} style={styles.avatarWrapper}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      )}
      {isUploading && (
        <View style={styles.avatarOverlay}>
          <ActivityIndicator color={AppPalette.text} />
        </View>
      )}
      <View style={styles.avatarBadge}>
        <Text style={styles.avatarBadgeText}>✎</Text>
      </View>
    </Pressable>
  );
}

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
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
  const { user, logout, updateUser } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if (!user) {
    return null;
  }

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access to your photo library to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    setIsUploading(true);

    try {
      const uri = result.assets[0].uri;
      const cloudUrl = await uploadToCloudinary(uri);
      await updateProfile(cloudUrl);
      updateUser({ avatarUrl: cloudUrl });
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not upload image.');
    } finally {
      setIsUploading(false);
    }
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
        <Avatar
          name={user.name}
          email={user.email}
          avatarUrl={user.avatarUrl}
          onPress={handlePickAvatar}
          isUploading={isUploading}
        />
        <Text style={styles.name}>{user.name ?? 'No name set'}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.section}>
        <Pressable style={styles.actionButton} onPress={() => setShowChangePassword(true)}>
          <Text style={styles.actionButtonText}>Change Password</Text>
        </Pressable>

        <Pressable
          style={[styles.dangerButton, isLoggingOut && styles.buttonDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}>
          <Text style={styles.dangerButtonText}>
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </Text>
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
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: AppPalette.muted,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppPalette.elevated,
    borderWidth: 2,
    borderColor: AppPalette.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: AppPalette.text,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppPalette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: {
    color: AppPalette.void,
    fontSize: 12,
    fontWeight: '700',
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
