export type RuntimeLanguage = 'vi' | 'en';

let currentLanguage: RuntimeLanguage = 'vi';

export function getCurrentLanguage(): RuntimeLanguage {
  return currentLanguage;
}

export function setCurrentLanguage(language: RuntimeLanguage): void {
  currentLanguage = language;
}
