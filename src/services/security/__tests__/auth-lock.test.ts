import { closeDatabase } from '@/database/database';
import { getAppLanguage, normalizeLanguage, setAppLanguage } from '@/i18n';
import {
  getActiveDek,
  isAppUnlocked,
  lockApp,
} from '../auth-service';

(globalThis as any).__mockAppStateHandlers = (globalThis as any).__mockAppStateHandlers || [];

jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn((event: string, handler: (state: string) => void) => {
      (globalThis as any).__mockAppStateHandlers = (globalThis as any).__mockAppStateHandlers || [];
      if (event === 'change') {
        (globalThis as any).__mockAppStateHandlers.push(handler);
      }
      return {
        remove: jest.fn(() => {
          const list = (globalThis as any).__mockAppStateHandlers;
          const idx = list.indexOf(handler);
          if (idx !== -1) list.splice(idx, 1);
        }),
      };
    }),
  },
}));

jest.mock('@/services/security/crypto', () => ({
  DEFAULT_KDF_PARAMS: {},
  generateRandomHex: (byteCount = 32) => '0'.repeat(byteCount * 2),
  deriveKeyArgon2id: jest.fn().mockResolvedValue('kekhex'),
  encryptAesGcm: jest.fn().mockResolvedValue({ ciphertextHex: 'cipher', nonceHex: 'nonce', authTagHex: 'tag' }),
  decryptAesGcm: jest.fn().mockResolvedValue('dekhex123'),
}));

jest.mock('@/database/database', () => ({
  initDatabase: jest.fn().mockResolvedValue(undefined),
  closeDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn().mockReturnValue([{ languageCode: 'vi' }]),
}));

describe('Security & Auto-lock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lockApp();
  });

  test('lockApp clears DEK from RAM and closes database', () => {
    lockApp();
    expect(getActiveDek()).toBeNull();
    expect(isAppUnlocked()).toBe(false);
    expect(closeDatabase).toHaveBeenCalled();
  });

  test('AppState change to background triggers lockApp', () => {
    const handlers: ((state: string) => void)[] = (globalThis as any).__mockAppStateHandlers || [];
    expect(handlers.length).toBeGreaterThan(0);
    handlers.forEach((fn) => fn('background'));
    expect(getActiveDek()).toBeNull();
    expect(isAppUnlocked()).toBe(false);
    expect(closeDatabase).toHaveBeenCalled();
  });
});

describe('i18n Language Management', () => {
  test('normalizeLanguage normalizes strings to vi or en', () => {
    expect(normalizeLanguage('en')).toBe('en');
    expect(normalizeLanguage('en-US')).toBe('en');
    expect(normalizeLanguage('EN')).toBe('en');
    expect(normalizeLanguage('vi')).toBe('vi');
    expect(normalizeLanguage('vi-VN')).toBe('vi');
    expect(normalizeLanguage('fr')).toBe('vi');
    expect(normalizeLanguage(null)).toBe('vi');
    expect(normalizeLanguage(undefined)).toBe('vi');
  });

  test('setAppLanguage switches between vi and en seamlessly', async () => {
    await setAppLanguage('en');
    expect(getAppLanguage()).toBe('en');

    await setAppLanguage('vi');
    expect(getAppLanguage()).toBe('vi');

    await setAppLanguage('en');
    expect(getAppLanguage()).toBe('en');
  });
});
