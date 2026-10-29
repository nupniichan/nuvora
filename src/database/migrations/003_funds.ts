export const MIGRATION_003_FUNDS = {
  version: 3,
  name: '003_funds',
  up: [
    `CREATE TABLE IF NOT EXISTS funds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      target_amount INTEGER,
      balance INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    `CREATE INDEX IF NOT EXISTS idx_funds_deleted ON funds(is_deleted);`,
    `CREATE INDEX IF NOT EXISTS idx_funds_sort ON funds(sort_order);`,

    `ALTER TABLE transactions ADD COLUMN fund_id TEXT REFERENCES funds(id) ON DELETE SET NULL;`,
    `ALTER TABLE transactions ADD COLUMN to_fund_id TEXT REFERENCES funds(id) ON DELETE SET NULL;`,

    `CREATE INDEX IF NOT EXISTS idx_transactions_fund ON transactions(fund_id);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_to_fund ON transactions(to_fund_id);`,
  ],
};
