import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useRouter, useSegments } from 'expo-router';

import { isAppUnlocked, lockApp } from '@/services/security/auth-service';
import { isKeyEnvelopeInitialized } from '@/services/security/key-manager';

/**
 * Hook that listens for AppState changes to automatically lock the app,
 * clear cryptographic keys from RAM, and redirect to the lock screen when user leaves the app.
 */
export function useAutoLock(): void {
  const router = useRouter();
  const segments = useSegments();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const segmentsRef = useRef(segments);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    if (typeof AppState?.addEventListener !== 'function') {
      return;
    }

    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      const prevAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      // 1. User leaving the app into background
      if (nextAppState === 'background') {
        if (isAppUnlocked()) {
          lockApp();
          try {
            if (router.canDismiss?.()) {
              router.dismissAll();
            }
            router.replace('/(auth)/lock');
          } catch {
            // Navigation might not be ready or handled gracefully
          }
        }
        return;
      }

      // 2. User returning to foreground
      if (
        prevAppState === 'background' &&
        nextAppState === 'active'
      ) {
        try {
          const isInit = await isKeyEnvelopeInitialized();
          if (isInit && !isAppUnlocked()) {
            const currentRoot = segmentsRef.current[0] as string | undefined;
            if (currentRoot !== '(auth)') {
              if (router.canDismiss?.()) {
                router.dismissAll();
              }
              router.replace('/(auth)/lock');
            }
          }
        } catch {
          // Ignore init check errors during fast transitions
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);
}
