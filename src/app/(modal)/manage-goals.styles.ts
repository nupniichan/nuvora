import { Colors } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const createManageGoalsStyles = (theme: typeof Colors.light) =>
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
    emptyCard: {
      alignItems: 'center',
      padding: 32,
      gap: 10,
      marginTop: 10,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    emptyDesc: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    goalCard: {
      padding: 16,
      gap: 12,
    },
    goalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    goalIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    goalTitleDetails: {
      flex: 1,
      gap: 2,
    },
    goalName: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.text,
    },
    goalTypeLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#E8F5E9',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    completedText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#2E7D32',
    },
    overdueBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#FFEBEE',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    overdueText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#C62828',
    },
    progressContainer: {
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.backgroundElement,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 5,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    currentAmountText: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.text,
    },
    targetAmountText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    alignRight: {
      alignItems: 'flex-end',
    },
    pctBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: theme.backgroundElement,
    },
    pctText: {
      fontSize: 13,
      fontWeight: '800',
      color: Colors.primaryDark,
    },
    completeButton: { flex: 1 },
    balanceHelp: { fontSize: 12, lineHeight: 18, color: theme.textSecondary },
    goalActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: theme.backgroundElement,
      paddingTop: 10,
      marginTop: 2,
    },
    iconActionBtn: {
      padding: 8,
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
    modalContent: {
      padding: 20,
      gap: 16,
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
    typeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: theme.backgroundElement,
    },
    selectedTypeChip: {
      backgroundColor: Colors.primary,
    },
    typeChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    selectedTypeChipText: {
      color: '#1A1C2E',
      fontWeight: '700',
    },
    modalFooter: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
  });

export type ManageGoalsStyles = ReturnType<typeof createManageGoalsStyles>;
