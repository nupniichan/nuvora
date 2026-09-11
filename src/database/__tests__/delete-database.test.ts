import * as SQLite from 'expo-sqlite';
import { deleteDatabase } from '../database';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-sqlite', () => ({ deleteDatabaseAsync: jest.fn() }));
jest.mock('../migrations', () => ({ runMigrations: jest.fn() }));
jest.mock('@/features/categories/starter-templates', () => ({ STARTER_TEMPLATES: [] }));

test.each([
  { code: 'ERR_DATABASE_NOT_FOUND', message: "Database 'nuvora.db' not found" },
  { code: 'E_SQLITE_DELETE_DATABASE', message: 'Database /app/nuvora.db not found' },
])('deletion tolerates an already removed native database ($code)', async (error) => {
  jest.mocked(SQLite.deleteDatabaseAsync).mockRejectedValueOnce(error);
  await expect(deleteDatabase()).resolves.toBeUndefined();
});

test('deletion propagates native permission or open-connection failures', async () => {
  const error = { code: 'E_SQLITE_DELETE_DATABASE', message: 'Unable to delete database that is currently open' };
  jest.mocked(SQLite.deleteDatabaseAsync).mockRejectedValueOnce(error);
  await expect(deleteDatabase()).rejects.toEqual(error);
});
