import { getDatabase } from '@/database/database';
import { nowISO } from '@/shared/date-utils';

export type BackupReminderFrequency = 'weekly' | 'biweekly' | 'monthly' | 'custom' | 'off';

export type BackupReminderReason =
  | 'not_due'
  | 'disabled'
  | 'dismissed'
  | 'never_backed_up'
  | 'interval_elapsed';

export interface BackupReminderConfig {
  enabled: boolean;
  frequency: BackupReminderFrequency;
  customDays?: number | null;
  lastBackupAt: string | null;
  dismissedAt: string | null;
  targetFolderName?: string | null;
  targetUri?: string | null;
  autoSaveToFolder?: boolean;
}

export interface BackupReminderStatus {
  isDue: boolean;
  daysSinceLastBackup: number | null;
  dueDate: string | null;
  reason: BackupReminderReason;
  frequency: BackupReminderFrequency;
  customDays?: number | null;
  lastBackupAt: string | null;
  targetFolderName?: string | null;
  autoSaveToFolder?: boolean;
}

export const BACKUP_SETTING_KEYS = {
  ENABLED: 'backup_reminder_enabled',
  FREQUENCY: 'backup_reminder_frequency',
  CUSTOM_DAYS: 'backup_reminder_custom_days',
  LAST_DATE: 'backup_last_date',
  DISMISSED_AT: 'backup_reminder_dismissed_at',
  TARGET_FOLDER_NAME: 'backup_target_folder_name',
  TARGET_URI: 'backup_target_uri',
  AUTO_SAVE_ENABLED: 'backup_auto_save_enabled',
} as const;

export const SNOOZE_WINDOW_MS = 48 * 60 * 60 * 1000;

export function getIntervalDays(frequency: BackupReminderFrequency, customDays?: number | null): number {
  switch (frequency) {
    case 'weekly':
      return 7;
    case 'biweekly':
      return 14;
    case 'monthly':
      return 30;
    case 'custom':
      return Math.max(1, customDays ?? 7);
    case 'off':
    default:
      return 0;
  }
}

export function calculateBackupReminderStatus(
  config: BackupReminderConfig,
  now: Date = new Date()
): BackupReminderStatus {
  const { enabled, frequency, lastBackupAt, dismissedAt } = config;

  if (!enabled || frequency === 'off') {
    return {
      isDue: false,
      daysSinceLastBackup: null,
      dueDate: null,
      reason: 'disabled',
      frequency,
      lastBackupAt,
      targetFolderName: config.targetFolderName,
      autoSaveToFolder: config.autoSaveToFolder,
    };
  }

  if (dismissedAt) {
    const dismissedTime = new Date(dismissedAt).getTime();
    if (!isNaN(dismissedTime) && now.getTime() - dismissedTime < SNOOZE_WINDOW_MS) {
      return {
        isDue: false,
        daysSinceLastBackup: lastBackupAt ? Math.max(0, Math.floor((now.getTime() - new Date(lastBackupAt).getTime()) / (24 * 60 * 60 * 1000))) : null,
        dueDate: null,
        reason: 'dismissed',
        frequency,
        lastBackupAt,
        targetFolderName: config.targetFolderName,
        autoSaveToFolder: config.autoSaveToFolder,
      };
    }
  }

  if (!lastBackupAt) {
    return {
      isDue: true,
      daysSinceLastBackup: null,
      dueDate: null,
      reason: 'never_backed_up',
      frequency,
      lastBackupAt: null,
      targetFolderName: config.targetFolderName,
      autoSaveToFolder: config.autoSaveToFolder,
    };
  }

  const lastBackupTime = new Date(lastBackupAt).getTime();
  if (isNaN(lastBackupTime)) {
    return {
      isDue: true,
      daysSinceLastBackup: null,
      dueDate: null,
      reason: 'never_backed_up',
      frequency,
      lastBackupAt: null,
      targetFolderName: config.targetFolderName,
      autoSaveToFolder: config.autoSaveToFolder,
    };
  }

  if (lastBackupTime > now.getTime()) {
    return {
      isDue: false,
      daysSinceLastBackup: 0,
      dueDate: null,
      reason: 'not_due',
      frequency,
      lastBackupAt,
      targetFolderName: config.targetFolderName,
      autoSaveToFolder: config.autoSaveToFolder,
    };
  }

  const intervalDays = getIntervalDays(frequency, config.customDays);
  const diffMs = now.getTime() - lastBackupTime;
  const daysSince = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const dueTime = lastBackupTime + intervalDays * 24 * 60 * 60 * 1000;
  const dueDate = new Date(dueTime).toISOString();

  if (now.getTime() >= dueTime) {
    return {
      isDue: true,
      daysSinceLastBackup: daysSince,
      dueDate,
      reason: 'interval_elapsed',
      frequency,
      customDays: config.customDays,
      lastBackupAt,
      targetFolderName: config.targetFolderName,
      autoSaveToFolder: config.autoSaveToFolder,
    };
  }

  return {
    isDue: false,
    daysSinceLastBackup: daysSince,
    dueDate,
    reason: 'not_due',
    frequency,
    customDays: config.customDays,
    lastBackupAt,
    targetFolderName: config.targetFolderName,
    autoSaveToFolder: config.autoSaveToFolder,
  };
}

