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
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, value);
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  return null;
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(key);
  }
}

export async function setBiometricProtectedItem(): Promise<void> {
  throw new Error('Biometric protected storage is unavailable on web.');
}

export async function getBiometricProtectedItem(): Promise<string | null> {
  return null;
}

export const StorageKeys = KEYS;
