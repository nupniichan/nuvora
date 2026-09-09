import { Alert, Platform } from 'react-native';
import { createInstance } from 'i18next';
import { withMonthlyLimitConfirmation } from '../confirm-monthly-limit';
import { MonthlyLimitExceededError, MonthlyLimitValidationError } from '../monthly-limits';
import vi from '@/i18n/locales/vi.json';
import en from '@/i18n/locales/en.json';
import { setCurrentLanguage } from '@/i18n/language-state';

jest.mock('react-native', () => ({ Platform: { OS: 'web' }, Alert: { alert: jest.fn() } }));
jest.mock('@/database/database', () => jest.requireActual('@/database/database.web'));
const i18n = createInstance();
const projection = { month: '2026-09', currency: 'VND', limit: 100, spent: 90, projected: 110, exceeded: 10 };
const error = new MonthlyLimitExceededError(projection, 'test');
const confirm = jest.fn();

beforeAll(async () => { await i18n.init({ lng: 'vi', interpolation: { escapeValue: false }, resources: { vi: { translation: vi }, en: { translation: en } } }); });
beforeEach(async () => {
  await i18n.changeLanguage('vi');
  setCurrentLanguage('vi');
  jest.clearAllMocks();
  Platform.OS = 'web';
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { confirm } });
});
afterAll(() => { Reflect.deleteProperty(globalThis, 'window'); });

it('does not retry or save when the user cancels', async () => {
  confirm.mockReturnValue(false);
  const task = jest.fn().mockRejectedValue(error);
  expect(await withMonthlyLimitConfirmation(task, i18n.t)).toBe(false);
  expect(task).toHaveBeenCalledTimes(1);
  expect(confirm.mock.calls[0][0]).toContain('09/2026');
});

it('passes the precise approval only after the user confirms', async () => {
  confirm.mockReturnValue(true);
  const task = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);
  expect(await withMonthlyLimitConfirmation(task, i18n.t)).toBe(true);
  expect(task).toHaveBeenNthCalledWith(1, undefined);
  expect(task).toHaveBeenNthCalledWith(2, error.approval);
});

it('asks again if another expense changes the projection before saving', async () => {
  confirm.mockReturnValueOnce(true).mockReturnValueOnce(false);
  const task = jest.fn().mockRejectedValueOnce(error)
    .mockRejectedValueOnce(new MonthlyLimitExceededError({ ...projection, projected: 120, exceeded: 20 }, 'test'));
  expect(await withMonthlyLimitConfirmation(task, i18n.t)).toBe(false);
  expect(task).toHaveBeenCalledTimes(2);
  expect(confirm).toHaveBeenCalledTimes(2);
});

it('treats native dialog dismissal as cancellation', async () => {
  Platform.OS = 'android';
  (Alert.alert as jest.Mock).mockImplementation((_title, _message, _buttons, options) => options.onDismiss());
  const task = jest.fn().mockRejectedValue(error);
  expect(await withMonthlyLimitConfirmation(task, i18n.t)).toBe(false);
  expect(task).toHaveBeenCalledTimes(1);
});

it('does not swallow database failures or prompt for normal saves', async () => {
  expect(await withMonthlyLimitConfirmation(async () => undefined, i18n.t)).toBe(true);
  await expect(withMonthlyLimitConfirmation(async () => { throw new Error('write failed'); }, i18n.t)).rejects.toThrow('write failed');
  expect(confirm).not.toHaveBeenCalled();
});

it('uses English text and amount formatting, and translates validation errors', async () => {
  await i18n.changeLanguage('en');
  setCurrentLanguage('en');
  confirm.mockReturnValue(false);
  const task = jest.fn().mockRejectedValue(new MonthlyLimitExceededError({ ...projection, limit: 1000000 }, 'test'));
  await withMonthlyLimitConfirmation(task, i18n.t);
  expect(confirm.mock.calls[0][0]).toContain('Monthly spending limit exceeded');
  expect(confirm.mock.calls[0][0]).toContain('1,000,000');
  await expect(withMonthlyLimitConfirmation(async () => { throw new MonthlyLimitValidationError('invalidDate'); }, i18n.t))
    .rejects.toThrow(en.monthlyLimit.invalidDate);
});
