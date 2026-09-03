export const MIGRATION_002_GOALS_AND_LIMITS = {
  version: 2,
  name: '002_goals_and_limits',
  up: [
    `CREATE TABLE IF NOT EXISTS financial_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'custom',
      icon TEXT,
      color TEXT,
      target_amount INTEGER NOT NULL,
      current_amount INTEGER NOT NULL DEFAULT 0,
      target_date TEXT,
      linked_category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      linked_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS goal_contributions (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES financial_goals(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
      note TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );`,

    `ALTER TABLE budgets ADD COLUMN total_budget INTEGER DEFAULT NULL;`,

    `CREATE INDEX IF NOT EXISTS idx_goals_status ON financial_goals(status);`,
    `CREATE INDEX IF NOT EXISTS idx_goals_category ON financial_goals(linked_category_id);`,
    `CREATE INDEX IF NOT EXISTS idx_contributions_goal ON goal_contributions(goal_id);`,
    `CREATE INDEX IF NOT EXISTS idx_contributions_date ON goal_contributions(date);`,
  ],
};
