import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { View } from 'react-native';

import { BottomNavigation } from '@/components/ui/bottom-navigation';
import i18n, { initializeI18n } from '@/i18n';
import { useAutoLock } from '@/hooks/use-auto-lock';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AutoLockManager() {
  useAutoLock();
  return null;
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepareApp() {
      try {
        await initializeI18n();
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepareApp();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider value={DefaultTheme}>
        <AutoLockManager />
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)" />
            <Stack.Screen name="(modal)" options={{ presentation: 'card' }} />
          </Stack>
          <BottomNavigation />
        </View>
      </ThemeProvider>
    </I18nextProvider>
  );
}
