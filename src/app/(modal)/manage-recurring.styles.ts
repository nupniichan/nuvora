import { Colors } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const createManageRecurringStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    keyboardAvoid: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.text,
    },
    closeBtn: {
      padding: 6,
    },
    content: {
      padding: 20,
      gap: 16,
    },
    errorCard: {
      backgroundColor: '#FFEBEE',
    },
    errorText: {
      color: '#C62828',
      fontSize: 13,
      fontWeight: '600',
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
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    activeExpense: {
      backgroundColor: '#FFEBEE',
    },
    activeIncome: {
      backgroundColor: '#E8F5E9',
    },
    activeText: {
      color: theme.text,
      fontWeight: '700',
    },
    fieldCard: {
      padding: 14,
      gap: 10,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
    },
    freqRow: {
      flexDirection: 'row',
      gap: 8,
    },
    freqBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: theme.backgroundElement,
    },
    activeFreqBtn: {
      backgroundColor: Colors.primary,
    },
    freqText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    activeFreqText: {
      color: '#1A1C2E',
      fontWeight: '700',
    },
    dayPickerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    dayLabel: {
      fontSize: 14,
      color: theme.text,
    },
    daySelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dayStepBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.backgroundElement,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayValue: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      minWidth: 64,
      textAlign: 'center',
    },
    behaviorRow: {
      flexDirection: 'row',
      gap: 10,
    },
    behaviorBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.backgroundElement,
    },
    activeBehaviorBtn: {
      backgroundColor: Colors.primary,
    },
    behaviorText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    activeBehaviorText: {
      color: '#1A1C2E',
      fontWeight: '700',
    },
    saveBtn: {
      marginTop: 10,
      marginBottom: 30,
    },
  });

export type ManageRecurringStyles = ReturnType<typeof createManageRecurringStyles>;
