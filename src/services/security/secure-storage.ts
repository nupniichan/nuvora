import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  WRAPPED_DEK: 'nuvora_wrapped_dek',
  KDF_SALT: 'nuvora_kdf_salt',
  DEK_NONCE: 'nuvora_dek_nonce',
  DEK_TAG: 'nuvora_dek_tag',
  BIOMETRIC_ENABLED: 'nuvora_biometric_enabled',
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

export const StorageKeys = KEYS;
