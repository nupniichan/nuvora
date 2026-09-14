import { getDatabase } from '@/database/database';
import { seedStarterCategories } from '@/features/categories/starter-templates';
import { setBiometricsEnabled, unlockWithPassword } from '@/services/security/auth-service';
import { initializeKeyEnvelope } from '@/services/security/key-manager';
import { getDefaultAccount } from '@/features/accounts/account-queries';

export interface OnboardingConfig {
  masterPassword: string;
  enableBiometrics: boolean;
  currency: string;
  language: 'vi' | 'en';
  templateOption: 'personal' | 'empty';
}

export async function completeOnboarding(config: OnboardingConfig): Promise<void> {

  await initializeKeyEnvelope(config.masterPassword);

  const unlocked = await unlockWithPassword(config.masterPassword);
  if (!unlocked) {
    throw new Error('Failed to unlock database during onboarding initialization.');
  }

  await setBiometricsEnabled(config.enableBiometrics);

  const db = getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
    ['default_currency', config.currency, now]
  );
  await db.runAsync(
    `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
    ['language', config.language, now]
  );

  if (config.templateOption === 'personal') {
    await seedStarterCategories(db, config.language);
  }

  await getDefaultAccount();
}
