import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { StorageKeys, getSecureItem, setSecureItem } from '@/services/security/secure-storage';

import en from './locales/en.json';
import vi from './locales/vi.json';
import { getCurrentLanguage, setCurrentLanguage } from './language-state';

const resources = {
  vi: { translation: vi },
  en: { translation: en },
};

export type AppLanguage = keyof typeof resources;

const i18n = createInstance();
let initialization: Promise<typeof i18n> | null = null;

export function normalizeLanguage(value: string | null | undefined): AppLanguage {
  return value?.toLowerCase().startsWith('en') ? 'en' : 'vi';
}

export function getAppLanguage(): AppLanguage {
  return normalizeLanguage(i18n.language || getCurrentLanguage());
}

export function initializeI18n(): Promise<typeof i18n> {
  if (initialization) return initialization;

  initialization = (async () => {
    let savedLanguage: string | null = null;
    try {
      savedLanguage = await getSecureItem(StorageKeys.LANGUAGE);
    } catch {
      savedLanguage = null;
    }
    const deviceLanguage = getLocales()[0]?.languageCode;
    const language = normalizeLanguage(savedLanguage ?? deviceLanguage);
    setCurrentLanguage(language);

    await i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: 'vi',
      supportedLngs: ['vi', 'en'],
      interpolation: { escapeValue: false },
    });
    return i18n;
  })();

  return initialization;
}

export async function setAppLanguage(language: AppLanguage): Promise<void> {
  await initializeI18n();
  const normalized = normalizeLanguage(language);
  setCurrentLanguage(normalized);
  await i18n.changeLanguage(normalized);
  try {
    await setSecureItem(StorageKeys.LANGUAGE, normalized);
  } catch (err) {
    console.warn('Failed to persist language setting to secure storage:', err);
  }
}

export default i18n;
