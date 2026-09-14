import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { formatMoney } from '@/shared/money';

export interface CategoryBreakdownItem {
  id: string;
  name: string;
  amount: number;
  color?: string | null;
  icon?: string | null;
  percentage?: number;
}

export interface CategoryBreakdownChartProps {
  title?: string;
  totalAmount: number;
  currency: string;
  items: CategoryBreakdownItem[];
  emptyMessage?: string;
}

export function CategoryBreakdownChart({
  title,
  totalAmount,
  currency,
  items,
  emptyMessage,
}: CategoryBreakdownChartProps) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const resolvedTitle = title ?? t('charts.allocation');
  const resolvedEmptyMessage = emptyMessage ?? t('charts.noDistribution');
  const safeTotal = totalAmount > 0 ? totalAmount : items.reduce((s, i) => s + (i.amount || 0), 0);

  const activeItems = items
    .filter((i) => i.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const selected = activeItems.find((item) => item.id === selectedId);
  const circumference = 2 * Math.PI * 76;
  const segments = activeItems.reduce<{ item: CategoryBreakdownItem; length: number; offset: number }[]>((result, item) => {
    const previous = result[result.length - 1];
    return [...result, { item, length: item.amount / safeTotal * circumference, offset: previous ? previous.offset + previous.length : 0 }];
  }, []);

  if (activeItems.length === 0 || safeTotal <= 0) {
    return (
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>{resolvedTitle}</Text>
        <View style={styles.emptyChartContainer}>
          <View style={styles.emptyChartIcon}><MaterialIcons name="pie-chart-outline" size={36} color={Colors.primaryStrong} /></View>
          <Text style={styles.emptyChartText}>{resolvedEmptyMessage}</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.chartCard}>
      <View style={styles.chartHeaderRow}>
        <Text style={styles.chartTitle}>{resolvedTitle}</Text>
        <Text style={styles.chartTotalValue}>{formatMoney(safeTotal, currency)}</Text>
      </View>

      <View style={styles.donut} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={208} height={208} viewBox="0 0 208 208">
          <Circle cx={104} cy={104} r={76} fill="none" stroke={Colors.light.backgroundElement} strokeWidth={26} />
          <G transform="rotate(-90 104 104)">
            {segments.map(({ item, length, offset }) => {
              return <Circle key={item.id} cx={104} cy={104} r={76} fill="none" stroke={item.color || Colors.primaryDark} strokeWidth={selected?.id === item.id ? 32 : 26} strokeDasharray={[length, circumference]} strokeDashoffset={-offset} opacity={selected && selected.id !== item.id ? 0.25 : 1} />;
            })}
          </G>
        </Svg>
        <View style={styles.donutCenter}>
          <Text style={styles.donutValue}>{selected ? `${Math.round(selected.amount / safeTotal * 100)}%` : activeItems.length}</Text>
          <Text style={styles.donutLabel} numberOfLines={2}>{selected?.name ?? t('charts.categories')}</Text>
        </View>
      </View>
      <Text style={styles.chartSubtitle}>{t('charts.tapCategory')}</Text>

      <View style={styles.breakdownList}>
        {activeItems.map((item) => {
          const pct = Math.round((item.amount / safeTotal) * 100);
          const itemColor = item.color || Colors.primaryDark;

          return (
            <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityState={{ selected: selected?.id === item.id }} accessibilityLabel={`${item.name}, ${formatMoney(item.amount, currency)}, ${pct}%`} onPress={() => setSelectedId(selectedId === item.id ? null : item.id)} style={[styles.breakdownRow, selected?.id === item.id && styles.selectedBreakdown]}>
              <View style={styles.breakdownLeft}>
                <View style={[styles.legendDot, { backgroundColor: itemColor }]}>
                  {item.icon ? (
                    <MaterialIcons name={item.icon as any} size={12} color="#FFFFFF" />
                  ) : null}
                </View>
                <Text style={styles.legendName} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>

              <View style={styles.breakdownRight}>
                <Text style={styles.legendAmount}>{formatMoney(item.amount, currency)}</Text>
                <View style={[styles.pctBadge, { backgroundColor: Colors.light.backgroundElement }]}>
                  <Text style={[styles.pctText, { color: Colors.light.textSecondary }]}>{pct}%</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Card>
  );
}

export interface CashflowComparisonChartProps {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  currency: string;
}

export function CashflowComparisonChart({
  totalIncome,
  totalExpense,
  netBalance,
  currency,
}: CashflowComparisonChartProps) {
  const { t } = useTranslation();
  const maxVal = Math.max(totalIncome, totalExpense, 1);
  const incomePct = Math.min(100, Math.round((totalIncome / maxVal) * 100));
  const expensePct = Math.min(100, Math.round((totalExpense / maxVal) * 100));
  const savingsRate =
    totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  return (
    <Card style={styles.chartCard}>
      <View style={styles.chartHeaderRow}>
        <Text style={styles.chartTitle}>{t('charts.cashflow')}</Text>
        <View
          style={[
            styles.savingsBadge,
            { backgroundColor: savingsRate >= 0 ? Colors.light.backgroundElement : Colors.expenseLight },
          ]}
        >
          <MaterialIcons
            name={savingsRate >= 0 ? 'savings' : 'trending-down'}
            size={14}
            color={savingsRate >= 0 ? Colors.income : Colors.expense}
          />
          <Text
            style={[
              styles.savingsRateText,
              { color: savingsRate >= 0 ? Colors.income : Colors.expense },
            ]}
          >
            {t(savingsRate >= 0 ? 'charts.savings' : 'charts.negative', { percent: Math.abs(savingsRate) })}
          </Text>
        </View>
      </View>

      <View style={styles.cashflowBarGroup}>
        <View style={styles.cashflowBarLabelRow}>
          <Text style={styles.cashflowBarLabel}>{t('charts.income')}</Text>
          <Text style={[styles.cashflowBarValue, { color: Colors.income }]}>
            +{formatMoney(totalIncome, currency)}
          </Text>
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${incomePct}%`, backgroundColor: Colors.income },
            ]}
          />
        </View>
      </View>

      <View style={styles.cashflowBarGroup}>
        <View style={styles.cashflowBarLabelRow}>
          <Text style={styles.cashflowBarLabel}>{t('charts.expense')}</Text>
          <Text style={[styles.cashflowBarValue, { color: Colors.expense }]}>
            -{formatMoney(totalExpense, currency)}
          </Text>
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${expensePct}%`, backgroundColor: Colors.expense },
            ]}
          />
        </View>
      </View>

      <View style={styles.cashflowFooter}>
        <Text style={styles.netLabel}>{t('charts.net')}:</Text>
        <Text
          style={[
            styles.netValue,
            { color: netBalance >= 0 ? Colors.income : Colors.expense },
          ]}
        >
          {netBalance >= 0 ? '+' : ''}
          {formatMoney(netBalance, currency)}
        </Text>
      </View>
    </Card>
  );
}

export interface SpendingLimitGaugeProps {
  categoryName: string;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  spentAmount: number;
  limitAmount: number;
  currency: string;
}

export function SpendingLimitGauge({
  categoryName,
  categoryIcon,
  categoryColor,
  spentAmount,
  limitAmount,
  currency,
}: SpendingLimitGaugeProps) {
  const { t } = useTranslation();
  const percent = limitAmount > 0 ? Math.round((spentAmount / limitAmount) * 100) : 0;
  const isOverLimit = spentAmount > limitAmount;

  let statusColor: string = Colors.primaryDark;
  if (percent >= 100) {
    statusColor = Colors.expense;
  } else if (percent >= 80) {
    statusColor = Colors.warning;
  }

  const barWidth = Math.min(100, percent);

  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeHeader}>
        <View style={styles.gaugeTitleRow}>
          <View
            style={[
              styles.gaugeIconBadge,
              { backgroundColor: Colors.light.backgroundElement },
            ]}
          >
            <MaterialIcons
              name={(categoryIcon as any) || 'category'}
              size={14}
              color={categoryColor || Colors.primaryDark}
            />
          </View>
          <Text style={styles.gaugeName} numberOfLines={1}>
            {categoryName}
          </Text>
        </View>

        <Text style={[styles.gaugePercent, { color: statusColor }]}>
          {percent}% {isOverLimit ? `(${t('charts.over')})` : ''}
        </Text>
      </View>

      <View style={styles.gaugeTrack}>
        <View
          style={[
            styles.gaugeFill,
            { width: `${barWidth}%`, backgroundColor: statusColor },
          ]}
        />
      </View>

      <View style={styles.gaugeFooter}>
        <Text style={styles.gaugeDetail}>
          {t('charts.spent')}: <Text style={styles.gaugeBold}>{formatMoney(spentAmount, currency)}</Text>
        </Text>
        <Text style={styles.gaugeDetail}>
          {t('charts.limit')}: <Text style={styles.gaugeBold}>{formatMoney(limitAmount, currency)}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: Colors.light.text,
  },
  chartSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  chartTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  emptyChartContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyChartIcon: { width: 68, height: 68, borderRadius: 24, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyChartText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
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
  donutLabel: { fontSize: 12, lineHeight: 17, color: Colors.light.textSecondary, textAlign: 'center' },
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
    color: Colors.light.text,
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
    color: Colors.light.text,
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
    color: Colors.light.textSecondary,
  },
  cashflowBarValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    backgroundColor: Colors.light.backgroundElement,
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
    borderTopColor: Colors.light.border,
  },
  netLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  netValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  gaugeContainer: {
    padding: 12,
    backgroundColor: Colors.light.backgroundElement,
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
    color: Colors.light.text,
    flex: 1,
  },
  gaugePercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  gaugeTrack: {
    height: 8,
    backgroundColor: Colors.light.surface,
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
    color: Colors.light.textSecondary,
  },
  gaugeBold: {
    fontWeight: '700',
    color: Colors.light.text,
  },
});
