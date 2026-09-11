import { AppState, AppStateStatus, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { closeDatabase, deleteDatabase, initDatabase } from '@/database/database';
import { validatePassword } from '@/shared/validators';

import { rewrapDEK, unwrapDEK } from './key-manager';
import {
  StorageKeys,
  deleteSecureItem,
  getBiometricProtectedItem,
  getSecureItem,
  setBiometricProtectedItem,
  setSecureItem,
} from './secure-storage';

let activeDekInMemory: string | null = null;
let isUnlockedState: boolean = false;

// Listen for AppState changes to immediately lock app and purge DEK from RAM when leaving app
if (typeof AppState?.addEventListener === 'function') {
  AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background') {
      if (isAppUnlocked()) {
        lockApp();
      }
    }
  });
}

/**
 * Checks if biometric authentication is available on device
 */
export async function isBiometricsAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Checks if biometric unlock is enabled in app settings
 */
export async function isBiometricsEnabled(): Promise<boolean> {
  const enabled = await getSecureItem(StorageKeys.BIOMETRIC_ENABLED);
  return enabled === 'true';
}

/**
 * Sets biometric unlock state
 */
export async function setBiometricsEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    if (!activeDekInMemory) {
      throw new Error('Unlock the app before enabling biometric access.');
    }
    await setBiometricProtectedItem(StorageKeys.BIOMETRIC_DEK, activeDekInMemory);
  } else {
    await deleteSecureItem(StorageKeys.BIOMETRIC_DEK);
  }
  await setSecureItem(StorageKeys.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
}

/**
 * Unlocks the app session with master password
 */
export async function unlockWithPassword(password: string): Promise<boolean> {
  try {
    if (await getSecureItem(StorageKeys.DELETION_PENDING) === 'true') return false;
    const dekHex = await unwrapDEK(password);
    activeDekInMemory = dekHex;
    isUnlockedState = true;

    // Initialize/open DB with DEK
    await initDatabase(dekHex);
    return true;
  } catch {
    activeDekInMemory = null;
    isUnlockedState = false;
    return false;
  }
}

/**
 * Attempts biometric unlock
 */
export async function unlockWithBiometrics(): Promise<boolean> {
  if (await getSecureItem(StorageKeys.DELETION_PENDING) === 'true') return false;
  const canUseBio = (await isBiometricsAvailable()) && (await isBiometricsEnabled());
  if (!canUseBio) {
    return false;
  }

  try {
    const dekHex = await getBiometricProtectedItem(StorageKeys.BIOMETRIC_DEK);
    if (!dekHex) return false;

    activeDekInMemory = dekHex;
    await initDatabase(dekHex);
    isUnlockedState = true;
    return true;
  } catch {
    activeDekInMemory = null;
    isUnlockedState = false;
    return false;
  }
}

/**
 * Locks the app (clears memory DEK and closes DB connection)
 */
export function lockApp(): void {
  activeDekInMemory = null;
  isUnlockedState = false;
  void closeDatabase().catch(() => undefined);
}

/**
 * Returns whether app is currently unlocked
 */
export function isAppUnlocked(): boolean {
  return isUnlockedState && activeDekInMemory !== null;
}

/**
 * Returns active DEK from memory if unlocked
 */
export function getActiveDek(): string | null {
  return activeDekInMemory;
}

let accountOperation = false;
let deletionOperation: Promise<void> | null = null;

async function verifyCurrentPassword(password: string): Promise<void> {
  const activeDek = getActiveDek();
  if (!activeDek || !isAppUnlocked()) throw new Error('accountSecurity.sessionExpired');
  let dek: string;
  try {
    dek = await unwrapDEK(password);
  } catch {
    throw new Error('accountSecurity.incorrectPassword');
  }
  if (dek !== activeDek || getActiveDek() !== activeDek || !isAppUnlocked()) {
    throw new Error('accountSecurity.sessionExpired');
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (accountOperation) throw new Error('accountSecurity.busy');
  const validation = validatePassword(newPassword);
  if (!validation.isValid) throw new Error(validation.errorKey);
  if (currentPassword === newPassword) throw new Error('accountSecurity.samePassword');
  accountOperation = true;
  try {
    await verifyCurrentPassword(currentPassword);
    await rewrapDEK(currentPassword, newPassword);
  } finally {
    accountOperation = false;
  }
}

/** The durable marker allows an interrupted, already-confirmed deletion to finish on restart. */
export async function resumeAccountDeletion(): Promise<void> {
  if (deletionOperation) return deletionOperation;
  deletionOperation = (async () => {
    if (await getSecureItem(StorageKeys.DELETION_PENDING) !== 'true') return;
    activeDekInMemory = null;
    isUnlockedState = false;
    await deleteDatabase();
    for (const key of Object.values(StorageKeys)) {
      if (key !== StorageKeys.LANGUAGE && key !== StorageKeys.DELETION_PENDING) {
        await deleteSecureItem(key);
      }
    }
    await deleteSecureItem(StorageKeys.DELETION_PENDING);
  })();
  try {
    await deletionOperation;
  } finally {
    deletionOperation = null;
  }
}

export async function deleteAccount(password: string): Promise<void> {
  if (accountOperation) throw new Error('accountSecurity.busy');
  accountOperation = true;
  try {
    if (await getSecureItem(StorageKeys.DELETION_PENDING) === 'true') {
      await resumeAccountDeletion();
      return;
    }
    await verifyCurrentPassword(password);
    await setSecureItem(StorageKeys.DELETION_PENDING, 'true');
    await resumeAccountDeletion();
  } finally {
    accountOperation = false;
  }
}
