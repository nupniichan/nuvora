import {
  DEFAULT_KDF_PARAMS,
  decryptAesGcm,
  deriveKeyArgon2id,
  encryptAesGcm,
  generateRandomHex,
} from './crypto';
import { StorageKeys, getSecureItem, setSecureItem } from './secure-storage';

export interface SecuritySetupResult {
  dekHex: string;
  saltHex: string;
}

/**
 * Initializes key envelope for the first time during onboarding.
 * Generates a random 256-bit DEK and wraps it using a KEK derived from master password via Argon2id.
 */
export async function initializeKeyEnvelope(masterPassword: string): Promise<SecuritySetupResult> {
  const dekHex = generateRandomHex(32); // 256-bit database encryption key
  const saltHex = generateRandomHex(32); // 256-bit random salt for KDF

  const kekHex = await deriveKeyArgon2id(masterPassword, saltHex, DEFAULT_KDF_PARAMS);
  const wrapped = await encryptAesGcm(dekHex, kekHex);

  await setSecureItem(StorageKeys.WRAPPED_DEK, wrapped.ciphertextHex);
  await setSecureItem(StorageKeys.DEK_NONCE, wrapped.nonceHex);
  await setSecureItem(StorageKeys.DEK_TAG, wrapped.authTagHex);
  await setSecureItem(StorageKeys.KDF_SALT, saltHex);
  await setSecureItem(StorageKeys.IS_INITIALIZED, 'true');

  return { dekHex, saltHex };
}

/**
 * Unwraps the DEK using the provided master password.
 * Throws an error if the password is wrong or ciphertext has been tampered with.
 */
export async function unwrapDEK(masterPassword: string): Promise<string> {
  const wrappedHex = await getSecureItem(StorageKeys.WRAPPED_DEK);
  const nonceHex = await getSecureItem(StorageKeys.DEK_NONCE);
  const authTagHex = await getSecureItem(StorageKeys.DEK_TAG);
  const saltHex = await getSecureItem(StorageKeys.KDF_SALT);

  if (!wrappedHex || !nonceHex || !authTagHex || !saltHex) {
    throw new Error('Key envelope is incomplete or missing.');
  }

  const kekHex = await deriveKeyArgon2id(masterPassword, saltHex, DEFAULT_KDF_PARAMS);

  try {
    const dekHex = await decryptAesGcm(wrappedHex, kekHex, nonceHex, authTagHex);
    return dekHex;
  } catch {
    throw new Error('Incorrect password or corrupted key envelope.');
  }
}

/**
 * Re-wraps the DEK with a new master password (e.g. Password Change)
 * Does NOT require decrypting or re-encrypting the underlying database!
 */
export async function rewrapDEK(oldPassword: string, newPassword: string): Promise<void> {
  const dekHex = await unwrapDEK(oldPassword);
  const newSaltHex = generateRandomHex(32);

  const newKekHex = await deriveKeyArgon2id(newPassword, newSaltHex, DEFAULT_KDF_PARAMS);
  const newWrapped = await encryptAesGcm(dekHex, newKekHex);

  await setSecureItem(StorageKeys.WRAPPED_DEK, newWrapped.ciphertextHex);
  await setSecureItem(StorageKeys.DEK_NONCE, newWrapped.nonceHex);
  await setSecureItem(StorageKeys.DEK_TAG, newWrapped.authTagHex);
  await setSecureItem(StorageKeys.KDF_SALT, newSaltHex);
}

/**
 * Checks if the security setup has been completed
 */
export async function isKeyEnvelopeInitialized(): Promise<boolean> {
  const initialized = await getSecureItem(StorageKeys.IS_INITIALIZED);
  return initialized === 'true';
}
