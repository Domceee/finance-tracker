import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../providers/auth-provider';
import { AppPalette } from '../constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  async function handleSubmit() {
    setError('');

    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
        return;
      }

      setError('Could not sign in. Check your email and password.');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.title}>Bim bam</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

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
          placeholder="Password"
          placeholderTextColor={AppPalette.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Login</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/register')}>
          <Text style={styles.secondaryButtonText}>Need an account? Register</Text>
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
  logoContainer: {
    backgroundColor: AppPalette.surface,
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#211C33',
  },
});
