import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { formatMoney } from '@/shared/money';

// -------------------------------------------------------------
// 1. Category Breakdown Segmented Chart
// -------------------------------------------------------------
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
  title = 'Phân bổ chi tiêu',
  totalAmount,
  currency,
  items,
  emptyMessage = 'Chưa có dữ liệu phân bổ',
}: CategoryBreakdownChartProps) {
  const safeTotal = totalAmount > 0 ? totalAmount : items.reduce((s, i) => s + (i.amount || 0), 0);

  // Filter items with positive amount and calculate percentage
  const activeItems = items
    .filter((i) => i.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  if (activeItems.length === 0 || safeTotal <= 0) {
    return (
      <Card style={styles.chartCard}>
        {title ? <Text style={styles.chartTitle}>{title}</Text> : null}
        <View style={styles.emptyChartContainer}>
          <MaterialIcons name="pie-chart-outline" size={36} color={Colors.light.textSecondary} />
          <Text style={styles.emptyChartText}>{emptyMessage}</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.chartCard}>
      <View style={styles.chartHeaderRow}>
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={styles.chartTotalValue}>{formatMoney(safeTotal, currency)}</Text>
      </View>

      {/* Segmented multi-color bar */}
      <View style={styles.segmentedBar}>
        {activeItems.map((item, idx) => {
          const pct = Math.max(1, Math.round((item.amount / safeTotal) * 100));
          const isFirst = idx === 0;
          const isLast = idx === activeItems.length - 1;
          const itemColor = item.color || Colors.primaryDark;

          return (
            <View
              key={item.id || idx}
              style={[
                styles.segmentItem,
                {
                  flex: pct,
                  backgroundColor: itemColor,
                  borderTopLeftRadius: isFirst ? 6 : 0,
                  borderBottomLeftRadius: isFirst ? 6 : 0,
                  borderTopRightRadius: isLast ? 6 : 0,
                  borderBottomRightRadius: isLast ? 6 : 0,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Legend & Breakdown list */}
      <View style={styles.breakdownList}>
        {activeItems.map((item) => {
          const pct = Math.round((item.amount / safeTotal) * 100);
          const itemColor = item.color || Colors.primaryDark;

          return (
            <View key={item.id} style={styles.breakdownRow}>
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
                <View style={[styles.pctBadge, { backgroundColor: `${itemColor}20` }]}>
                  <Text style={[styles.pctText, { color: itemColor }]}>{pct}%</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

// -------------------------------------------------------------
// 2. Cashflow Comparison Chart (Income vs Expense vs Net)
// -------------------------------------------------------------
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
  const maxVal = Math.max(totalIncome, totalExpense, 1);
  const incomePct = Math.min(100, Math.round((totalIncome / maxVal) * 100));
  const expensePct = Math.min(100, Math.round((totalExpense / maxVal) * 100));
  const savingsRate =
    totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  return (
    <Card style={styles.chartCard}>
      <View style={styles.chartHeaderRow}>
        <Text style={styles.chartTitle}>So sánh dòng tiền</Text>
        <View
          style={[
            styles.savingsBadge,
            { backgroundColor: savingsRate >= 0 ? '#E8F5E9' : '#FFEBEE' },
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
            {savingsRate >= 0 ? `Tiết kiệm ${savingsRate}%` : `Âm ${Math.abs(savingsRate)}%`}
          </Text>
        </View>
      </View>

      {/* Income Bar */}
      <View style={styles.cashflowBarGroup}>
        <View style={styles.cashflowBarLabelRow}>
          <Text style={styles.cashflowBarLabel}>Thu nhập</Text>
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

      {/* Expense Bar */}
      <View style={styles.cashflowBarGroup}>
        <View style={styles.cashflowBarLabelRow}>
          <Text style={styles.cashflowBarLabel}>Chi tiêu</Text>
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

      {/* Net Balance Footer */}
      <View style={styles.cashflowFooter}>
        <Text style={styles.netLabel}>Số dư ròng tháng:</Text>
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

// -------------------------------------------------------------
// 3. Spending Limit Progress Gauge
// -------------------------------------------------------------
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
  const percent = limitAmount > 0 ? Math.round((spentAmount / limitAmount) * 100) : 0;
  const isOverLimit = spentAmount > limitAmount;

  let statusColor = Colors.income; // Green < 80%
  if (percent >= 100) {
    statusColor = Colors.expense; // Red > 100%
  } else if (percent >= 80) {
    statusColor = '#F59E0B'; // Yellow/Amber 80-100%
  }

  const barWidth = Math.min(100, percent);

  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeHeader}>
        <View style={styles.gaugeTitleRow}>
          <View
            style={[
              styles.gaugeIconBadge,
              { backgroundColor: categoryColor || Colors.primaryDark },
            ]}
          >
            <MaterialIcons
              name={(categoryIcon as any) || 'category'}
              size={14}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.gaugeName} numberOfLines={1}>
            {categoryName}
          </Text>
        </View>

        <Text style={[styles.gaugePercent, { color: statusColor }]}>
          {percent}% {isOverLimit ? '(Vượt)' : ''}
        </Text>
      </View>

      {/* Progress Bar */}
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
          Đã chi: <Text style={styles.gaugeBold}>{formatMoney(spentAmount, currency)}</Text>
        </Text>
        <Text style={styles.gaugeDetail}>
          Hạn mức: <Text style={styles.gaugeBold}>{formatMoney(limitAmount, currency)}</Text>
        </Text>
      </View>
    </View>
  );
}

// -------------------------------------------------------------
// 4. Daily Spending Trend Mini Chart
// -------------------------------------------------------------
export interface DailySpendingItem {
  day: number;
  amount: number;
}

export interface DailySpendingTrendChartProps {
  days: DailySpendingItem[];
  currency: string;
}

export function DailySpendingTrendChart({ days, currency }: DailySpendingTrendChartProps) {
  const maxDayAmount = Math.max(...days.map((d) => d.amount), 1);
  const totalSpent = days.reduce((sum, d) => sum + d.amount, 0);

  if (days.length === 0 || totalSpent <= 0) {
    return null;
  }

  return (
    <Card style={styles.chartCard}>
      <View style={styles.chartHeaderRow}>
        <Text style={styles.chartTitle}>Xu hướng chi tiêu trong tháng</Text>
        <Text style={styles.chartSubtitle}>
          Cao nhất: {formatMoney(maxDayAmount, currency)}
        </Text>
      </View>

      <View style={styles.trendBarsRow}>
        {days.map((d) => {
          const heightPct = Math.max(4, Math.round((d.amount / maxDayAmount) * 100));
          const isHigh = d.amount > 0 && d.amount >= maxDayAmount * 0.7;

          return (
            <View key={d.day} style={styles.trendCol}>
              <View style={styles.trendBarContainer}>
                <View
                  style={[
                    styles.trendBarFill,
                    {
                      height: `${heightPct}%`,
                      backgroundColor: isHigh ? Colors.expense : Colors.primary,
                    },
                  ]}
                />
              </View>
              {d.day % 5 === 0 || d.day === 1 || d.day === days.length ? (
                <Text style={styles.trendDayText}>{d.day}</Text>
              ) : (
                <View style={styles.trendDaySpacer} />
              )}
            </View>
          );
        })}
      </View>
    </Card>
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
    gap: 8,
  },
  emptyChartText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  segmentedBar: {
    height: 12,
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 6,
    overflow: 'hidden',
  },
  segmentItem: {
    height: '100%',
  },
  breakdownList: {
    gap: 10,
    marginTop: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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
  trendBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 90,
    gap: 2,
    paddingTop: 8,
  },
  trendCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendBarContainer: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  trendBarFill: {
    width: '80%',
    borderRadius: 3,
    minHeight: 4,
  },
  trendDayText: {
    fontSize: 9,
    color: Colors.light.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  trendDaySpacer: {
    height: 12,
    marginTop: 4,
  },
});
