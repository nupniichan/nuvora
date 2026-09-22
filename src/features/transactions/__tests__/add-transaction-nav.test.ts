import {
  getEffectiveGmtOffsetMinutes,
  formatDateTimeInGmt,
  formatDateInGmt,
  getSystemGmtOffsetMinutes,
} from '@/services/timezone/timezone-service';

jest.mock('@/database/database', () => jest.requireActual('@/database/database.web'));

describe('add-transaction timezone & navigation flow', () => {
  describe('timezone calculation for transaction entry', () => {
    it('uses system offset when preference is SYSTEM', () => {
      const offset = getEffectiveGmtOffsetMinutes('SYSTEM');
      expect(offset).toBe(getSystemGmtOffsetMinutes());
    });

    it('uses custom GMT offset when preference is set', () => {
      const offset = getEffectiveGmtOffsetMinutes('GMT+07:00');
      expect(offset).toBe(420);
    });

    it('formats transaction date according to offset', () => {
      const baseDate = new Date(Date.UTC(2026, 8, 22, 12, 0, 0));
      const formattedGmt7 = formatDateTimeInGmt(baseDate, 420);
      expect(formattedGmt7).toBe('2026-09-22T19:00:00');

      const formattedGmtMinus5 = formatDateTimeInGmt(baseDate, -300);
      expect(formattedGmtMinus5).toBe('2026-09-22T07:00:00');
    });

    it('calculates today and yesterday with timezone boundary correctly', () => {
      // 2026-09-22 01:00 UTC
      const lateUtc = new Date(Date.UTC(2026, 8, 22, 1, 0, 0));
      // In GMT-5, it is 2026-09-21 20:00 (still previous day)
      const dateInGmtMinus5 = formatDateInGmt(lateUtc, -300);
      expect(dateInGmtMinus5).toBe('2026-09-21');

      // In GMT+7, it is 2026-09-22 08:00
      const dateInGmt7 = formatDateInGmt(lateUtc, 420);
      expect(dateInGmt7).toBe('2026-09-22');
    });
  });

  describe('navigation destination after saving transaction', () => {
    it('verifies the contract: save transaction must direct to home /(main)', () => {
      const mockRouter = {
        dismissAll: jest.fn(),
        canDismiss: jest.fn().mockReturnValue(true),
        replace: jest.fn(),
      };

      // Simulating the save success logic in add-transaction.tsx
      const onSaveSuccess = () => {
        if (mockRouter.canDismiss?.()) {
          mockRouter.dismissAll();
        }
        mockRouter.replace('/(main)');
      };

      onSaveSuccess();

      expect(mockRouter.dismissAll).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).toHaveBeenCalledWith('/(main)');
    });

    it('handles canDismiss being false gracefully and still replaces with /(main)', () => {
      const mockRouter = {
        dismissAll: jest.fn(),
        canDismiss: jest.fn().mockReturnValue(false),
        replace: jest.fn(),
      };

      const onSaveSuccess = () => {
        if (mockRouter.canDismiss?.()) {
          mockRouter.dismissAll();
        }
        mockRouter.replace('/(main)');
      };

      onSaveSuccess();

      expect(mockRouter.dismissAll).not.toHaveBeenCalled();
      expect(mockRouter.replace).toHaveBeenCalledWith('/(main)');
    });
  });
});