export async function getBackupReminderConfig(): Promise<BackupReminderConfig> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings WHERE key IN (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      BACKUP_SETTING_KEYS.ENABLED,
      BACKUP_SETTING_KEYS.FREQUENCY,
      BACKUP_SETTING_KEYS.CUSTOM_DAYS,
      BACKUP_SETTING_KEYS.LAST_DATE,
      BACKUP_SETTING_KEYS.DISMISSED_AT,
      BACKUP_SETTING_KEYS.TARGET_FOLDER_NAME,
      BACKUP_SETTING_KEYS.TARGET_URI,
      BACKUP_SETTING_KEYS.AUTO_SAVE_ENABLED,
    ]
  );

  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.key, row.value);
  }

  const enabledVal = map.get(BACKUP_SETTING_KEYS.ENABLED);
  const enabled = enabledVal !== undefined ? enabledVal === 'true' : true;

  const freqVal = map.get(BACKUP_SETTING_KEYS.FREQUENCY);
  let frequency: BackupReminderFrequency = 'weekly';
  if (freqVal === 'biweekly' || freqVal === 'monthly' || freqVal === 'custom' || freqVal === 'off') {
    frequency = freqVal;
  }

  const customDaysRaw = map.get(BACKUP_SETTING_KEYS.CUSTOM_DAYS);
  const parsedDays = customDaysRaw ? parseInt(customDaysRaw, 10) : null;
  const customDays = parsedDays !== null && !isNaN(parsedDays) && parsedDays > 0 ? parsedDays : null;

  const lastBackupAt = map.get(BACKUP_SETTING_KEYS.LAST_DATE) || null;
  const dismissedAt = map.get(BACKUP_SETTING_KEYS.DISMISSED_AT) || null;
  const targetFolderName = map.get(BACKUP_SETTING_KEYS.TARGET_FOLDER_NAME) || null;
  const targetUri = map.get(BACKUP_SETTING_KEYS.TARGET_URI) || null;
  const autoSaveToFolder = map.get(BACKUP_SETTING_KEYS.AUTO_SAVE_ENABLED) === 'true';

  return {
    enabled,
    frequency,
    customDays,
    lastBackupAt,
    dismissedAt,
    targetFolderName,
    targetUri,
    autoSaveToFolder,
  };
}

export async function setBackupReminderConfig(
  updates: Partial<BackupReminderConfig>
): Promise<void> {
  const db = getDatabase();
  const now = nowISO();

  if (updates.enabled !== undefined) {
    await db.runAsync(
      `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
      [BACKUP_SETTING_KEYS.ENABLED, updates.enabled ? 'true' : 'false', now]
    );
  }

  if (updates.frequency !== undefined) {
    await db.runAsync(
      `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
      [BACKUP_SETTING_KEYS.FREQUENCY, updates.frequency, now]
    );
  }

  if (updates.customDays !== undefined) {
    if (updates.customDays === null) {
      await db.runAsync(`DELETE FROM app_settings WHERE key = ?;`, [BACKUP_SETTING_KEYS.CUSTOM_DAYS]);
    } else {
      await db.runAsync(
        `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
        [BACKUP_SETTING_KEYS.CUSTOM_DAYS, String(updates.customDays), now]
      );
    }
  }

  if (updates.lastBackupAt !== undefined) {
    if (updates.lastBackupAt === null) {
      await db.runAsync(`DELETE FROM app_settings WHERE key = ?;`, [BACKUP_SETTING_KEYS.LAST_DATE]);
    } else {
      await db.runAsync(
        `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
        [BACKUP_SETTING_KEYS.LAST_DATE, updates.lastBackupAt, now]
      );
    }
  }

  if (updates.dismissedAt !== undefined) {
    if (updates.dismissedAt === null) {
      await db.runAsync(`DELETE FROM app_settings WHERE key = ?;`, [BACKUP_SETTING_KEYS.DISMISSED_AT]);
    } else {
      await db.runAsync(
        `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
        [BACKUP_SETTING_KEYS.DISMISSED_AT, updates.dismissedAt, now]
      );
    }
  }

  if (updates.targetFolderName !== undefined) {
    if (updates.targetFolderName === null) {
      await db.runAsync(`DELETE FROM app_settings WHERE key = ?;`, [BACKUP_SETTING_KEYS.TARGET_FOLDER_NAME]);
    } else {
      await db.runAsync(
        `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
        [BACKUP_SETTING_KEYS.TARGET_FOLDER_NAME, updates.targetFolderName, now]
      );
    }
  }

  if (updates.targetUri !== undefined) {
    if (updates.targetUri === null) {
      await db.runAsync(`DELETE FROM app_settings WHERE key = ?;`, [BACKUP_SETTING_KEYS.TARGET_URI]);
    } else {
      await db.runAsync(
        `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
        [BACKUP_SETTING_KEYS.TARGET_URI, updates.targetUri, now]
      );
    }
  }

  if (updates.autoSaveToFolder !== undefined) {
    await db.runAsync(
      `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
      [BACKUP_SETTING_KEYS.AUTO_SAVE_ENABLED, updates.autoSaveToFolder ? 'true' : 'false', now]
    );
  }
}

export async function recordBackupCompleted(timestamp: string = nowISO()): Promise<void> {
  const db = getDatabase();
  const now = nowISO();

  await db.runAsync(
    `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
    [BACKUP_SETTING_KEYS.LAST_DATE, timestamp, now]
  );
  await db.runAsync(`DELETE FROM app_settings WHERE key = ?;`, [BACKUP_SETTING_KEYS.DISMISSED_AT]);
}

export async function dismissBackupReminder(now: Date = new Date()): Promise<void> {
  const db = getDatabase();
  const nowStr = now.toISOString();

  await db.runAsync(
    `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
    [BACKUP_SETTING_KEYS.DISMISSED_AT, nowStr, nowStr]
  );
}

export async function checkBackupReminderStatus(now: Date = new Date()): Promise<BackupReminderStatus> {
  const config = await getBackupReminderConfig();
  return calculateBackupReminderStatus(config, now);
}
