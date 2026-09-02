import '@/i18n';

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { isKeyEnvelopeInitialized } from '@/services/security/key-manager';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function checkInit() {
      try {
        const initialized = await isKeyEnvelopeInitialized();
        setIsInitialized(initialized);
      } catch (e) {
        setIsInitialized(false);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }
    checkInit();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="(modal)" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
