import { Colors, MaxContentWidth } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const createTransactionsStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
      padding: 20,
      gap: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    eyebrow: {
      color: Colors.primaryDark,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.6,
      marginBottom: 2,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
    },
    addButton: {
      minHeight: 42,
      maxWidth: 170,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: Colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    addButtonText: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '800',
      flexShrink: 1,
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      padding: 4,
      borderRadius: 18,
      backgroundColor: theme.backgroundElement,
    },
    filterChip: {
      flexGrow: 1,
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.backgroundElement,
    },
    activeFilterChip: {
      backgroundColor: Colors.primary,
    },
    filterText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    activeFilterText: {
      color: '#1A1C2E',
      fontWeight: '700',
    },
    listContent: {
      padding: 20,
      gap: 10,
      paddingBottom: 40,
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
    },
    txCard: {
      padding: 16,
      gap: 10,
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    txIconBadge: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: theme.backgroundElement,
      alignItems: 'center',
      justifyContent: 'center',
    },
    txInfo: {
      flex: 1,
      gap: 4,
    },
    txNote: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    txDate: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    txAmount: {
      fontSize: 16,
      fontWeight: '800',
      flexShrink: 1,
      fontVariant: ['tabular-nums'],
    },
    incomeText: {
      color: Colors.income,
    },
    expenseText: {
      color: Colors.expense,
    },
    transferText: {
      color: Colors.transfer,
    },
    quickActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginLeft: 4,
    },
    actionIconBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    txFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: theme.backgroundElement,
      paddingTop: 4,
    },
    modalRoot: {
      flex: 1,
      backgroundColor: theme.background,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
    },
    modalContent: {
      padding: 20,
      gap: 16,
    },
    segmentRow: {
      flexDirection: 'row',
      backgroundColor: theme.backgroundElement,
      borderRadius: 12,
      padding: 4,
      gap: 4,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    activeExpense: {
      backgroundColor: Colors.primary,
    },
    activeIncome: {
      backgroundColor: Colors.primary,
    },
    activeText: {
      color: theme.text,
      fontWeight: '700',
    },
    formGroup: {
      gap: 8,
    },
    formLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
    },
    textInput: {
      backgroundColor: theme.backgroundElement,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 10,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
    deleteTxBtn: {
      flex: 1,
      borderColor: Colors.expense,
    },
    saveTxBtn: {
      flex: 1,
    },
    keyboardAvoid: {
      flex: 1,
    },
  });

export type TransactionsStyles = ReturnType<typeof createTransactionsStyles>;
