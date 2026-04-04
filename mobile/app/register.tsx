import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../providers/auth-provider';
import { AppPalette } from '../constants/theme';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();

  async function handleSubmit() {
    setError('');

    try {
      const normalizedEmail = await register(email, password, name);
      router.push({
        pathname: '/verify-email',
        params: { email: normalizedEmail },
      });
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
        return;
      }

      setError('Could not create account. Check your details and try again.');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Set up your account to get started</Text>

        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor={AppPalette.muted}
          value={name}
          onChangeText={setName}
        />

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
          <Text style={styles.buttonText}>Send Verification Code</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/login')}>
          <Text style={styles.secondaryButtonText}>Already have an account? Login</Text>
        </Pressable>

        <Pressable style={styles.linkButton} onPress={() => router.push('/verify-email')}>
          <Text style={styles.linkButtonText}>Already have a code? Verify email</Text>
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
  linkButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  linkButtonText: {
    color: AppPalette.accent,
  },
  errorText: {
    color: AppPalette.danger,
    marginBottom: 8,
    textAlign: 'center',
  },
});
