import { Colors } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const createAddTransactionStyles = (theme: typeof Colors.light) =>
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
      paddingBottom: 30,
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
    sourcesScrollRow: {
      gap: 8,
      paddingVertical: 4,
    },
    sourceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.backgroundElement,
    },
    sourceCardActive: {
      borderColor: Colors.primaryStrong,
      backgroundColor: '#FFFFFF',
    },
    sourceIconBadge: {
      width: 28,
      height: 28,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sourceTextGroup: {
      gap: 2,
    },
    sourceName: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
    sourceNameActive: {
      color: Colors.primaryStrong,
    },
    sourceBalance: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    warningBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    dangerBanner: {
      backgroundColor: '#FFEBEE',
      borderColor: '#FFCDD2',
    },
    amberBanner: {
      backgroundColor: '#FFF8E1',
      borderColor: '#FFE082',
    },
    warningTextContainer: {
      flex: 1,
      gap: 2,
    },
    warningTitle: {
      fontSize: 13,
      fontWeight: '700',
    },
    warningSub: {
      fontSize: 12,
      color: theme.textSecondary,
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
    datePresetRow: {
      flexDirection: 'row',
      gap: 8,
    },
    datePresetBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: theme.backgroundElement,
    },
    activeDatePreset: {
      backgroundColor: Colors.primary,
    },
    datePresetText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    activeDatePresetText: {
      color: '#1A1C2E',
      fontWeight: '700',
    },
    noteInput: {
      backgroundColor: theme.backgroundElement,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
    },
    errorText: {
      fontSize: 13,
      color: '#C62828',
      textAlign: 'center',
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
  });

export type AddTransactionStyles = ReturnType<typeof createAddTransactionStyles>;
