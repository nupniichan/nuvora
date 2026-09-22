import { getDatabase } from '@/database/database';
import { AppSettingRow } from '@/database/types';

export const TIMEZONE_SETTING_KEY = 'timezone_gmt';
export const SYSTEM_TIMEZONE_VALUE = 'SYSTEM';

export interface TimezoneOption {
  key: string;
  offsetMinutes: number;
  gmtBadge: string;
  nameVi: string;
  nameEn: string;
}

export function getSystemGmtOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

export function formatGmtOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `GMT${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function getSystemGmtString(): string {
  return formatGmtOffset(getSystemGmtOffsetMinutes());
}

export function parseGmtOffsetMinutes(gmtStr: string): number | null {
  if (!gmtStr || gmtStr === SYSTEM_TIMEZONE_VALUE) {
    return null;
  }
  const clean = gmtStr.trim().toUpperCase().replace(/^GMT/, '');
  const match = clean.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return null;

  const sign = match[1] === '-' ? -1 : 1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;

  if (hours > 14 || (hours === 14 && minutes > 0) || minutes >= 60) {
    return null;
  }

  return sign * (hours * 60 + minutes);
}

export async function getPreferredGmt(): Promise<string> {
  const db = getDatabase();
  const row = await db.getFirstAsync<AppSettingRow>(
    'SELECT * FROM app_settings WHERE key = ?;',
    [TIMEZONE_SETTING_KEY]
  );
  return row?.value || SYSTEM_TIMEZONE_VALUE;
}

export async function setPreferredGmt(gmt: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);',
    [TIMEZONE_SETTING_KEY, gmt.trim(), now]
  );
}

export function getEffectiveGmtOffsetMinutes(preferredGmt?: string): number {
  if (!preferredGmt || preferredGmt === SYSTEM_TIMEZONE_VALUE) {
    return getSystemGmtOffsetMinutes();
  }
  const parsed = parseGmtOffsetMinutes(preferredGmt);
  return parsed !== null ? parsed : getSystemGmtOffsetMinutes();
}

export function formatDateTimeInGmt(
  baseDate: Date = new Date(),
  offsetMinutes: number = getSystemGmtOffsetMinutes()
): string {
  const targetTimestamp = baseDate.getTime() + offsetMinutes * 60 * 1000;
  const targetDate = new Date(targetTimestamp);

  const yyyy = targetDate.getUTCFullYear();
  const mm = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getUTCDate()).padStart(2, '0');
  const hh = String(targetDate.getUTCHours()).padStart(2, '0');
  const min = String(targetDate.getUTCMinutes()).padStart(2, '0');
  const ss = String(targetDate.getUTCSeconds()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
}

export function formatDateInGmt(
  baseDate: Date = new Date(),
  offsetMinutes: number = getSystemGmtOffsetMinutes()
): string {
  return formatDateTimeInGmt(baseDate, offsetMinutes).split('T')[0];
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { key: 'GMT-12:00', offsetMinutes: -720, gmtBadge: 'GMT-12:00', nameVi: 'Đảo Baker, Howland', nameEn: 'Baker, Howland Island' },
  { key: 'GMT-11:00', offsetMinutes: -660, gmtBadge: 'GMT-11:00', nameVi: 'Samoa, Niue, Midway', nameEn: 'Samoa, Niue, Midway' },
  { key: 'GMT-10:00', offsetMinutes: -600, gmtBadge: 'GMT-10:00', nameVi: 'Hawaii, Honolulu, Tahiti', nameEn: 'Hawaii, Honolulu, Tahiti' },
  { key: 'GMT-09:30', offsetMinutes: -570, gmtBadge: 'GMT-09:30', nameVi: 'Quần đảo Marquesas', nameEn: 'Marquesas Islands' },
  { key: 'GMT-09:00', offsetMinutes: -540, gmtBadge: 'GMT-09:00', nameVi: 'Alaska, Anchorage', nameEn: 'Alaska, Anchorage' },
  { key: 'GMT-08:00', offsetMinutes: -480, gmtBadge: 'GMT-08:00', nameVi: 'Giờ Thái Bình Dương (Los Angeles, Vancouver)', nameEn: 'Pacific Time (Los Angeles, Vancouver)' },
  { key: 'GMT-07:00', offsetMinutes: -420, gmtBadge: 'GMT-07:00', nameVi: 'Giờ Miền Núi (Denver, Phoenix, Calgary)', nameEn: 'Mountain Time (Denver, Phoenix, Calgary)' },
  { key: 'GMT-06:00', offsetMinutes: -360, gmtBadge: 'GMT-06:00', nameVi: 'Giờ Miền Trung (Chicago, Mexico City, Dallas)', nameEn: 'Central Time (Chicago, Mexico City, Dallas)' },
  { key: 'GMT-05:00', offsetMinutes: -300, gmtBadge: 'GMT-05:00', nameVi: 'Giờ Miền Đông (New York, Toronto, Miami)', nameEn: 'Eastern Time (New York, Toronto, Miami)' },
  { key: 'GMT-04:00', offsetMinutes: -240, gmtBadge: 'GMT-04:00', nameVi: 'Giờ Đại Tây Dương (Santiago, Halifax, La Paz)', nameEn: 'Atlantic Time (Santiago, Halifax, La Paz)' },
  { key: 'GMT-03:30', offsetMinutes: -210, gmtBadge: 'GMT-03:30', nameVi: 'Newfoundland', nameEn: 'Newfoundland' },
  { key: 'GMT-03:00', offsetMinutes: -180, gmtBadge: 'GMT-03:00', nameVi: 'Buenos Aires, Sao Paulo, Rio de Janeiro', nameEn: 'Buenos Aires, Sao Paulo, Rio de Janeiro' },
  { key: 'GMT-02:00', offsetMinutes: -120, gmtBadge: 'GMT-02:00', nameVi: 'Fernando de Noronha, Nam Georgia', nameEn: 'Fernando de Noronha, South Georgia' },
  { key: 'GMT-01:00', offsetMinutes: -60,  gmtBadge: 'GMT-01:00', nameVi: 'Azores, Cape Verde', nameEn: 'Azores, Cape Verde' },
  { key: 'GMT+00:00', offsetMinutes: 0,    gmtBadge: 'GMT+00:00', nameVi: 'UTC / London, Dublin, Lisbon, Casablanca', nameEn: 'UTC / London, Dublin, Lisbon, Casablanca' },
  { key: 'GMT+01:00', offsetMinutes: 60,   gmtBadge: 'GMT+01:00', nameVi: 'Paris, Berlin, Rome, Madrid, Amsterdam', nameEn: 'Paris, Berlin, Rome, Madrid, Amsterdam' },
  { key: 'GMT+02:00', offsetMinutes: 120,  gmtBadge: 'GMT+02:00', nameVi: 'Cairo, Athens, Johannesburg, Helsinki', nameEn: 'Cairo, Athens, Johannesburg, Helsinki' },
  { key: 'GMT+03:00', offsetMinutes: 180,  gmtBadge: 'GMT+03:00', nameVi: 'Moscow, Istanbul, Riyadh, Nairobi, Baghdad', nameEn: 'Moscow, Istanbul, Riyadh, Nairobi, Baghdad' },
  { key: 'GMT+03:30', offsetMinutes: 210,  gmtBadge: 'GMT+03:30', nameVi: 'Tehran', nameEn: 'Tehran' },
  { key: 'GMT+04:00', offsetMinutes: 240,  gmtBadge: 'GMT+04:00', nameVi: 'Dubai, Abu Dhabi, Baku, Tbilisi', nameEn: 'Dubai, Abu Dhabi, Baku, Tbilisi' },
  { key: 'GMT+04:30', offsetMinutes: 270,  gmtBadge: 'GMT+04:30', nameVi: 'Kabul', nameEn: 'Kabul' },
  { key: 'GMT+05:00', offsetMinutes: 300,  gmtBadge: 'GMT+05:00', nameVi: 'Karachi, Tashkent, Islamabad, Yekaterinburg', nameEn: 'Karachi, Tashkent, Islamabad, Yekaterinburg' },
  { key: 'GMT+05:30', offsetMinutes: 330,  gmtBadge: 'GMT+05:30', nameVi: 'Ấn Độ (New Delhi, Mumbai, Colombo)', nameEn: 'India (New Delhi, Mumbai, Colombo)' },
  { key: 'GMT+05:45', offsetMinutes: 345,  gmtBadge: 'GMT+05:45', nameVi: 'Kathmandu, Nepal', nameEn: 'Kathmandu, Nepal' },
  { key: 'GMT+06:00', offsetMinutes: 360,  gmtBadge: 'GMT+06:00', nameVi: 'Dhaka, Almaty, Astana', nameEn: 'Dhaka, Almaty, Astana' },
  { key: 'GMT+06:30', offsetMinutes: 390,  gmtBadge: 'GMT+06:30', nameVi: 'Yangon, Quần đảo Cocos', nameEn: 'Yangon, Cocos Islands' },
  { key: 'GMT+07:00', offsetMinutes: 420,  gmtBadge: 'GMT+07:00', nameVi: 'Việt Nam (Hà Nội, TP.HCM), Bangkok, Jakarta', nameEn: 'Vietnam (Hanoi, HCMC), Bangkok, Jakarta' },
  { key: 'GMT+08:00', offsetMinutes: 480,  gmtBadge: 'GMT+08:00', nameVi: 'Singapore, Bắc Kinh, Hong Kong, Perth, Manila', nameEn: 'Singapore, Beijing, Hong Kong, Perth, Manila' },
  { key: 'GMT+08:45', offsetMinutes: 525,  gmtBadge: 'GMT+08:45', nameVi: 'Eucla', nameEn: 'Eucla' },
  { key: 'GMT+09:00', offsetMinutes: 540,  gmtBadge: 'GMT+09:00', nameVi: 'Nhật Bản, Hàn Quốc (Tokyo, Seoul)', nameEn: 'Japan, Korea (Tokyo, Seoul)' },
  { key: 'GMT+09:30', offsetMinutes: 570,  gmtBadge: 'GMT+09:30', nameVi: 'Adelaide, Darwin', nameEn: 'Adelaide, Darwin' },
  { key: 'GMT+10:00', offsetMinutes: 600,  gmtBadge: 'GMT+10:00', nameVi: 'Sydney, Melbourne, Brisbane, Guam', nameEn: 'Sydney, Melbourne, Brisbane, Guam' },
  { key: 'GMT+10:30', offsetMinutes: 630,  gmtBadge: 'GMT+10:30', nameVi: 'Đảo Lord Howe', nameEn: 'Lord Howe Island' },
  { key: 'GMT+11:00', offsetMinutes: 660,  gmtBadge: 'GMT+11:00', nameVi: 'Noumea, Quần đảo Solomon, Vladivostok', nameEn: 'Noumea, Solomon Islands, Vladivostok' },
  { key: 'GMT+12:00', offsetMinutes: 720,  gmtBadge: 'GMT+12:00', nameVi: 'Auckland, Wellington, Fiji', nameEn: 'Auckland, Wellington, Fiji' },
  { key: 'GMT+12:45', offsetMinutes: 765,  gmtBadge: 'GMT+12:45', nameVi: 'Quần đảo Chatham', nameEn: 'Chatham Islands' },
  { key: 'GMT+13:00', offsetMinutes: 780,  gmtBadge: 'GMT+13:00', nameVi: 'Samoa, Tonga, Phoenix Islands', nameEn: 'Samoa, Tonga, Phoenix Islands' },
  { key: 'GMT+14:00', offsetMinutes: 840,  gmtBadge: 'GMT+14:00', nameVi: 'Kiritimati, Quần đảo Line', nameEn: 'Kiritimati, Line Islands' },
];
