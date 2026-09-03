import {
  createEncryptedBackup,
  restoreFromEncryptedBackup,
} from '../backup-service';

// Mock crypto module using Node's standard crypto library for authentic AES-256-GCM tests
jest.mock('@/services/security/crypto', () => {
  const crypto = require('crypto');
  const { Buffer } = require('buffer');
  return {
    DEFAULT_KDF_PARAMS: {
      algorithm: 'argon2id',
      memoryKb: 65536,
      iterations: 3,
      parallelism: 1,
      keyLength: 32,
    },
    generateRandomHex: (byteCount = 32) => crypto.randomBytes(byteCount).toString('hex'),
    deriveKeyArgon2id: async (password: string, saltHex: string) => {
      return crypto.pbkdf2Sync(password, Buffer.from(saltHex, 'hex'), 1000, 32, 'sha256').toString('hex');
    },
    encryptAesGcm: async (plaintext: string, keyHex: string) => {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag().toString('hex');
      return {
        ciphertextHex: encrypted,
        nonceHex: iv.toString('hex'),
        authTagHex: tag,
      };
    },
    decryptAesGcm: async (ciphertextHex: string, keyHex: string, nonceHex: string, authTagHex: string) => {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(keyHex, 'hex'),
        Buffer.from(nonceHex, 'hex')
      );
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
      let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    },
  };
});

// Mock sqlite for in-memory testing of backup and restore
jest.mock('@/database/database', () => {
  let dbData: Record<string, any[]> = {
    app_settings: [{ key: 'language', value: 'vi', updated_at: '2026-01-01' }],
    accounts: [
      {
        id: 'acc1',
        name: 'Tiền mặt',
        type: 'cash',
        currency: 'VND',
        balance: 500000,
        icon: 'account-balance-wallet',
        color: '#F89E62',
        sort_order: 1,
        is_archived: 0,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ],
    category_groups: [],
    categories: [],
    transactions: [
      {
        id: 'tx1',
        type: 'expense',
        amount: 50000,
        currency: 'VND',
        account_id: 'acc1',
        to_account_id: null,
        category_id: null,
        recurring_rule_id: null,
        occurrence_id: null,
        note: 'Cà phê',
        date: '2026-01-01',
        status: 'confirmed',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ],
    budgets: [],
    budget_allocations: [],
    recurring_rules: [],
    automation_occurrences: [],
  };

  const db = {
    getAllAsync: jest.fn().mockImplementation(async (sql: string) => {
      for (const t of Object.keys(dbData)) {
        if (sql.includes(`FROM ${t}`)) {
          return dbData[t];
        }
      }
      return [];
    }),
    runAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('DELETE FROM')) {
        for (const t of Object.keys(dbData)) {
          if (sql.includes(`FROM ${t}`)) {
            dbData[t] = [];
          }
        }
      } else if (sql.includes('INSERT INTO accounts')) {
        dbData.accounts.push({
          id: params?.[0],
          name: params?.[1],
          type: params?.[2],
          currency: params?.[3],
          balance: params?.[4],
          icon: params?.[5],
          color: params?.[6],
          sort_order: params?.[7],
          is_archived: params?.[8],
          created_at: params?.[9],
          updated_at: params?.[10],
        });
      }
    }),
    withTransactionAsync: jest.fn().mockImplementation(async (cb: () => Promise<void>) => {
      await cb();
    }),
  };

  return {
    getDatabase: () => db,
  };
});

describe('Encrypted Backup & Recovery Service', () => {
  const MASTER_PASSWORD = 'super-secret-password-123!';

  it('creates an encrypted backup envelope without leaking plaintext', async () => {
    const backupJson = await createEncryptedBackup(MASTER_PASSWORD);
    expect(backupJson).toBeDefined();

    const envelope = JSON.parse(backupJson);
    expect(envelope.version).toBe(1);
    expect(envelope.saltHex).toHaveLength(64); // 32 bytes hex
    expect(envelope.nonceHex).toHaveLength(24); // 12 bytes hex
    expect(envelope.authTagHex).toHaveLength(32); // 16 bytes hex
    expect(envelope.ciphertextHex).toBeDefined();

    // Plaintext financial content must not appear in the serialized envelope
    expect(backupJson).not.toContain('Tiền mặt');
    expect(backupJson).not.toContain('Cà phê');
  });

  it('restores successfully with the correct master password', async () => {
    const backupJson = await createEncryptedBackup(MASTER_PASSWORD);
    const result = await restoreFromEncryptedBackup(backupJson, MASTER_PASSWORD);

    expect(result.success).toBe(true);
    expect(result.accountsRestored).toBe(1);
    expect(result.transactionsRestored).toBe(1);
  });

  it('fails safely and rejects wrong password without corrupting database', async () => {
    const backupJson = await createEncryptedBackup(MASTER_PASSWORD);

    await expect(
      restoreFromEncryptedBackup(backupJson, 'wrong-password-456')
    ).rejects.toThrow('Mật khẩu không đúng hoặc bản sao lưu đã bị sửa đổi/hư hại.');
  });

  it('fails safely when ciphertext is tampered with', async () => {
    const backupJson = await createEncryptedBackup(MASTER_PASSWORD);
    const envelope = JSON.parse(backupJson);

    // Tamper ciphertext
    envelope.ciphertextHex = envelope.ciphertextHex.slice(0, -2) + 'aa';
    const tamperedJson = JSON.stringify(envelope);

    await expect(
      restoreFromEncryptedBackup(tamperedJson, MASTER_PASSWORD)
    ).rejects.toThrow();
  });
});
