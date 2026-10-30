import { Colors, MaxContentWidth } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const createBudgetsStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: 12,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.text,
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.8,
      color: Colors.primaryDark,
    },
    segmentControl: {
      flexDirection: 'row',
      backgroundColor: theme.backgroundElement,
      borderRadius: 12,
      padding: 3,
      gap: 3,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 7,
      borderRadius: 10,
    },
    segmentBtnActive: {
      backgroundColor: theme.surface,
      shadowColor: Colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    segmentLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    segmentLabelActive: {
      color: Colors.primaryStrong,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.backgroundElement,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    navArrowBtn: {
      padding: 6,
    },
    monthNavTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.text,
    },
    content: {
      width: '100%',
      maxWidth: MaxContentWidth,
      alignSelf: 'center',
      padding: 20,
      gap: 16,
      paddingBottom: 40,
    },
    overviewCard: {
      padding: 20,
      gap: 14,
      borderTopWidth: 4,
      borderTopColor: Colors.primary,
    },
    overviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    overviewTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
    },
    overLimitBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: Colors.expenseLight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    overLimitBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: Colors.expense,
    },
    metricsRow: {
      gap: 12,
    },
    metricItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    metricDivider: {
      height: 1,
      backgroundColor: theme.border,
    },
    metricLabel: {
      fontSize: 13,
      flexShrink: 1,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 2,
    },
    metricValue: {
      fontSize: 16,
      fontWeight: '800',
      flexShrink: 1,
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
    overviewProgressSection: {
      gap: 6,
      borderTopWidth: 1,
      borderTopColor: theme.backgroundElement,
      paddingTop: 10,
    },
    progressHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    progressLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    progressPercent: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.text,
    },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.backgroundElement,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    quickBar: {
      flexDirection: 'row',
      gap: 10,
    },
    quickBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.backgroundElement,
    },
    quickBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
    primaryQuickBtn: {
      backgroundColor: Colors.primary,
    },
    primaryQuickBtnText: {
      color: theme.text,
    },
    section: {
      gap: 10,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.text,
    },
    sectionTotalText: {
      fontSize: 15,
      fontWeight: '800',
    },
    seeAllLink: {
      fontSize: 13,
      fontWeight: '700',
      color: Colors.primaryDark,
    },
    emptyCategoryCard: {
      padding: 16,
      alignItems: 'center',
      gap: 8,
    },
    emptyCategoryText: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    addGoalInlineBtn: {
      marginTop: 4,
    },
    catCard: {
      padding: 12,
    },
    catRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    catIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catDetails: {
      flex: 1,
      gap: 4,
    },
    catTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    catName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    catSubtext: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    catAmount: {
      fontSize: 14,
      fontWeight: '800',
    },
    catRemainingText: {
      fontSize: 11,
      fontWeight: '700',
    },
    okText: {
      color: Colors.income,
    },
    overspentText: {
      color: Colors.expense,
    },
    catProgressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.backgroundElement,
      overflow: 'hidden',
    },
    catProgressBar: {
      height: '100%',
      borderRadius: 3,
    },
    catAmountsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    catAmountSpent: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    catLimitAmount: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.text,
    },
    catNoLimit: {
      fontSize: 11,
      color: theme.textSecondary,
      fontStyle: 'italic',
    },
    goalMiniCard: {
      padding: 12,
      gap: 8,
    },
    goalMiniHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    goalMiniIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    goalMiniName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    goalMiniPct: {
      fontSize: 13,
      fontWeight: '800',
      color: Colors.primaryDark,
    },
    goalMiniTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.backgroundElement,
      overflow: 'hidden',
    },
    goalMiniFill: {
      height: '100%',
      borderRadius: 3,
    },
    goalMiniAmounts: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    goalMiniCurrent: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text,
    },
    goalMiniTarget: {
      fontSize: 12,
      color: theme.textSecondary,
    },
  });

export type BudgetsStyles = ReturnType<typeof createBudgetsStyles>;