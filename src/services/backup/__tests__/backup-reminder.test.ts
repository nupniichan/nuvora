import {
  calculateBackupReminderStatus,
  getIntervalDays,
  getBackupReminderConfig,
  setBackupReminderConfig,
  recordBackupCompleted,
  dismissBackupReminder,
  checkBackupReminderStatus,
  BackupReminderConfig,
} from '../backup-reminder';

let mockSettings: Record<string, string> = {};

jest.mock('@/database/database', () => ({
  getDatabase: () => ({
    getAllAsync: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('FROM app_settings')) {
        return Object.entries(mockSettings)
          .filter(([key]) => !params || params.includes(key))
          .map(([key, value]) => ({ key, value }));
      }
      return [];
    }),
    runAsync: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
      if (sql.startsWith('INSERT OR REPLACE INTO app_settings')) {
        const [key, value] = params;
        mockSettings[key] = value;
      } else if (sql.startsWith('DELETE FROM app_settings WHERE key = ?')) {
        const [key] = params;
        delete mockSettings[key];
      }
      return { changes: 1 };
    }),
  }),
}));

describe('backup-reminder', () => {
  beforeEach(() => {
    mockSettings = {};
  });

  describe('getIntervalDays', () => {
    it('returns correct days for each frequency', () => {
      expect(getIntervalDays('weekly')).toBe(7);
      expect(getIntervalDays('biweekly')).toBe(14);
      expect(getIntervalDays('monthly')).toBe(30);
      expect(getIntervalDays('custom', 10)).toBe(10);
      expect(getIntervalDays('custom', null)).toBe(7);
      expect(getIntervalDays('off')).toBe(0);
    });
  });

  describe('calculateBackupReminderStatus', () => {
    const baseDate = new Date('2026-09-21T10:00:00.000Z');

    it('returns disabled when enabled is false', () => {
      const config: BackupReminderConfig = {
        enabled: false,
        frequency: 'weekly',
        lastBackupAt: null,
        dismissedAt: null,
      };
      const res = calculateBackupReminderStatus(config, baseDate);
      expect(res.isDue).toBe(false);
      expect(res.reason).toBe('disabled');
    });

    it('returns disabled when frequency is off', () => {
      const config: BackupReminderConfig = {
        enabled: true,
        frequency: 'off',
        lastBackupAt: null,
        dismissedAt: null,
      };
      const res = calculateBackupReminderStatus(config, baseDate);
      expect(res.isDue).toBe(false);
      expect(res.reason).toBe('disabled');
    });

    it('returns never_backed_up when lastBackupAt is null', () => {
      const config: BackupReminderConfig = {
        enabled: true,
        frequency: 'weekly',
        lastBackupAt: null,
        dismissedAt: null,
      };
      const res = calculateBackupReminderStatus(config, baseDate);
      expect(res.isDue).toBe(true);
      expect(res.reason).toBe('never_backed_up');
      expect(res.daysSinceLastBackup).toBeNull();
    });

    it('returns dismissed if dismissed recently within 48 hours', () => {
      const dismissed = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const config: BackupReminderConfig = {
        enabled: true,
        frequency: 'weekly',
        lastBackupAt: new Date(baseDate.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        dismissedAt: dismissed,
      };
      const res = calculateBackupReminderStatus(config, baseDate);
      expect(res.isDue).toBe(false);
      expect(res.reason).toBe('dismissed');
      expect(res.daysSinceLastBackup).toBe(10);
    });

    it('considers interval if dismissed more than 48 hours ago', () => {
      const dismissed = new Date(baseDate.getTime() - 50 * 60 * 60 * 1000).toISOString();
      const config: BackupReminderConfig = {
        enabled: true,
        frequency: 'weekly',
        lastBackupAt: new Date(baseDate.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        dismissedAt: dismissed,
      };
      const res = calculateBackupReminderStatus(config, baseDate);
      expect(res.isDue).toBe(true);
      expect(res.reason).toBe('interval_elapsed');
      expect(res.daysSinceLastBackup).toBe(8);
    });

    it('returns not_due when within weekly interval (e.g. 5 days ago)', () => {
      const config: BackupReminderConfig = {
        enabled: true,
        frequency: 'weekly',
        lastBackupAt: new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        dismissedAt: null,
      };
      const res = calculateBackupReminderStatus(config, baseDate);
      expect(res.isDue).toBe(false);
      expect(res.reason).toBe('not_due');
      expect(res.daysSinceLastBackup).toBe(5);
    });

    it('returns interval_elapsed when weekly interval has passed (e.g. 7 days)', () => {
      const config: BackupReminderConfig = {
        enabled: true,
        frequency: 'weekly',
        lastBackupAt: new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        dismissedAt: null,
      };
      const res = calculateBackupReminderStatus(config, baseDate);
      expect(res.isDue).toBe(true);
      expect(res.reason).toBe('interval_elapsed');
      expect(res.daysSinceLastBackup).toBe(7);
    });

    it('correctly handles biweekly and monthly thresholds', () => {
      const biweeklyNotDue: BackupReminderConfig = {
        enabled: true,
        frequency: 'biweekly',
        lastBackupAt: new Date(baseDate.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString(),
        dismissedAt: null,
      };
      expect(calculateBackupReminderStatus(biweeklyNotDue, baseDate).isDue).toBe(false);

      const biweeklyDue: BackupReminderConfig = {
        enabled: true,
        frequency: 'biweekly',
        lastBackupAt: new Date(baseDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        dismissedAt: null,
      };
      expect(calculateBackupReminderStatus(biweeklyDue, baseDate).isDue).toBe(true);

      // Monthly: 29 days is not due, 30 days is due
      const monthlyNotDue: BackupReminderConfig = {
        enabled: true,
        frequency: 'monthly',
        lastBackupAt: new Date(baseDate.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString(),
        dismissedAt: null,
      };
      expect(calculateBackupReminderStatus(monthlyNotDue, baseDate).isDue).toBe(false);

      const monthlyDue: BackupReminderConfig = {
        enabled: true,
        frequency: 'monthly',
        lastBackupAt: new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        dismissedAt: null,
      };
      expect(calculateBackupReminderStatus(monthlyDue, baseDate).isDue).toBe(true);

      // Custom: 5 days interval
      const customNotDue: BackupReminderConfig = {
        enabled: true,
        frequency: 'custom',
        customDays: 5,
        lastBackupAt: new Date(baseDate.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        dismissedAt: null,
      };
      expect(calculateBackupReminderStatus(customNotDue, baseDate).isDue).toBe(false);

      const customDue: BackupReminderConfig = {
        enabled: true,
        frequency: 'custom',
        customDays: 5,
        lastBackupAt: new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        dismissedAt: null,
      };
      expect(calculateBackupReminderStatus(customDue, baseDate).isDue).toBe(true);
    });

    it('handles clock skew gracefully when last backup is in the future', () => {
      const futureDate = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const config: BackupReminderConfig = {
        enabled: true,
        frequency: 'weekly',
        lastBackupAt: futureDate,
        dismissedAt: null,
      };
      const res = calculateBackupReminderStatus(config, baseDate);
      expect(res.isDue).toBe(false);
      expect(res.reason).toBe('not_due');
      expect(res.daysSinceLastBackup).toBe(0);
    });
  });

  describe('Database interaction methods', () => {
    it('returns default config when database settings are empty', async () => {
      const config = await getBackupReminderConfig();
      expect(config.enabled).toBe(true);
      expect(config.frequency).toBe('weekly');
      expect(config.lastBackupAt).toBeNull();
      expect(config.dismissedAt).toBeNull();
    });

    it('updates and retrieves config properly', async () => {
      await setBackupReminderConfig({
        enabled: false,
        frequency: 'monthly',
      });
      let config = await getBackupReminderConfig();
      expect(config.enabled).toBe(false);
      expect(config.frequency).toBe('monthly');

      await setBackupReminderConfig({
        enabled: true,
        frequency: 'biweekly',
      });
      config = await getBackupReminderConfig();
      expect(config.enabled).toBe(true);
      expect(config.frequency).toBe('biweekly');

      await setBackupReminderConfig({
        frequency: 'custom',
        customDays: 10,
        targetFolderName: 'NuvoraBackups',
        targetUri: 'content://com.android.externalstorage.documents/tree/primary%3ANuvoraBackups',
        autoSaveToFolder: true,
      });
      config = await getBackupReminderConfig();
      expect(config.frequency).toBe('custom');
      expect(config.customDays).toBe(10);
      expect(config.targetFolderName).toBe('NuvoraBackups');
      expect(config.targetUri).toBe('content://com.android.externalstorage.documents/tree/primary%3ANuvoraBackups');
      expect(config.autoSaveToFolder).toBe(true);

      await setBackupReminderConfig({
        autoSaveToFolder: false,
      });
      config = await getBackupReminderConfig();
      expect(config.autoSaveToFolder).toBe(false);
      expect(config.targetFolderName).toBe('NuvoraBackups');
    });

    it('records backup completed and clears dismissal', async () => {
      await dismissBackupReminder();
      let config = await getBackupReminderConfig();
      expect(config.dismissedAt).not.toBeNull();

      const backupTime = '2026-09-21T12:00:00.000Z';
      await recordBackupCompleted(backupTime);

      config = await getBackupReminderConfig();
      expect(config.lastBackupAt).toBe(backupTime);
      expect(config.dismissedAt).toBeNull();
    });

    it('dismisses reminder properly and checkBackupReminderStatus uses it', async () => {
      const now = new Date('2026-09-21T12:00:00.000Z');
      await recordBackupCompleted(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString());

      let status = await checkBackupReminderStatus(now);
      expect(status.isDue).toBe(true);

      await dismissBackupReminder(now);
      status = await checkBackupReminderStatus(now);
      expect(status.isDue).toBe(false);
      expect(status.reason).toBe('dismissed');
    });
  });
});
