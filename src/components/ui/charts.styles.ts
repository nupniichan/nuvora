import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export const createChartsStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
  chartCard: {
    padding: 16,
    gap: 14,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  chartSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  chartTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
  },
  emptyChartContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyChartIcon: { width: 68, height: 68, borderRadius: 24, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyChartText: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  breakdownList: {
    gap: 10,
    marginTop: 4,
  },
  breakdownRow: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  selectedBreakdown: { backgroundColor: Colors.primaryFaded },
  donut: { width: 208, height: 208, alignSelf: 'center' },
  donutCenter: { pointerEvents: 'none', position: 'absolute', top: 52, left: 52, width: 104, height: 104, alignItems: 'center', justifyContent: 'center', gap: 4 },
  donutValue: { fontSize: 32, fontWeight: '800', color: Colors.primaryStrong },
  donutLabel: { fontSize: 12, lineHeight: 17, color: theme.textSecondary, textAlign: 'center' },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  legendDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.text,
    flex: 1,
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
  pctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 38,
    alignItems: 'center',
  },
  pctText: {
    fontSize: 12,
    fontWeight: '700',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsRateText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cashflowBarGroup: {
    gap: 6,
  },
  cashflowBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cashflowBarLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  cashflowBarValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    backgroundColor: theme.backgroundElement,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  cashflowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  netLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  netValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  gaugeContainer: {
    padding: 12,
    backgroundColor: theme.backgroundElement,
    borderRadius: 12,
    gap: 8,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  gaugeIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    flex: 1,
  },
  gaugePercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  gaugeTrack: {
    height: 8,
    backgroundColor: theme.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
  },
  gaugeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeDetail: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  gaugeBold: {
    fontWeight: '700',
    color: theme.text,
  },
});


export type ChartsStyles = ReturnType<typeof createChartsStyles>;
