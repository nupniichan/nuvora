import { Colors } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const createManageFundsStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
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
    headerTitleContainer: {
      gap: 2,
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
      color: Colors.primaryStrong,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.text,
    },
    closeBtn: {
      padding: 6,
    },
    scrollContent: {
      padding: 20,
      gap: 16,
      paddingBottom: 40,
    },
    summaryCard: {
      padding: 16,
      borderRadius: 16,
      backgroundColor: theme.backgroundElement,
      gap: 14,
    },
    summaryTop: {
      alignItems: 'center',
      gap: 4,
    },
    summaryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    summaryBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: Colors.primaryStrong,
      textTransform: 'uppercase',
    },
    totalAssetsAmount: {
      fontSize: 28,
      fontWeight: '900',
      color: theme.text,
    },
    summarySplit: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 12,
    },
    splitItem: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    splitIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    splitLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    splitValue: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.text,
    },
    splitDivider: {
      width: 1,
      height: 28,
      backgroundColor: theme.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    createBtnHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: theme.backgroundElement,
    },
    createBtnHeaderText: {
      fontSize: 13,
      fontWeight: '700',
      color: Colors.primaryStrong,
    },
    emptyCard: {
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    emptyDesc: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    emptyActionBtn: {
      marginTop: 8,
    },
    fundCard: {
      padding: 16,
      borderRadius: 16,
      gap: 12,
    },
    fundCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    fundIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fundHeaderInfo: {
      flex: 1,
      gap: 2,
    },
    fundName: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.text,
    },
    fundDesc: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    reorderGroup: {
      flexDirection: 'row',
      gap: 4,
    },
    reorderBtn: {
      padding: 6,
      borderRadius: 6,
      backgroundColor: theme.backgroundElement,
    },
    progressSection: {
      gap: 6,
    },
    progressContainer: {
      height: 8,
      backgroundColor: theme.backgroundElement,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 4,
    },
    targetRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    targetLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    targetValue: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    balanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      borderTopWidth: 1,
      borderTopColor: theme.backgroundElement,
      paddingTop: 10,
    },
    balanceLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    balanceValue: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: theme.backgroundElement,
      paddingTop: 10,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: theme.backgroundElement,
    },
    actionBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text,
    },
    iconOnlyBtn: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.backgroundElement,
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
      paddingTop: 12,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
    },
    modalSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    keyboardAvoid: {
      flex: 1,
    },
    modalContent: {
      padding: 20,
      gap: 16,
      paddingBottom: 40,
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
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
    },
    targetToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    checkboxBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    checkboxActive: {},
    checkboxLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    modalFooter: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
    contextBanner: {
      padding: 14,
      backgroundColor: theme.backgroundElement,
      borderRadius: 12,
      gap: 6,
    },
    contextLabel: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    contextValue: {
      fontWeight: '700',
      color: theme.text,
    },
    targetFundsList: {
      gap: 8,
    },
    fundSelectOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    fundSelectOptionActive: {
      borderColor: Colors.primaryStrong,
      backgroundColor: theme.backgroundElement,
    },
    fundOptionBadge: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fundOptionDetails: {
      flex: 1,
      gap: 2,
    },
    fundOptionName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    fundOptionNameActive: {
      color: Colors.primaryStrong,
    },
    fundOptionBalance: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 12,
      backgroundColor: Colors.expenseLight,
    },
    warningBoxText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
      color: Colors.expense,
    },
    deleteOptionCard: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      gap: 10,
    },
    deleteOptionCardActive: {
      borderColor: Colors.primaryStrong,
      backgroundColor: theme.backgroundElement,
    },
    radioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    deleteOptionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    deleteOptionDesc: {
      fontSize: 12,
      color: theme.textSecondary,
      marginLeft: 28,
    },
    historyCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
    },
    historyLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    historyIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyDetails: {
      flex: 1,
      gap: 2,
    },
    historyType: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
    historyNote: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    historyDate: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    historyAmount: {
      fontSize: 15,
      fontWeight: '800',
    },
  });

export type ManageFundsStyles = ReturnType<typeof createManageFundsStyles>;