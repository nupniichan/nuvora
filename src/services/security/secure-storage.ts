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
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

export async function getSecureItem(key: string): Promise<string | null> {
  return await SecureStore.getItemAsync(key);
}

export async function deleteSecureItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export const StorageKeys = KEYS;
