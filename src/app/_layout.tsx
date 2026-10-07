import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { View } from 'react-native';

import { AnimatedSplashScreen } from '@/components/splash/animated-splash-screen';
import { SplashProvider, useSplash } from '@/components/splash/splash-context';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import i18n, { initializeI18n } from '@/i18n';
import { useAutoLock } from '@/hooks/use-auto-lock';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AutoLockManager() {
  useAutoLock();
  return null;
}

function RootContent() {
  const [showSplashAnimation, setShowSplashAnimation] = useState(true);
  const { markSplashFinished } = useSplash();

  const handleAnimationComplete = () => {
    markSplashFinished();
    setShowSplashAnimation(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="(modal)" options={{ presentation: 'card' }} />
      </Stack>
      <BottomNavigation />
      {showSplashAnimation && (
        <AnimatedSplashScreen
          onAnimationComplete={handleAnimationComplete}
        />
      )}
    </View>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepareApp() {
      try {
        await initializeI18n();
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => undefined);
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
        <SplashProvider>
          <AutoLockManager />
          <RootContent />
        </SplashProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}
