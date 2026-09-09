import { MaterialIcons } from '@expo/vector-icons';
import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { DailySpendingPoint, MonthlyCashflowPoint } from '@/features/insights/insight-data';
import { formatDateISO } from '@/shared/date-utils';
import { formatMoney, toMajorUnits } from '@/shared/money';

function EmptyChart() {
  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><MaterialIcons name="insert-chart-outlined" size={30} color={Colors.primaryStrong} /></View>
      <Text style={styles.hint}>{t('charts.noActivity')}</Text>
    </View>
  );
}

function compactMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(toMajorUnits(amount, currency));
}

export function DailyExpenseChart({ days, currency }: { days: DailySpendingPoint[]; currency: string }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN';
  const gradientId = `spending${useId().replace(/:/g, '')}`;
  const todayIndex = days.findIndex((day) => day.date === formatDateISO(new Date()));
  const anchorIndex = todayIndex >= 0 ? todayIndex : Math.max(0, days.length - 1);
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [selection, setSelection] = useState(anchorIndex);
  const start = range === 'week' ? Math.max(0, anchorIndex - 6) : 0;
  const end = range === 'week' ? anchorIndex + 1 : days.length;
  const points = days.slice(start, end);
  const index = Math.max(start, Math.min(end - 1, selection));
  const selected = days[index];
  const maximum = Math.max(...points.flatMap((point) => [point.amount, point.income]), 0);
  const scale = maximum || 1;
  const expenseTotal = points.reduce((sum, point) => sum + point.amount, 0);
  const incomeTotal = points.reduce((sum, point) => sum + point.income, 0);
  const coordinatesFor = (value: (point: DailySpendingPoint) => number) => points.map((point, pointIndex) => ({
    x: points.length === 1 ? 150 : 10 + pointIndex * 280 / (points.length - 1),
    y: 142 - value(point) / scale * 122,
  }));
  const expenseCoordinates = coordinatesFor((point) => point.amount);
  const incomeCoordinates = coordinatesFor((point) => point.income);
  const pathFor = (coordinates: { x: number; y: number }[]) => coordinates.map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');
  const expenseLine = pathFor(expenseCoordinates);
  const incomeLine = pathFor(incomeCoordinates);
  const dateLabel = (date: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`));

  return (
    <Card style={styles.card}>
      <View style={styles.dailyHeader}>
        <View style={styles.heading}>
          <Text style={styles.title}>{t('charts.dailySpending')}</Text>
          <Text style={styles.hint}>{t('charts.recordedIn', { currency })}</Text>
        </View>
        <View style={styles.toggle}>
          {(['week', 'month'] as const).map((option) => (
            <TouchableOpacity key={option} accessibilityRole="button" accessibilityState={{ selected: range === option }} onPress={() => setRange(option)} style={[styles.toggleButton, range === option && styles.toggleActive]}>
              <Text style={[styles.toggleText, range === option && styles.toggleTextActive]}>{t(option === 'week' ? 'charts.sevenDays' : 'charts.fullMonth')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.dailyTotals}>
        <View style={styles.dailyMetric}>
          <View style={styles.dailyMetricLabel}>
            <View style={[styles.dot, { backgroundColor: Colors.expense }]} />
            <Text style={styles.hint}>{t('charts.expense')}</Text>
          </View>
          <Text style={[styles.dailyTotalValue, { color: Colors.expense }]}>
            -{formatMoney(expenseTotal, currency, locale)}
          </Text>
        </View>
        <View style={styles.dailyMetric}>
          <View style={styles.dailyMetricLabel}>
            <View style={[styles.dot, { backgroundColor: Colors.income }]} />
            <Text style={styles.hint}>{t('charts.income')}</Text>
          </View>
          <Text style={[styles.dailyTotalValue, { color: Colors.income }]}>
            +{formatMoney(incomeTotal, currency, locale)}
          </Text>
        </View>
      </View>
      <Text style={styles.hint}>{points.length ? `${dateLabel(points[0].date)} – ${dateLabel(points[points.length - 1].date)}` : ''}</Text>
      {maximum === 0 ? <EmptyChart /> : (
        <>
          <View style={styles.axisHeader}><Text style={styles.axisText}>{compactMoney(maximum, currency, locale)}</Text><Text style={styles.axisText}>{currency}</Text></View>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Svg width="100%" height={170} viewBox="0 0 300 158">
            <Defs><LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={Colors.expense} stopOpacity={0.12} /><Stop offset="1" stopColor={Colors.expense} stopOpacity={0.01} /></LinearGradient></Defs>
            {[20, 81, 142].map((y) => <Line key={y} x1="10" x2="290" y1={y} y2={y} stroke={Colors.light.border} strokeDasharray="4 5" />)}
            <Path d={`${expenseLine} L${expenseCoordinates[expenseCoordinates.length - 1].x},142 L${expenseCoordinates[0].x},142 Z`} fill={`url(#${gradientId})`} />
            <Path d={expenseLine} fill="none" stroke={Colors.expense} strokeWidth={3} strokeLinejoin="round" />
            <Path d={incomeLine} fill="none" stroke={Colors.income} strokeWidth={3} strokeLinejoin="round" />
            {expenseCoordinates.map((point, pointIndex) => (
              <Circle key={`expense-${points[pointIndex].date}`} cx={point.x} cy={point.y} r={index === start + pointIndex ? 5 : 2.5} fill={Colors.expense} stroke={Colors.light.surface} strokeWidth={2} />
            ))}
            {incomeCoordinates.map((point, pointIndex) => (
              <Circle key={`income-${points[pointIndex].date}`} cx={point.x} cy={point.y} r={index === start + pointIndex ? 5 : 2.5} fill={Colors.income} stroke={Colors.light.surface} strokeWidth={2} />
            ))}
          </Svg>
          </View>
          <Text style={styles.axisText}>0</Text>
          <View style={styles.axisHeader}><Text style={styles.axisText}>{dateLabel(points[0].date)}</Text><Text style={styles.axisText}>{dateLabel(points[points.length - 1].date)}</Text></View>
          <View style={styles.detail}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('charts.previousDay')} accessibilityState={{ disabled: index <= start }} disabled={index <= start} style={styles.arrow} onPress={() => setSelection(index - 1)}>
              <MaterialIcons name="chevron-left" size={24} color={index <= start ? Colors.light.border : Colors.primaryStrong} />
            </TouchableOpacity>
            <View style={styles.detailText} accessibilityLiveRegion="polite">
              <Text style={styles.hint}>{selected ? dateLabel(selected.date) : ''}</Text>
              <View style={styles.selectedValues}>
                <Text style={[styles.detailAmount, { color: Colors.expense }]}>-{formatMoney(selected?.amount ?? 0, currency)}</Text>
                <Text style={[styles.detailAmount, { color: Colors.income }]}>+{formatMoney(selected?.income ?? 0, currency)}</Text>
              </View>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('charts.nextDay')} accessibilityState={{ disabled: index >= end - 1 }} disabled={index >= end - 1} style={styles.arrow} onPress={() => setSelection(index + 1)}>
              <MaterialIcons name="chevron-right" size={24} color={index >= end - 1 ? Colors.light.border : Colors.primaryStrong} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>{t('charts.dayHint')}</Text>
        </>
      )}
    </Card>
  );
}

