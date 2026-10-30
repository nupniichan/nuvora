import { Colors } from '@/constants/theme';
import { Platform, StyleSheet } from 'react-native';

export const createBackupRestoreStyles = (theme: typeof Colors.light) =>
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
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingTop: 14,
      gap: 10,
    },
    tabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.backgroundElement,
    },
    activeTabBtn: {
      backgroundColor: Colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    activeTabText: {
      color: '#1A1C2E',
      fontWeight: '700',
    },
    content: {
      padding: 20,
      gap: 16,
    },
    errorCard: {
      backgroundColor: Colors.expenseLight,
    },
    errorText: {
      color: Colors.error,
      fontSize: 13,
      fontWeight: '600',
    },
    successCard: {
      backgroundColor: Colors.incomeLight,
    },
    successText: {
      color: Colors.success,
      fontSize: 13,
      fontWeight: '700',
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      backgroundColor: theme.backgroundElement,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    outputSection: {
      gap: 8,
      marginTop: 8,
    },
    outputHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    outputLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
    codeBox: {
      height: 140,
      backgroundColor: theme.backgroundElement,
      borderRadius: 12,
      padding: 12,
      fontSize: 11,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      color: theme.text,
      textAlignVertical: 'top',
    },
    inputGroup: {
      gap: 6,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    inputCodeBox: {
      height: 120,
    },
    restoreBtn: {
      marginTop: 6,
    },
    statsCard: {
      padding: 14,
      gap: 6,
      backgroundColor: Colors.incomeLight,
    },
    statsTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: Colors.success,
    },
    statLine: {
      fontSize: 13,
      color: theme.text,
    },
    reminderCard: {
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
    },
    reminderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    reminderHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    reminderTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    reminderDesc: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    frequencyGroup: {
      gap: 8,
      marginTop: 4,
    },
    frequencyLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    frequencyPills: {
      flexDirection: 'row',
      gap: 8,
    },
    freqPill: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 10,
      backgroundColor: theme.backgroundElement,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    freqPillActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primaryStrong,
    },
    freqPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
      textAlign: 'center',
    },
    freqPillTextActive: {
      color: '#1A1C2E',
      fontWeight: '700',
    },
    lastBackupRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    lastBackupLabel: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    lastBackupValue: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    customDaysContainer: {
      gap: 6,
      marginTop: 6,
    },
    customDaysLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    customDaysInput: {
      height: 42,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      fontSize: 14,
      color: theme.text,
      backgroundColor: theme.surface,
    },
    folderCard: {
      backgroundColor: theme.backgroundElement,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 14,
      gap: 10,
    },
    folderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    folderHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    folderTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      flex: 1,
    },
    folderDesc: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 17,
    },
    changeFolderBtn: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: Colors.primaryLight,
    },
    changeFolderText: {
      fontSize: 12,
      fontWeight: '700',
      color: Colors.primaryDark,
    },
    autoSaveRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    autoSaveText: {
      fontSize: 13,
      color: theme.text,
      flex: 1,
      paddingRight: 8,
    },
    passwordContainer: {
      gap: 6,
    },
    passwordHint: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 16,
      marginTop: -2,
    },
    savedNoticeCard: {
      backgroundColor: Colors.incomeLight,
      borderColor: '#A5D6A7',
      borderWidth: 1,
      padding: 12,
      gap: 6,
      borderRadius: 12,
    },
    savedNoticeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    savedNoticeTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: Colors.success,
    },
    savedNoticeText: {
      fontSize: 12,
      color: Colors.success,
      lineHeight: 17,
    },
    selectedFileBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: Colors.incomeLight,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#A5D6A7',
    },
    selectedFileText: {
      fontSize: 13,
      fontWeight: '600',
      color: Colors.success,
      flex: 1,
    },
    toggleManualJsonBtn: {
      alignSelf: 'flex-start',
      paddingVertical: 4,
    },
    toggleManualJsonText: {
      fontSize: 13,
      fontWeight: '600',
      color: Colors.primaryDark,
    },
  });

export type BackupRestoreStyles = ReturnType<typeof createBackupRestoreStyles>;