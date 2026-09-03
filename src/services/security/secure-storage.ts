import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  WRAPPED_DEK: 'nuvora_wrapped_dek',
  KDF_SALT: 'nuvora_kdf_salt',
  DEK_NONCE: 'nuvora_dek_nonce',
  DEK_TAG: 'nuvora_dek_tag',
  BIOMETRIC_ENABLED: 'nuvora_biometric_enabled',
  BIOMETRIC_DEK: 'nuvora_biometric_dek',
  LANGUAGE: 'nuvora_language',
  IS_INITIALIZED: 'nuvora_is_initialized',
};

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web' || typeof window !== 'undefined') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web' || typeof window !== 'undefined') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return null;
  }
  return await SecureStore.getItemAsync(key);
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web' || typeof window !== 'undefined') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function setBiometricProtectedItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Biometric protected storage is unavailable on web.');
  }

  await SecureStore.setItemAsync(key, value, {
    requireAuthentication: true,
    authenticationPrompt: 'Xác thực để bật mở khóa nhanh Nuvora',
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getBiometricProtectedItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  return SecureStore.getItemAsync(key, {
    requireAuthentication: true,
    authenticationPrompt: 'Xác thực để mở khóa Nuvora',
  });
}

export const StorageKeys = KEYS;
