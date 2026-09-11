import { Redirect, usePathname, Stack } from 'expo-router';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from './button';
import { isAppUnlocked, lockApp, resumeAccountDeletion } from '@/services/security/auth-service';
import { isKeyEnvelopeInitialized } from '@/services/security/key-manager';
import { getSessionRedirect } from '@/shared/session-routing';

export function SessionGuard({ children, onboarding = false }: PropsWithChildren<{ onboarding?: boolean }>) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ initialized: boolean } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      await resumeAccountDeletion();
      const initialized = await isKeyEnvelopeInitialized();
      if (cancelled) return;
      setFailed(false);
      if (onboarding && initialized && (pathname === '/welcome' || pathname.startsWith('/setup-'))) lockApp();
      setState({ initialized });
    }
    check().catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [pathname, onboarding, attempt]);

  if (failed) return <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}><Button title={t('accountSecurity.retry')} onPress={() => setAttempt((value) => value + 1)} /></View>;
  if (!state) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  if (onboarding) return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={state.initialized}>
        <Stack.Screen name="lock" />
      </Stack.Protected>
      <Stack.Protected guard={!state.initialized}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="setup-password" />
        <Stack.Screen name="setup-biometric" />
        <Stack.Screen name="setup-currency" />
        <Stack.Screen name="setup-categories" />
      </Stack.Protected>
    </Stack>
  );
  const redirect = getSessionRedirect(false, pathname, state.initialized, isAppUnlocked());
  if (redirect) return <Redirect href={redirect} />;
  return children;
}
