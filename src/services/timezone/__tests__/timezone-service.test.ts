import {
  TIMEZONE_SETTING_KEY,
  SYSTEM_TIMEZONE_VALUE,
  TIMEZONE_OPTIONS,
  formatGmtOffset,
  getSystemGmtOffsetMinutes,
  getSystemGmtString,
  parseGmtOffsetMinutes,
  getPreferredGmt,
  setPreferredGmt,
  getEffectiveGmtOffsetMinutes,
  formatDateTimeInGmt,
  formatDateInGmt,
} from '../timezone-service';

let mockSettings: Record<string, string> = {};

jest.mock('@/database/database', () => ({
  getDatabase: () => ({
    getFirstAsync: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('FROM app_settings')) {
        const key = params[0];
        if (mockSettings[key] !== undefined) {
          return { key, value: mockSettings[key], updated_at: '2026-09-22T00:00:00Z' };
        }
        return null;
      }
      return null;
    }),
    runAsync: jest.fn().mockImplementation(async (sql: string, params: any[]) => {
      if (sql.startsWith('INSERT OR REPLACE INTO app_settings')) {
        const [key, value] = params;
        mockSettings[key] = value;
      }
      return { changes: 1 };
    }),
  }),
}));

describe('timezone-service', () => {
  beforeEach(() => {
    mockSettings = {};
  });

  describe('formatGmtOffset', () => {
    it('formats positive offsets correctly', () => {
      expect(formatGmtOffset(420)).toBe('GMT+07:00');
      expect(formatGmtOffset(540)).toBe('GMT+09:00');
      expect(formatGmtOffset(330)).toBe('GMT+05:30');
      expect(formatGmtOffset(345)).toBe('GMT+05:45');
    });

    it('formats negative offsets correctly', () => {
      expect(formatGmtOffset(-300)).toBe('GMT-05:00');
      expect(formatGmtOffset(-480)).toBe('GMT-08:00');
      expect(formatGmtOffset(-210)).toBe('GMT-03:30');
    });

    it('formats zero offset correctly', () => {
      expect(formatGmtOffset(0)).toBe('GMT+00:00');
    });
  });

  describe('getSystemGmtString', () => {
    it('returns formatted GMT string matching system offset', () => {
      const expected = formatGmtOffset(getSystemGmtOffsetMinutes());
      expect(getSystemGmtString()).toBe(expected);
    });
  });

  describe('parseGmtOffsetMinutes', () => {
    it('parses valid GMT strings correctly', () => {
      expect(parseGmtOffsetMinutes('GMT+07:00')).toBe(420);
      expect(parseGmtOffsetMinutes('+07:00')).toBe(420);
      expect(parseGmtOffsetMinutes('GMT-05:00')).toBe(-300);
      expect(parseGmtOffsetMinutes('-05:00')).toBe(-300);
      expect(parseGmtOffsetMinutes('GMT+00:00')).toBe(0);
      expect(parseGmtOffsetMinutes('GMT+05:30')).toBe(330);
      expect(parseGmtOffsetMinutes('GMT+05:45')).toBe(345);
      expect(parseGmtOffsetMinutes('GMT-09:30')).toBe(-570);
      expect(parseGmtOffsetMinutes('GMT+14:00')).toBe(840);
      expect(parseGmtOffsetMinutes('GMT-12:00')).toBe(-720);
    });

    it('returns null for SYSTEM and invalid inputs', () => {
      expect(parseGmtOffsetMinutes(SYSTEM_TIMEZONE_VALUE)).toBeNull();
      expect(parseGmtOffsetMinutes('')).toBeNull();
      expect(parseGmtOffsetMinutes('INVALID')).toBeNull();
      expect(parseGmtOffsetMinutes('GMT+25:00')).toBeNull();
      expect(parseGmtOffsetMinutes('GMT+14:30')).toBeNull();
      expect(parseGmtOffsetMinutes('GMT+07:75')).toBeNull();
    });
  });

  describe('getPreferredGmt and setPreferredGmt', () => {
    it('defaults to SYSTEM when not configured in app_settings', async () => {
      const gmt = await getPreferredGmt();
      expect(gmt).toBe(SYSTEM_TIMEZONE_VALUE);
    });

    it('persists and retrieves user preferred GMT', async () => {
      await setPreferredGmt('GMT+09:00');
      expect(mockSettings[TIMEZONE_SETTING_KEY]).toBe('GMT+09:00');
      const gmt = await getPreferredGmt();
      expect(gmt).toBe('GMT+09:00');
    });

    it('can reset preference back to SYSTEM', async () => {
      await setPreferredGmt('GMT+09:00');
      expect(await getPreferredGmt()).toBe('GMT+09:00');

      await setPreferredGmt(SYSTEM_TIMEZONE_VALUE);
      expect(await getPreferredGmt()).toBe(SYSTEM_TIMEZONE_VALUE);
    });
  });

  describe('getEffectiveGmtOffsetMinutes', () => {
    it('returns system offset when preferred is SYSTEM or unset', () => {
      const systemOffset = getSystemGmtOffsetMinutes();
      expect(getEffectiveGmtOffsetMinutes(SYSTEM_TIMEZONE_VALUE)).toBe(systemOffset);
      expect(getEffectiveGmtOffsetMinutes()).toBe(systemOffset);
      expect(getEffectiveGmtOffsetMinutes(undefined)).toBe(systemOffset);
    });

    it('returns custom offset when valid preferred GMT is given', () => {
      expect(getEffectiveGmtOffsetMinutes('GMT+07:00')).toBe(420);
      expect(getEffectiveGmtOffsetMinutes('GMT-08:00')).toBe(-480);
      expect(getEffectiveGmtOffsetMinutes('GMT+05:30')).toBe(330);
    });

    it('falls back to system offset when custom string is invalid', () => {
      const systemOffset = getSystemGmtOffsetMinutes();
      expect(getEffectiveGmtOffsetMinutes('INVALID')).toBe(systemOffset);
    });
  });

  describe('formatDateTimeInGmt and formatDateInGmt', () => {
    // 2026-09-22T01:30:00.000Z
    const utcDate = new Date(Date.UTC(2026, 8, 22, 1, 30, 0));

    it('formats correctly for GMT+07:00 (+7 hours => 08:30 on same day)', () => {
      expect(formatDateTimeInGmt(utcDate, 420)).toBe('2026-09-22T08:30:00');
      expect(formatDateInGmt(utcDate, 420)).toBe('2026-09-22');
    });

    it('formats correctly for GMT-05:00 (-5 hours => 20:30 on previous day)', () => {
      expect(formatDateTimeInGmt(utcDate, -300)).toBe('2026-09-21T20:30:00');
      expect(formatDateInGmt(utcDate, -300)).toBe('2026-09-21');
    });

    it('formats correctly for GMT+05:45 (Kathmandu)', () => {
      expect(formatDateTimeInGmt(utcDate, 345)).toBe('2026-09-22T07:15:00');
    });
  });

  describe('TIMEZONE_OPTIONS', () => {
    it('contains comprehensive and valid timezone list', () => {
      expect(TIMEZONE_OPTIONS.length).toBeGreaterThanOrEqual(30);
      for (const opt of TIMEZONE_OPTIONS) {
        expect(opt.key).toMatch(/^GMT[+-]\d{2}:\d{2}$/);
        expect(parseGmtOffsetMinutes(opt.key)).toBe(opt.offsetMinutes);
        expect(opt.nameVi).toBeTruthy();
        expect(opt.nameEn).toBeTruthy();
      }
    });
  });
});
