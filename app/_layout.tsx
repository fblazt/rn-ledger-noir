import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/src/auth';
import { initializeDatabase } from '@/src/db';
import { createLogger } from '@/src/lib/logger';

const logger = createLogger('app');

SplashScreen.preventAutoHideAsync().catch((error) => {
  logger.warn('failed to prevent splash auto hide', error);
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    initializeDatabase().catch((error) => {
      logger.error('failed to initialize local database', error);
    });
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <SplashController />
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="categories" options={{ headerShown: false }} />
          <Stack.Screen name="category-form" options={{ headerShown: false }} />
          <Stack.Screen name="transaction-form" options={{ headerShown: false }} />
          <Stack.Screen name="budget-form" options={{ headerShown: false }} />
          <Stack.Screen name="attachment-preview" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}

function SplashController() {
  const { loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch((error) => {
        logger.warn('failed to hide splash screen', error);
      });
    });
  }, [loading]);

  return null;
}
