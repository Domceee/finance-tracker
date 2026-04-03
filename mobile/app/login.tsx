import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../providers/auth-provider';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.title}>Bim bam</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          style={styles.button}
          onPress={async () => {
            await login(email, 'Test User');
            router.replace('/(tabs)');
          }}>
          <Text style={styles.buttonText}>Login</Text>
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
    backgroundColor: '#C0C78C',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#B99470',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#B99470',
  },
  buttonText: {
    color: '#FEFAE0',
    fontWeight: '600',
  },
  logoContainer: {
    backgroundColor: '#FEFAE0',
    padding: 24,
    borderRadius: 20,
  },
});