import { changePassword, deleteAccount, getActiveDek, isAppUnlocked, lockApp, resumeAccountDeletion, unlockWithPassword } from '../auth-service';
import { initializeKeyEnvelope, isKeyEnvelopeInitialized, unwrapDEK } from '../key-manager';
import { StorageKeys } from '../secure-storage';
import { getDatabase, closeDatabase } from '@/database/database';

jest.mock('react-native', () => ({ Platform: { OS: 'web' }, AppState: { addEventListener: jest.fn() } }));
jest.mock('expo-local-authentication', () => ({}));
jest.mock('../crypto', () => jest.requireActual('../crypto.web'));
jest.mock('../secure-storage', () => jest.requireActual('../secure-storage.web'));
jest.mock('@/database/database', () => jest.requireActual('@/database/database.web'));

const values = new Map<string, string>();
const { webcrypto } = jest.requireActual('node:crypto');
const storage = {
  getItem: jest.fn((key: string) => values.get(key) ?? null),
  setItem: jest.fn((key: string, value: string) => { values.set(key, value); }),
  removeItem: jest.fn((key: string) => { values.delete(key); }),
};
const password = 'old-password-123';

beforeEach(async () => {
  await closeDatabase();
  lockApp();
  values.clear();
  storage.setItem.mockImplementation((key, value) => { values.set(key, value); });
  storage.removeItem.mockImplementation((key) => { values.delete(key); });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage, crypto: webcrypto } });
  await initializeKeyEnvelope(password);
  expect(await unlockWithPassword(password)).toBe(true);
});

test('password rotation keeps the DEK and database and rejects the old password', async () => {
  const dek = getActiveDek();
  const db = getDatabase();
  await db.runAsync('INSERT INTO accounts (id, name) VALUES (?, ?)', ['wallet', 'My wallet']);
  await changePassword(password, 'new-password-123');
  expect(await unwrapDEK('new-password-123')).toBe(dek);
  await expect(unwrapDEK(password)).rejects.toThrow();
  expect(await db.getAllAsync('SELECT * FROM accounts')).toHaveLength(1);
});

test('wrong passwords cannot rotate or delete an account', async () => {
  const snapshot = new Map(values);
  await expect(changePassword('incorrect', 'new-password-123')).rejects.toThrow('incorrectPassword');
  await expect(deleteAccount('incorrect')).rejects.toThrow('incorrectPassword');
  expect(values).toEqual(snapshot);
  expect(isAppUnlocked()).toBe(true);
});

test('failed envelope commit leaves the old password usable', async () => {
  storage.setItem.mockImplementationOnce(() => { throw new Error('Storage full'); });
  await expect(changePassword(password, 'new-password-123')).rejects.toThrow('Storage full');
  expect(await unwrapDEK(password)).toBe(getActiveDek());
  await expect(unwrapDEK('new-password-123')).rejects.toThrow();
});

test('legacy accounts can rotate without changing their DEK', async () => {
  const envelope = JSON.parse(values.get(StorageKeys.KEY_ENVELOPE)!);
  values.set(StorageKeys.WRAPPED_DEK, envelope.ciphertextHex);
  values.set(StorageKeys.DEK_NONCE, envelope.nonceHex);
  values.set(StorageKeys.DEK_TAG, envelope.authTagHex);
  values.set(StorageKeys.KDF_SALT, envelope.saltHex);
  values.set(StorageKeys.IS_INITIALIZED, 'true');
  values.delete(StorageKeys.KEY_ENVELOPE);
  const dek = getActiveDek();
  await changePassword(password, 'new-password-123');
  expect(await unwrapDEK('new-password-123')).toBe(dek);
  await expect(unwrapDEK(password)).rejects.toThrow();
});

test('deletion removes local data and biometric keys, then permits a fresh account', async () => {
  const oldDb = getDatabase();
  await oldDb.runAsync('INSERT INTO accounts (id, name) VALUES (?, ?)', ['old', 'Old account']);
  values.set(StorageKeys.BIOMETRIC_DEK, 'biometric-key');
  values.set(StorageKeys.BIOMETRIC_ENABLED, 'true');
  values.set(StorageKeys.LANGUAGE, 'en');
  values.set('unrelated-app', 'keep');
  await deleteAccount(password);
  expect(isAppUnlocked()).toBe(false);
  expect(getActiveDek()).toBeNull();
  expect(await isKeyEnvelopeInitialized()).toBe(false);
  expect(values).toEqual(new Map([[StorageKeys.LANGUAGE, 'en'], ['unrelated-app', 'keep']]));

  await oldDb.runAsync('INSERT INTO accounts (id, name) VALUES (?, ?)', ['late', 'Late write']);
  expect(values.has('nuvora_web_db_tables')).toBe(false);
  await initializeKeyEnvelope('fresh-password');
  expect(await unlockWithPassword('fresh-password')).toBe(true);
  expect(await getDatabase().getAllAsync('SELECT * FROM accounts')).toHaveLength(0);
});

test('interrupted deletion stays blocked and resumes without requiring deleted credentials', async () => {
  storage.removeItem.mockImplementationOnce(() => { throw new Error('Storage unavailable'); });
  await expect(deleteAccount(password)).rejects.toThrow('Storage unavailable');
  expect(values.get(StorageKeys.DELETION_PENDING)).toBe('true');
  expect(await unlockWithPassword(password)).toBe(false);
  expect(await isKeyEnvelopeInitialized()).toBe(true);
  await expect(initializeKeyEnvelope('replacement-password')).rejects.toThrow('already exists');
  await resumeAccountDeletion();
  expect(await isKeyEnvelopeInitialized()).toBe(false);
});

test('existing account cannot be overwritten by onboarding', async () => {
  const snapshot = new Map(values);
  await expect(initializeKeyEnvelope('replacement-password')).rejects.toThrow('already exists');
  expect(values).toEqual(snapshot);
});

test('concurrent onboarding cannot create two different key envelopes', async () => {
  await deleteAccount(password);
  const results = await Promise.allSettled([
    initializeKeyEnvelope('first-password'),
    initializeKeyEnvelope('second-password'),
  ]);
  expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
  await expect(unwrapDEK('first-password')).resolves.toBeTruthy();
  await expect(unwrapDEK('second-password')).rejects.toThrow();
});

test('password validation and locked sessions prevent account changes', async () => {
  await expect(changePassword(password, 'short')).rejects.toThrow('passwordTooShort');
  await expect(changePassword(password, password)).rejects.toThrow('samePassword');
  lockApp();
  await expect(changePassword(password, 'new-password-123')).rejects.toThrow('sessionExpired');
  await expect(deleteAccount(password)).rejects.toThrow('sessionExpired');
});