export function MonthlyCashflowChart({ months, currency }: { months: MonthlyCashflowPoint[]; currency: string }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN';
  const [selection, setSelection] = useState(Math.max(0, months.length - 1));
  const selected = months[Math.min(selection, months.length - 1)];
  const maximum = Math.max(...months.flatMap((month) => [month.income, month.expense]), 0);
  const monthLabel = (point: MonthlyCashflowPoint) => new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(point.year, point.month - 1, 1));
  const now = new Date();
  const isCurrent = selected?.year === now.getFullYear() && selected?.month === now.getMonth() + 1;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('charts.sixMonthCashflow')}</Text>
        <Text style={styles.hint}>{currency}</Text>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: Colors.income }]} /><Text style={styles.hint}>{t('charts.income')}</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: Colors.expense }]} /><Text style={styles.hint}>{t('charts.expense')}</Text></View>
      </View>
      {maximum === 0 ? <EmptyChart /> : (
        <>
          <View style={styles.axisHeader}><Text style={styles.axisText}>{compactMoney(maximum, currency, locale)}</Text><Text style={styles.hint}>{t('charts.tapMonth')}</Text></View>
          <View style={styles.monthPlot}>
            <View style={styles.grid}>{[0, 1, 2].map((lineIndex) => <View key={lineIndex} style={styles.gridLine} />)}</View>
            {months.map((point, index) => (
              <TouchableOpacity key={`${point.year}-${point.month}`} accessibilityRole="button" accessibilityLabel={`${monthLabel(point)}, ${t('charts.income')}: ${formatMoney(point.income, currency)}, ${t('charts.expense')}: ${formatMoney(point.expense, currency)}`} accessibilityState={{ selected: index === selection }} style={styles.monthColumn} onPress={() => setSelection(index)} activeOpacity={0.75}>
                <View style={[styles.monthBars, index === selection && styles.selectedBars]}>
                  <View style={[styles.monthBar, { height: point.income / maximum * 130, backgroundColor: Colors.income }]} />
                  <View style={[styles.monthBar, { height: point.expense / maximum * 130, backgroundColor: Colors.expense }]} />
                </View>
                <Text style={[styles.monthLabel, index === selection && styles.activeMonthLabel]}>{point.month}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {selected && <View style={styles.monthDetails} accessibilityLiveRegion="polite">
            <Text style={styles.detailAmount}>{monthLabel(selected)}</Text>
            <View style={styles.valueRow}><Text style={styles.hint}>{t('charts.income')}</Text><Text style={[styles.value, { color: Colors.income }]}>+{formatMoney(selected.income, currency)}</Text></View>
            <View style={styles.valueRow}><Text style={styles.hint}>{t('charts.expense')}</Text><Text style={[styles.value, { color: Colors.expense }]}>-{formatMoney(selected.expense, currency)}</Text></View>
            <View style={styles.valueRow}><Text style={styles.hint}>{t('budgets.netBalance')}</Text><Text style={styles.value}>{formatMoney(selected.income - selected.expense, currency)}</Text></View>
            {isCurrent && <Text style={styles.hint}>{t('charts.monthInProgress')}</Text>}
          </View>}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  dailyHeader: { gap: 14 },
  heading: { gap: 4 },
  title: { fontSize: 16, fontWeight: '800', color: Colors.light.text },
  hint: { fontSize: 12, lineHeight: 18, color: Colors.light.textSecondary },
  dailyTotals: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 },
  dailyMetric: { flexGrow: 1, flexBasis: 140, minWidth: 0, alignItems: 'center', gap: 4 },
  dailyMetricLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dailyTotalValue: { alignSelf: 'stretch', textAlign: 'center', fontSize: 18, lineHeight: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  toggle: { flexDirection: 'row', backgroundColor: Colors.light.backgroundElement, borderRadius: 12, padding: 3 },
  toggleButton: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  toggleActive: { backgroundColor: Colors.primary },
  toggleText: { fontSize: 12, fontWeight: '600', color: Colors.light.textSecondary },
  toggleTextActive: { color: Colors.primaryStrong },
  axisHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  axisText: { fontSize: 11, color: Colors.light.textSecondary },
  detail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: Colors.light.backgroundElement, borderRadius: 14, padding: 4 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  detailText: { alignItems: 'center', gap: 2, flex: 1 },
  selectedValues: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 12 },
  detailAmount: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  empty: { paddingVertical: 28, alignItems: 'center', gap: 14 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 4 },
  monthPlot: { height: 180, flexDirection: 'row', gap: 4 },
  grid: { pointerEvents: 'none', position: 'absolute', top: 20, left: 0, right: 0, height: 130, justifyContent: 'space-between' },
  gridLine: { borderTopWidth: 1, borderColor: Colors.light.border, borderStyle: 'dashed' },
  monthColumn: { flex: 1, gap: 8 },
  monthBars: { height: 150, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4, paddingBottom: 0, borderRadius: 8 },
  selectedBars: { backgroundColor: Colors.primaryFaded },
  monthBar: { width: '28%', maxWidth: 24, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  monthLabel: { textAlign: 'center', fontSize: 12, color: Colors.light.textSecondary },
  activeMonthLabel: { color: Colors.primaryStrong, fontWeight: '800' },
  monthDetails: { backgroundColor: Colors.light.backgroundElement, borderRadius: 14, padding: 14, gap: 8 },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  value: { fontSize: 14, fontWeight: '700', color: Colors.light.text, fontVariant: ['tabular-nums'] },
});
