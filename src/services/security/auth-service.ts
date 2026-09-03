import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { initDatabase } from '@/database/database';

import { unwrapDEK } from './key-manager';
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
 * Locks the app (clears memory DEK)
 */
export function lockApp(): void {
  activeDekInMemory = null;
  isUnlockedState = false;
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
