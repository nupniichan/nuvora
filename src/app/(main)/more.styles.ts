import { Colors, MaxContentWidth } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const createMoreStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 28,
      gap: 14,
    },
    pageHeader: {
      gap: 2,
      marginBottom: 4,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.8,
      color: Colors.primaryDark,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.text,
    },
    sectionCard: {
      gap: 13,
    },
    sectionHeader: {
      fontSize: 16,
      fontWeight: '700',
      color: Colors.primaryStrong,
      paddingBottom: 2,
    },
    sectionDesc: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    cardDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 4,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
      gap: 12,
    },
    rowLabel: {
      fontSize: 14,
      color: theme.text,
    },
    rowValue: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: '700',
      color: Colors.primaryStrong,
      textAlign: 'right',
    },
    langValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    lockBtn: {
      marginTop: 6,
    },
    aboutCard: {
      alignItems: 'center',
      padding: 20,
      gap: 6,
      backgroundColor: Colors.primaryLight,
    },
    appTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
    },
    appVersion: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    appDesc: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 2,
      lineHeight: 18,
    },
  });

export type MoreStyles = ReturnType<typeof createMoreStyles>;
