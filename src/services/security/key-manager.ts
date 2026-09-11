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

let initializing = false;

/**
 * Initializes key envelope for the first time during onboarding.
 * Generates a random 256-bit DEK and wraps it using a KEK derived from master password via Argon2id.
 */
export async function initializeKeyEnvelope(masterPassword: string): Promise<SecuritySetupResult> {
  if (initializing) throw new Error('Account creation is already in progress.');
  initializing = true;
  try {
    return await createKeyEnvelope(masterPassword);
  } finally {
    initializing = false;
  }
}

async function createKeyEnvelope(masterPassword: string): Promise<SecuritySetupResult> {
  if (await isKeyEnvelopeInitialized()) {
    throw new Error('An account already exists.');
  }
  const dekHex = generateRandomHex(32); // 256-bit database encryption key
  const saltHex = generateRandomHex(32); // 256-bit random salt for KDF

  const kekHex = await deriveKeyArgon2id(masterPassword, saltHex, DEFAULT_KDF_PARAMS);
  const wrapped = await encryptAesGcm(dekHex, kekHex);

  await setSecureItem(StorageKeys.KEY_ENVELOPE, JSON.stringify({ ...wrapped, saltHex }));

  return { dekHex, saltHex };
}

/**
 * Unwraps the DEK using the provided master password.
 * Throws an error if the password is wrong or ciphertext has been tampered with.
 */
export async function unwrapDEK(masterPassword: string): Promise<string> {
  const envelope = await getSecureItem(StorageKeys.KEY_ENVELOPE);
  if (envelope) {
    const { ciphertextHex, nonceHex, authTagHex, saltHex } = JSON.parse(envelope);
    const kekHex = await deriveKeyArgon2id(masterPassword, saltHex, DEFAULT_KDF_PARAMS);
    return decryptAesGcm(ciphertextHex, kekHex, nonceHex, authTagHex);
  }
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

  // One storage write commits the entire envelope, so failed writes preserve the old password.
  await setSecureItem(StorageKeys.KEY_ENVELOPE, JSON.stringify({ ...newWrapped, saltHex: newSaltHex }));
}

/**
 * Checks if the security setup has been completed
 */
export async function isKeyEnvelopeInitialized(): Promise<boolean> {
  const initialized = await getSecureItem(StorageKeys.IS_INITIALIZED);
  return initialized === 'true' || Boolean(await getSecureItem(StorageKeys.KEY_ENVELOPE))
    || (await getSecureItem(StorageKeys.DELETION_PENDING)) === 'true';
}
