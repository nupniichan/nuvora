import { Colors } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const createManageBudgetStyles = (theme: typeof Colors.light) =>
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
    sectionCard: {
      padding: 16,
      gap: 14,
    },
    toggleRow: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    toggleTextInfo: {
      flex: 1,
      paddingRight: 10,
      gap: 2,
    },
    toggleTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    toggleDesc: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 16,
    },
    totalInputBox: {
      marginTop: 4,
    },
    listSection: {
      gap: 10,
    },
    listHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    listTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    totalLimitsBadge: {
      fontSize: 13,
      fontWeight: '800',
      color: Colors.primaryDark,
    },
    warningBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#FFF3E0',
      borderColor: '#FFE0B2',
      borderWidth: 1,
      padding: 10,
      borderRadius: 10,
    },
    warningText: {
      flex: 1,
      fontSize: 12,
      color: '#E65100',
      lineHeight: 16,
    },
    catCard: {
      padding: 14,
      gap: 10,
    },
    catCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    catIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catNameContainer: {
      flex: 1,
    },
    catName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    catGroup: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    catInputContainer: {
      marginTop: 2,
    },
    unlimitedText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontStyle: 'italic',
      paddingLeft: 46,
    },
    saveBtn: {
      marginTop: 10,
      marginBottom: 30,
    },
  });

export type ManageBudgetStyles = ReturnType<typeof createManageBudgetStyles>;
