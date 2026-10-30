import { Colors } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const createFinancialCalendarStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    root: {
      gap: 8,
    },
    subViewToggle: {
      flexDirection: 'row',
      backgroundColor: theme.backgroundElement,
      borderRadius: 12,
      padding: 3,
      gap: 3,
    },
    subViewBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 7,
      borderRadius: 10,
    },
    subViewBtnActive: {
      backgroundColor: theme.surface,
      shadowColor: Colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    subViewLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    subViewLabelActive: {
      color: Colors.primaryStrong,
    },
    loadingContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    errorContainer: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    errorText: {
      fontSize: 13,
      color: Colors.expense,
      textAlign: 'center',
    },
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: 2,
    },
    weekdayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 4,
    },
    weekdayLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
    },
    sundayLabel: {
      color: Colors.expense,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: `${100 / 7}%`,
      minHeight: 62,
      padding: 3,
      alignItems: 'center',
      borderRadius: 8,
      gap: 1,
    },
    dayCellToday: {
      backgroundColor: Colors.primaryLight,
    },
    dayCellSelected: {
      backgroundColor: Colors.primary,
    },
    dayNumber: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
      lineHeight: 18,
    },
    dayNumberOtherMonth: {
      color: theme.border,
      fontWeight: '500',
    },
    dayNumberToday: {
      color: Colors.primaryStrong,
    },
    dayNumberSelected: {
      color: Colors.primaryStrong,
    },
    dayNumberSunday: {
      color: Colors.expense,
    },
    dotRow: {
      flexDirection: 'row',
      gap: 2,
      justifyContent: 'center',
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    incomeDot: {
      backgroundColor: Colors.income,
    },
    expenseDot: {
      backgroundColor: Colors.expense,
    },
    amountBadges: {
      gap: 1,
      alignItems: 'center',
      width: '100%',
    },
    incomeAmount: {
      fontSize: 8.5,
      fontWeight: '700',
      color: Colors.income,
      textAlign: 'center',
    },
    expenseAmount: {
      fontSize: 8.5,
      fontWeight: '700',
      color: Colors.expense,
      textAlign: 'center',
    },
    legend: {
      flexDirection: 'row',
      gap: 16,
      justifyContent: 'center',
      paddingVertical: 4,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    legendLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    detailPanel: {
      marginTop: 4,
    },
    detailCard: {
      padding: 16,
      gap: 12,
    },
    detailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailDateLabel: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.text,
    },
    closeBtn: {
      padding: 4,
    },
    daySummaryRow: {
      flexDirection: 'row',
      gap: 8,
    },
    daySumItem: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
    },
    daySumLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textSecondary,
      textAlign: 'center',
    },
    daySumValue: {
      fontSize: 13,
      fontWeight: '800',
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    daySumDivider: {
      width: 1,
      backgroundColor: theme.border,
      alignSelf: 'stretch',
    },
    detailDivider: {
      height: 1,
      backgroundColor: theme.backgroundElement,
    },
    txList: {
      maxHeight: 260,
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.backgroundElement,
    },
    txIcon: {
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    txInfo: {
      flex: 1,
      gap: 2,
    },
    txName: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
    txNote: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    txAmount: {
      fontSize: 13,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
      flexShrink: 0,
    },
    emptyDay: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 32,
    },
    emptyDayText: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    dayListCard: {
      padding: 12,
      gap: 8,
    },
    dayListHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dayListDate: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.text,
    },
    dayListNet: {
      fontSize: 14,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    dayListMeta: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    dayListMetaText: {
      fontSize: 11,
      fontWeight: '600',
    },
    monthCard: {
      padding: 10,
    },
    monthCardCurrent: {
      borderLeftWidth: 3,
      borderLeftColor: Colors.primaryDark,
    },
    monthCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    monthCardLabel: {
      width: 36,
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    monthCardLabelCurrent: {
      color: Colors.primaryStrong,
    },
    monthBarsContainer: {
      flex: 1,
      gap: 3,
    },
    monthBarTrack: {
      height: 7,
      backgroundColor: theme.backgroundElement,
      borderRadius: 3.5,
      overflow: 'hidden',
    },
    monthBar: {
      height: '100%',
      borderRadius: 3.5,
      minWidth: 2,
    },
    incomeBar: {
      backgroundColor: Colors.income,
    },
    expenseBar: {
      backgroundColor: Colors.expense,
    },
    monthAmounts: {
      width: 72,
      alignItems: 'flex-end',
      gap: 1,
    },
    monthAmountText: {
      fontSize: 11,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    monthAmountEmpty: {
      fontSize: 11,
      color: theme.border,
    },
  });

export type FinancialCalendarStyles = ReturnType<typeof createFinancialCalendarStyles>;