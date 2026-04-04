import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../providers/auth-provider';
import { AppPalette } from '../constants/theme';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const { verifyEmail } = useAuth();

  async function handleSubmit() {
    setError('');

    try {
      await verifyEmail(email, code);
      router.replace('/(tabs)');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
        return;
      }

      setError('Could not verify email. Please try again.');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>Enter the code sent to your email address</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={AppPalette.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Verification code"
          placeholderTextColor={AppPalette.muted}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Verify</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/login')}>
          <Text style={styles.secondaryButtonText}>Back to login</Text>
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
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    color: AppPalette.text,
  },
  subtitle: {
    textAlign: 'center',
    color: AppPalette.accent,
    marginBottom: 20,
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
  button: {
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: AppPalette.accent,
  },
  buttonText: {
    color: AppPalette.void,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: AppPalette.text,
    fontWeight: '600',
  },
  errorText: {
    color: AppPalette.danger,
    marginBottom: 8,
    textAlign: 'center',
  },
});
