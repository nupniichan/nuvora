import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { initializeI18n } from '@/i18n';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

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
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="(modal)" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
