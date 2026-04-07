import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { resetPassword } from '../lib/api';
import { AppPalette } from '../constants/theme';

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setError('');

    if (!code.trim()) {
      setError('Reset code is required');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(email, code.trim(), newPassword);
      router.replace('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter the code sent to{' '}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Reset code"
          placeholderTextColor={AppPalette.muted}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
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
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}>
          <Text style={styles.buttonText}>
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Text>
        </Pressable>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: AppPalette.void,
  },
  card: {
    backgroundColor: AppPalette.surface,
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#211C33',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: AppPalette.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: AppPalette.accent,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emailHighlight: {
    color: AppPalette.text,
    fontWeight: '600',
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
  button: {
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: AppPalette.accent,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: AppPalette.void,
    fontWeight: '700',
    fontSize: 15,
  },
  backButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: AppPalette.text,
    fontWeight: '600',
  },
});
