export const MIGRATION_001_INITIAL = {
  version: 1,
  name: '001_initial',
  up: [
    `CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      currency TEXT NOT NULL,
      balance INTEGER NOT NULL DEFAULT 0,
      icon TEXT,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS category_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES category_groups(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS recurring_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      to_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      frequency TEXT NOT NULL,
      interval INTEGER NOT NULL DEFAULT 1,
      day_of_month INTEGER,
      day_of_week INTEGER,
      month_end_behavior TEXT DEFAULT 'last_day',
      start_date TEXT NOT NULL,
      end_date TEXT,
      behavior TEXT NOT NULL DEFAULT 'confirm',
      is_active INTEGER NOT NULL DEFAULT 1,
      last_processed_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS automation_occurrences (
      id TEXT PRIMARY KEY,
      recurring_rule_id TEXT NOT NULL REFERENCES recurring_rules(id) ON DELETE CASCADE,
      scheduled_date TEXT NOT NULL,
      transaction_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      processed_at TEXT,
      UNIQUE(recurring_rule_id, scheduled_date)
    );`,

    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      to_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      recurring_rule_id TEXT REFERENCES recurring_rules(id) ON DELETE SET NULL,
      occurrence_id TEXT REFERENCES automation_occurrences(id) ON DELETE SET NULL,
      note TEXT,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      period_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      currency TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS budget_allocations (
      id TEXT PRIMARY KEY,
      budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      rule_type TEXT NOT NULL,
      amount INTEGER,
      percentage REAL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );`,

    `CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      changes_json TEXT,
      created_at TEXT NOT NULL
    );`,

    `CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);`,
    `CREATE INDEX IF NOT EXISTS idx_categories_group ON categories(group_id);`,
    `CREATE INDEX IF NOT EXISTS idx_occurrences_rule ON automation_occurrences(recurring_rule_id);`,
    `CREATE INDEX IF NOT EXISTS idx_occurrences_status ON automation_occurrences(status);`,
  ],
};
