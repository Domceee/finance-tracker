import { Stack, useRouter, useSegments } from 'expo-router';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../providers/auth-provider';
import { CurrencyProvider } from '../providers/currency-provider';
import { ToastProvider } from '../providers/toast-provider';
import { ConfirmProvider } from '../providers/confirm-provider';
import { useAppFonts } from '../hooks/use-app-fonts';
import { injectWebGlobalStyles } from '../lib/web-global-styles';
import { AppPalette } from '../constants/theme';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

const PUBLIC_ROUTES = new Set([
  'login',
  'register',
  'verify-email',
  'forgot-password',
  'reset-password',
]);
const AUTH_ROUTES = new Set(['login', 'register', 'verify-email']);

injectWebGlobalStyles();

function AppNavigation() {
  const { isLoading, isAuthenticated } = useAuth();
  const fontsLoaded = useAppFonts();
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

  if (isLoading || !fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: AppPalette.void,
        }}>
        <ActivityIndicator size="large" color={AppPalette.accent} />
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
        <ToastProvider>
          <ConfirmProvider>
            <AppNavigation />
          </ConfirmProvider>
        </ToastProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}
