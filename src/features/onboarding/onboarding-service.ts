import { getDatabase } from '@/database/database';
import { seedStarterCategories } from '@/features/categories/starter-templates';
import { setBiometricsEnabled, unlockWithPassword } from '@/services/security/auth-service';
import { initializeKeyEnvelope } from '@/services/security/key-manager';
import { generateUUID } from '@/shared/uuid';

export interface OnboardingConfig {
  masterPassword: string;
  enableBiometrics: boolean;
  currency: string;
  language: 'vi' | 'en';
  templateOption: 'personal' | 'empty';
}

export async function completeOnboarding(config: OnboardingConfig): Promise<void> {
  // 1. Initialize key envelope with Argon2id + random DEK
  await initializeKeyEnvelope(config.masterPassword);

  // 2. Unlock session with master password (opens database with SQLCipher DEK)
  const unlocked = await unlockWithPassword(config.masterPassword);
  if (!unlocked) {
    throw new Error('Failed to unlock database during onboarding initialization.');
  }

  // 3. Set biometric unlock setting
  await setBiometricsEnabled(config.enableBiometrics);

  const db = getDatabase();
  const now = new Date().toISOString();

  // 4. Save app settings
  await db.runAsync(
    `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
    ['default_currency', config.currency, now]
  );
  await db.runAsync(
    `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);`,
    ['language', config.language, now]
  );

  // 5. Seed starter categories if requested
  if (config.templateOption === 'personal') {
    await seedStarterCategories(db, config.language);
  }

  // 6. Create default primary cash account
  const accountName = config.language === 'vi' ? 'Tiền mặt' : 'Cash';
  await db.runAsync(
    `INSERT INTO accounts (id, name, type, currency, balance, icon, color, sort_order, is_archived, created_at, updated_at)
     VALUES (?, ?, 'cash', ?, 0, 'account-balance-wallet', '#F89E62', 1, 0, ?, ?);`,
    [generateUUID(), accountName, config.currency, now, now]
  );
}
