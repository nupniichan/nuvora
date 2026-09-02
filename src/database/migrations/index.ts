import { MIGRATION_001_INITIAL } from './001_initial';

export interface Migration {
  version: number;
  name: string;
  up: string[];
}

export const ALL_MIGRATIONS: Migration[] = [MIGRATION_001_INITIAL];

/**
 * Runs pending migrations on SQLite database instance
 */
export async function runMigrations(db: any): Promise<void> {
  // Ensure schema_migrations table exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows: any[] = await db.getAllAsync(
    'SELECT version FROM schema_migrations ORDER BY version ASC;'
  );
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  for (const migration of ALL_MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`Applying migration ${migration.version}: ${migration.name}`);

      await db.withTransactionAsync(async () => {
        for (const sql of migration.up) {
          await db.execAsync(sql);
        }
        await db.runAsync(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
          [migration.version, migration.name, new Date().toISOString()]
        );
      });
    }
  }
}
