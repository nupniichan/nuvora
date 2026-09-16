import { getCalendarMonthData, getYearMonthlySummaries } from '../calendar-data';
import { getDatabase } from '@/database/database';

jest.mock('@/database/database', () => ({
  getDatabase: jest.fn(),
}));

describe('calendar-data', () => {
  const mockGetAllAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getDatabase as jest.Mock).mockReturnValue({
      getAllAsync: mockGetAllAsync,
    });
  });

  describe('getCalendarMonthData', () => {
    it('aggregates daily transactions properly for income and expense', async () => {
      mockGetAllAsync.mockResolvedValue([
        {
          id: 'tx1',
          type: 'income',
          amount: 500000,
          currency: 'VND',
          date: '2026-09-10',
          status: 'confirmed',
          category_name: 'Lương',
          category_icon: 'payments',
          category_color: '#4CAF50',
          group_name: 'Thu nhập',
          note: 'Lương tháng 9',
        },
        {
          id: 'tx2',
          type: 'expense',
          amount: 50000,
          currency: 'VND',
          date: '2026-09-10',
          status: 'confirmed',
          category_name: 'Ăn uống',
          category_icon: 'restaurant',
          category_color: '#F44336',
          group_name: 'Chi tiêu',
          note: 'Cà phê',
        },
        {
          id: 'tx3',
          type: 'expense',
          amount: 100000,
          currency: 'USD',
          date: '2026-09-10',
          status: 'confirmed',
        },
      ]);

      const result = await getCalendarMonthData(2026, 9, 'VND');
      expect(result.size).toBe(1);

      const day10 = result.get('2026-09-10');
      expect(day10).toBeDefined();
      expect(day10?.totalIncome).toBe(500000);
      expect(day10?.totalExpense).toBe(50000);
      expect(day10?.netBalance).toBe(450000);
      expect(day10?.transactions).toHaveLength(2);
      expect(day10?.transactions[0].categoryName).toBe('Lương');
      expect(day10?.transactions[1].categoryName).toBe('Ăn uống');
    });

    it('handles empty transaction rows gracefully', async () => {
      mockGetAllAsync.mockResolvedValue([]);
      const result = await getCalendarMonthData(2026, 9, 'VND');
      expect(result.size).toBe(0);
    });
  });

  describe('getYearMonthlySummaries', () => {
    it('summarizes 12 months with correct totals and net balances', async () => {
      mockGetAllAsync.mockResolvedValue([
        { id: '1', type: 'income', amount: 1000000, currency: 'VND', date: '2026-01-15', status: 'confirmed' },
        { id: '2', type: 'expense', amount: 400000, currency: 'VND', date: '2026-01-20', status: 'confirmed' },
        { id: '3', type: 'income', amount: 2000000, currency: 'VND', date: '2026-09-01', status: 'confirmed' },
        { id: '4', type: 'expense', amount: 800000, currency: 'VND', date: '2026-09-15', status: 'confirmed' },
      ]);

      const result = await getYearMonthlySummaries(2026, 'VND');
      expect(result).toHaveLength(12);

      expect(result[0].month).toBe(1);
      expect(result[0].totalIncome).toBe(1000000);
      expect(result[0].totalExpense).toBe(400000);
      expect(result[0].netBalance).toBe(600000);

      expect(result[8].month).toBe(9);
      expect(result[8].totalIncome).toBe(2000000);
      expect(result[8].totalExpense).toBe(800000);
      expect(result[8].netBalance).toBe(1200000);

      expect(result[1].totalIncome).toBe(0);
      expect(result[1].totalExpense).toBe(0);
      expect(result[1].netBalance).toBe(0);
    });
  });
});
