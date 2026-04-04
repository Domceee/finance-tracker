import { Stack, useRouter, useSegments } from 'expo-router';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../providers/auth-provider';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

function AppNavigation() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const currentRoute = segments[0];
    const inTabsGroup = currentRoute === '(tabs)';
    const inAuthScreen =
      currentRoute === 'login' ||
      currentRoute === 'register' ||
      currentRoute === 'verify-email';

    if (!isAuthenticated && (inTabsGroup || currentRoute === 'add-transaction')) {
      router.replace('/login');
    }

    if (isAuthenticated && inAuthScreen) {
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
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigation />
    </AuthProvider>
  );
}
