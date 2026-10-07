import React from 'react';

const mockUnlockWithBiometrics = jest.fn();
const mockLockApp = jest.fn();
const mockIsBiometricsAvailable = jest.fn();
const mockIsBiometricsEnabled = jest.fn();
const mockIsPasswordAuthExpired = jest.fn();
const mockReplace = jest.fn();

let mockSplashFinished = false;

jest.mock('@/components/splash/splash-context', () => ({
  useSplash: () => ({
    isSplashFinished: mockSplashFinished,
    markSplashFinished: jest.fn(),
  }),
}));

jest.mock('@/services/security/auth-service', () => ({
  lockApp: () => mockLockApp(),
  isBiometricsAvailable: () => mockIsBiometricsAvailable(),
  isBiometricsEnabled: () => mockIsBiometricsEnabled(),
  isPasswordAuthExpired: () => mockIsPasswordAuthExpired(),
  unlockWithBiometrics: () => mockUnlockWithBiometrics(),
  unlockWithPassword: jest.fn(),
}));

jest.mock('@/constants/theme', () => ({
  Colors: {
    primary: '#059669',
    primaryDark: '#047857',
    primaryFaded: '#E6F4EA',
    light: {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      border: '#E5E7EB',
      text: '#111827',
      textSecondary: '#6B7280',
    },
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: () => null,
}));

jest.mock('@/components/scenery', () => ({
  LockHeroScenery: () => null,
}));

jest.mock('@/components/ui/button', () => ({
  Button: () => null,
}));

jest.mock('@/components/ui/card', () => ({
  Card: () => null,
}));

jest.mock('@/components/ui/input', () => ({
  Input: () => null,
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (obj: any) => obj.default ?? obj.web },
  ScrollView: ({ children }: any) => children,
  StyleSheet: { create: (styles: any) => styles },
  Text: ({ children }: any) => children,
  View: ({ children }: any) => children,
}));

import LockScreen from '../lock';

function createLockScreenHarness() {
  const stateMap = new Map<number, any>();
  const refMap = new Map<number, any>();
  const effectMap = new Map<number, { effect: () => (() => void) | void; cleanup?: (() => void) | void }>();
  let stateIndex = 0;
  let refIndex = 0;
  let effectIndex = 0;

  jest.spyOn(React, 'useState').mockImplementation(((initialValue: any) => {
    const idx = stateIndex++;
    if (!stateMap.has(idx)) {
      stateMap.set(idx, typeof initialValue === 'function' ? initialValue() : initialValue);
    }
    const setState = (newVal: any) => {
      const next = typeof newVal === 'function' ? newVal(stateMap.get(idx)) : newVal;
      stateMap.set(idx, next);
    };
    return [stateMap.get(idx), setState];
  }) as any);

  jest.spyOn(React, 'useRef').mockImplementation(((initialValue: any) => {
    const idx = refIndex++;
    if (!refMap.has(idx)) {
      refMap.set(idx, { current: initialValue });
    }
    return refMap.get(idx);
  }) as any);

  jest.spyOn(React, 'useCallback').mockImplementation(((fn: any) => fn) as any);

  jest.spyOn(React, 'useEffect').mockImplementation(((effect: any) => {
    const idx = effectIndex++;
    effectMap.set(idx, { effect });
  }) as any);

  const runEffects = async () => {
    for (const [, item] of effectMap.entries()) {
      const cleanup = item.effect();
      item.cleanup = cleanup;
    }
    // Give async promises inside effects a tick to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  const render = () => {
    stateIndex = 0;
    refIndex = 0;
    effectIndex = 0;
    LockScreen();
  };

  return {
    render,
    runEffects,
    cleanup: () => {
      for (const [, item] of effectMap.entries()) {
        if (typeof item.cleanup === 'function') item.cleanup();
      }
    },
  };
}

describe('LockScreen biometric timing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBiometricsAvailable.mockResolvedValue(true);
    mockIsBiometricsEnabled.mockResolvedValue(true);
    mockIsPasswordAuthExpired.mockResolvedValue(false);
    mockUnlockWithBiometrics.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does NOT trigger biometrics while intro/splash is showing, and triggers once intro completes', async () => {
    mockSplashFinished = false;
    const harness = createLockScreenHarness();

    // 1. Initial mount during splash animation
    harness.render();
    await harness.runEffects();

    // Check biometrics was performed, but biometric prompt was NOT shown
    expect(mockLockApp).toHaveBeenCalled();
    expect(mockIsBiometricsAvailable).toHaveBeenCalled();
    expect(mockUnlockWithBiometrics).not.toHaveBeenCalled();

    // 2. Intro finishes (isSplashFinished becomes true)
    mockSplashFinished = true;
    harness.render();
    await harness.runEffects();

    // Now biometric prompt must have been triggered!
    expect(mockUnlockWithBiometrics).toHaveBeenCalledTimes(1);

    harness.cleanup();
  });

  test('triggers biometrics immediately if splash is already finished (e.g. background auto-lock)', async () => {
    mockSplashFinished = true;
    const harness = createLockScreenHarness();

    harness.render();
    await harness.runEffects();

    // State update for canBiometric triggers re-render
    harness.render();
    await harness.runEffects();

    expect(mockUnlockWithBiometrics).toHaveBeenCalledTimes(1);

    harness.cleanup();
  });
});
