import { closeDatabase, getDatabase } from '@/database/database.web';
import { getSpendingHistory } from '@/features/insights/insight-data';
import { getMonthlySnapshot } from '../budget-queries';

jest.mock('@/database/database', () => jest.requireActual('@/database/database.web'));
jest.mock('@/shared/uuid', () => ({ generateUUID: () => 'test-budget' }));

describe('monthly chart totals', () => {
  beforeEach(async () => { await closeDatabase(); });

  it('keeps the snapshot and history consistent for currency, status and date boundaries', async () => {
    const db = getDatabase();
    const entries = [
      ['income', 'income', 400000, 'VND', 'confirmed', '2026-09-01'],
      ['expense', 'expense', 100000, 'VND', 'confirmed', '2026-09-07'],
      ['planned', 'expense', 900000, 'VND', 'planned', '2026-09-08'],
      ['foreign', 'expense', 1250, 'USD', 'confirmed', '2026-09-07'],
      ['transfer', 'transfer', 500000, 'VND', 'confirmed', '2026-09-07'],
      ['past', 'expense', 30000, 'VND', 'confirmed', '2026-08-31'],
      ['next', 'expense', 80000, 'VND', 'confirmed', '2026-10-01'],
    ];
    for (const entry of entries) {
      await db.runAsync('INSERT INTO transactions (id, type, amount, currency, status, date) VALUES (?, ?, ?, ?, ?, ?);', entry);
    }
    const snapshot = await getMonthlySnapshot(2026, 9, 'VND');
    const history = await getSpendingHistory(2026, 9, 'VND');
    expect(snapshot.totalIncome).toBe(400000);
    expect(snapshot.totalExpense).toBe(100000);
    expect(snapshot.uncategorizedExpense).toBe(100000);
    expect(history.months[5]).toMatchObject({ income: snapshot.totalIncome, expense: snapshot.totalExpense });
    expect(history.days[6].amount).toBe(100000);
    const usd = await getMonthlySnapshot(2026, 9, 'USD');
    expect(usd.totalExpense).toBe(1250);
    expect(usd.totalIncome).toBe(0);
  });
});
