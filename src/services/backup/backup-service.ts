import { getDatabase } from '@/database/database';
import {
  DEFAULT_KDF_PARAMS,
  KdfParameters,
  decryptAesGcm,
  deriveKeyArgon2id,
  encryptAesGcm,
  generateRandomHex,
} from '@/services/security/crypto';

export interface BackupEnvelope {
  version: number;
  schemaVersion: number;
  createdAt: string;
  kdf: string;
  kdfParams: KdfParameters;
  saltHex: string;
  nonceHex: string;
  authTagHex: string;
  ciphertextHex: string;
}

export interface BackupPayload {
  app_settings: any[];
  accounts: any[];
  category_groups: any[];
  categories: any[];
  transactions: any[];
  budgets: any[];
  budget_allocations: any[];
  recurring_rules: any[];
  automation_occurrences: any[];
}

export interface RestoreResult {
  success: boolean;
  accountsRestored: number;
  transactionsRestored: number;
  budgetsRestored: number;
  recurringRulesRestored: number;
}

/**
 * Creates an encrypted, portable backup envelope from the local database
 */
export async function createEncryptedBackup(password: string): Promise<string> {
  if (!password) {
    throw new Error('Mật khẩu bảo vệ sao lưu không được để trống.');
  }

  const db = getDatabase();

  // 1. Snapshot local database tables
  const [
    appSettings,
    accounts,
    categoryGroups,
    categories,
    transactions,
    budgets,
    budgetAllocations,
    recurringRules,
    automationOccurrences,
  ] = await Promise.all([
    db.getAllAsync('SELECT * FROM app_settings;'),
    db.getAllAsync('SELECT * FROM accounts;'),
    db.getAllAsync('SELECT * FROM category_groups;'),
    db.getAllAsync('SELECT * FROM categories;'),
    db.getAllAsync('SELECT * FROM transactions;'),
    db.getAllAsync('SELECT * FROM budgets;'),
    db.getAllAsync('SELECT * FROM budget_allocations;'),
    db.getAllAsync('SELECT * FROM recurring_rules;'),
    db.getAllAsync('SELECT * FROM automation_occurrences;'),
  ]);

  const payload: BackupPayload = {
    app_settings: appSettings,
    accounts,
    category_groups: categoryGroups,
    categories,
    transactions,
    budgets,
    budget_allocations: budgetAllocations,
    recurring_rules: recurringRules,
    automation_occurrences: automationOccurrences,
  };

  const payloadStr = JSON.stringify(payload);

  // 2. Derive unique KEK for this backup
  const saltHex = generateRandomHex(32);
  const kekHex = await deriveKeyArgon2id(password, saltHex, DEFAULT_KDF_PARAMS);

  // 3. Encrypt payload with AES-256-GCM
  const { ciphertextHex, nonceHex, authTagHex } = await encryptAesGcm(payloadStr, kekHex);

  const envelope: BackupEnvelope = {
    version: 1,
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    kdf: DEFAULT_KDF_PARAMS.algorithm,
    kdfParams: DEFAULT_KDF_PARAMS,
    saltHex,
    nonceHex,
    authTagHex,
    ciphertextHex,
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Validates, decrypts, and atomically restores database from an encrypted backup envelope
 */
export async function restoreFromEncryptedBackup(
  backupJsonStr: string,
  password: string
): Promise<RestoreResult> {
  if (!password) {
    throw new Error('Vui lòng nhập mật khẩu gốc để giải mã bản sao lưu.');
  }

  let envelope: BackupEnvelope;
  try {
    envelope = JSON.parse(backupJsonStr);
  } catch {
    throw new Error('Tệp sao lưu không đúng định dạng hoặc bị hỏng.');
  }

  if (envelope.version !== 1) {
    throw new Error(`Phiên bản bản sao lưu (${envelope.version}) không được hỗ trợ.`);
  }

  if (!envelope.saltHex || !envelope.nonceHex || !envelope.authTagHex || !envelope.ciphertextHex) {
    throw new Error('Dữ liệu xác thực bản sao lưu không hợp lệ hoặc bị thiếu.');
  }

  // Derive recovery key
  const kekHex = await deriveKeyArgon2id(password, envelope.saltHex, envelope.kdfParams || DEFAULT_KDF_PARAMS);

  // Decrypt and authenticate
  let payloadStr: string;
  try {
    payloadStr = await decryptAesGcm(envelope.ciphertextHex, kekHex, envelope.nonceHex, envelope.authTagHex);
  } catch {
    throw new Error('Mật khẩu không đúng hoặc bản sao lưu đã bị sửa đổi/hư hại.');
  }

  let payload: BackupPayload;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    throw new Error('Dữ liệu tài chính sau giải mã bị hỏng.');
  }

  const db = getDatabase();

  // Atomic restoration
  await db.withTransactionAsync(async () => {
    // Clear existing data safely in dependency order
    await db.runAsync('DELETE FROM audit_logs;');
    await db.runAsync('DELETE FROM automation_occurrences;');
    await db.runAsync('DELETE FROM transactions;');
    await db.runAsync('DELETE FROM budget_allocations;');
    await db.runAsync('DELETE FROM budgets;');
    await db.runAsync('DELETE FROM recurring_rules;');
    await db.runAsync('DELETE FROM categories;');
    await db.runAsync('DELETE FROM category_groups;');
    await db.runAsync('DELETE FROM accounts;');
    await db.runAsync('DELETE FROM app_settings;');

    // Insert restored data
    for (const s of payload.app_settings || []) {
      await db.runAsync(
        'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?);',
        [s.key, s.value, s.updated_at]
      );
    }
    for (const a of payload.accounts || []) {
      await db.runAsync(
        `INSERT INTO accounts (id, name, type, currency, balance, icon, color, sort_order, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [a.id, a.name, a.type, a.currency, a.balance, a.icon, a.color, a.sort_order, a.is_archived, a.created_at, a.updated_at]
      );
    }
    for (const cg of payload.category_groups || []) {
      await db.runAsync(
        `INSERT INTO category_groups (id, name, icon, color, sort_order, type, is_system, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [cg.id, cg.name, cg.icon, cg.color, cg.sort_order, cg.type, cg.is_system, cg.created_at]
      );
    }
    for (const c of payload.categories || []) {
      await db.runAsync(
        `INSERT INTO categories (id, group_id, name, icon, color, sort_order, is_archived, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [c.id, c.group_id, c.name, c.icon, c.color, c.sort_order, c.is_archived, c.created_at]
      );
    }
    for (const r of payload.recurring_rules || []) {
      await db.runAsync(
        `INSERT INTO recurring_rules (id, name, type, amount, currency, account_id, to_account_id, category_id, frequency, interval, day_of_month, day_of_week, month_end_behavior, start_date, end_date, behavior, is_active, last_processed_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [r.id, r.name, r.type, r.amount, r.currency, r.account_id, r.to_account_id, r.category_id, r.frequency, r.interval, r.day_of_month, r.day_of_week, r.month_end_behavior, r.start_date, r.end_date, r.behavior, r.is_active, r.last_processed_date, r.created_at, r.updated_at]
      );
    }
    for (const b of payload.budgets || []) {
      await db.runAsync(
        `INSERT INTO budgets (id, name, period_type, start_date, currency, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [b.id, b.name, b.period_type, b.start_date, b.currency, b.is_active, b.created_at, b.updated_at]
      );
    }
    for (const ba of payload.budget_allocations || []) {
      await db.runAsync(
        `INSERT INTO budget_allocations (id, budget_id, category_id, rule_type, amount, percentage, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [ba.id, ba.budget_id, ba.category_id, ba.rule_type, ba.amount, ba.percentage, ba.sort_order]
      );
    }
    for (const tx of payload.transactions || []) {
      await db.runAsync(
        `INSERT INTO transactions (id, type, amount, currency, account_id, to_account_id, category_id, recurring_rule_id, occurrence_id, note, date, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [tx.id, tx.type, tx.amount, tx.currency, tx.account_id, tx.to_account_id, tx.category_id, tx.recurring_rule_id, tx.occurrence_id, tx.note, tx.date, tx.status, tx.created_at, tx.updated_at]
      );
    }
    for (const o of payload.automation_occurrences || []) {
      await db.runAsync(
        `INSERT INTO automation_occurrences (id, recurring_rule_id, scheduled_date, transaction_id, status, processed_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [o.id, o.recurring_rule_id, o.scheduled_date, o.transaction_id, o.status, o.processed_at]
      );
    }
  });

  return {
    success: true,
    accountsRestored: (payload.accounts || []).length,
    transactionsRestored: (payload.transactions || []).length,
    budgetsRestored: (payload.budgets || []).length,
    recurringRulesRestored: (payload.recurring_rules || []).length,
  };
}
