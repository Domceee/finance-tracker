import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { forgotPassword } from '../lib/api';
import { AppPalette } from '../constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setIsLoading(true);

    try {
      await forgotPassword(email.trim());
      router.push({ pathname: '/reset-password', params: { email: email.trim() } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a reset code.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={AppPalette.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}>
          <Text style={styles.buttonText}>
            {isLoading ? 'Sending...' : 'Send Reset Code'}
          </Text>
        </Pressable>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back to Login</Text>
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
