import { Stack, useRouter, useSegments } from 'expo-router';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../providers/auth-provider';
import { CurrencyProvider } from '../providers/currency-provider';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

const PUBLIC_ROUTES = new Set([
  'login',
  'register',
  'verify-email',
  'forgot-password',
  'reset-password',
  'guest',
]);
const AUTH_ROUTES = new Set(['login', 'register', 'verify-email']);

function AppNavigation() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const currentRoute = segments[0] ?? '';

    if (!isAuthenticated && !PUBLIC_ROUTES.has(currentRoute)) {
      router.replace('/login');
    }

    if (isAuthenticated && AUTH_ROUTES.has(currentRoute)) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, router, segments]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
      }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <AppNavigation />
      </CurrencyProvider>
    </AuthProvider>
  );
}
