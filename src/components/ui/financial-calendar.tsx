import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import {
  CalendarDayData,
  MonthSummary,
  getCalendarMonthData,
  getYearMonthlySummaries,
} from '@/features/insights/calendar-data';
import { formatDateDisplay, formatYMD, getCalendarMatrix } from '@/shared/date-utils';
import { formatMoney } from '@/shared/money';

type CalendarSubView = 'grid' | 'day' | 'month';

function compactMoney(minorAmount: number, currency: string): string {
  const amount = currency === 'VND' ? minorAmount : minorAmount / 100;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`;
  return String(Math.round(amount));
}

interface Props {
  year: number;
  month: number;
  currency: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function FinancialCalendar({ year, month, currency, onPrevMonth, onNextMonth }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'vi';

  const [subView, setSubView] = useState<CalendarSubView>('grid');
  const [dayMap, setDayMap] = useState<Map<string, CalendarDayData>>(new Map());
  const [monthSummaries, setMonthSummaries] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const requestId = useRef(0);
  const detailAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    const req = ++requestId.current;
    setLoading(true);
    setLoadError(false);
    try {
      const [dayData, yearData] = await Promise.all([
        getCalendarMonthData(year, month, currency),
        getYearMonthlySummaries(year, currency),
      ]);
      if (req !== requestId.current) return;
      setDayMap(dayData);
      setMonthSummaries(yearData);
      setSelectedDate(null);
    } catch {
      if (req !== requestId.current) return;
      setLoadError(true);
    } finally {
      if (req === requestId.current) setLoading(false);
    }
  }, [year, month, currency]);

  useEffect(() => {
    loadData();
    return () => { requestId.current++; };
  }, [loadData]);

  useEffect(() => {
    if (selectedDate) {
      detailAnim.setValue(0);
      Animated.timing(detailAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  }, [selectedDate, detailAnim]);

  const calendarDays = useMemo(() => getCalendarMatrix(year, month), [year, month]);
  const weekdays = t('calendar.weekdays', { returnObjects: true }) as string[];
  const selectedDayData = selectedDate ? dayMap.get(selectedDate) : undefined;

  const sortedDays = useMemo(
    () => Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b)),
    [dayMap],
  );

  const maxMonthAmount = useMemo(
    () => Math.max(...monthSummaries.map((s) => Math.max(s.totalIncome, s.totalExpense)), 1),
    [monthSummaries],
  );

  const handleDayPress = (dateStr: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  };

  const subViewButtons: { key: CalendarSubView; label: string; icon: string }[] = [
    { key: 'grid', label: t('calendar.viewGrid'), icon: 'calendar-month' },
    { key: 'day', label: t('calendar.viewDay'), icon: 'view-list' },
    { key: 'month', label: t('calendar.viewMonth'), icon: 'bar-chart' },
  ];

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'vi-VN', { month: 'short' }).format(
          new Date(year, i, 1),
        ),
      ),
    [year, locale],
  );

  const renderTxRow = (tx: CalendarDayData['transactions'][number]) => (
    <View key={tx.id} style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: Colors.light.backgroundElement }]}>
        <MaterialIcons
          name={(tx.categoryIcon as any) || (tx.type === 'income' ? 'arrow-downward' : 'arrow-upward')}
          size={16}
          color={tx.categoryColor || (tx.type === 'income' ? Colors.income : Colors.expense)}
        />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txName} numberOfLines={1}>
          {tx.categoryName || (tx.type === 'income' ? t('calendar.income') : t('calendar.expense'))}
        </Text>
        {(tx.note || tx.groupName) ? (
          <Text style={styles.txNote} numberOfLines={1}>{tx.note || tx.groupName}</Text>
        ) : null}
      </View>
      <Text style={[styles.txAmount, { color: tx.type === 'income' ? Colors.income : Colors.expense }]}>
        {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount, tx.currency)}
      </Text>
    </View>
  );

  const renderDaySummaryRow = (data: CalendarDayData) => (
    <View style={styles.daySummaryRow}>
      <View style={styles.daySumItem}>
        <Text style={styles.daySumLabel}>{t('calendar.income')}</Text>
        <Text style={[styles.daySumValue, { color: Colors.income }]}>
          {data.totalIncome > 0 ? `+${formatMoney(data.totalIncome, currency)}` : '—'}
        </Text>
      </View>
      <View style={styles.daySumDivider} />
      <View style={styles.daySumItem}>
        <Text style={styles.daySumLabel}>{t('calendar.expense')}</Text>
        <Text style={[styles.daySumValue, { color: Colors.expense }]}>
          {data.totalExpense > 0 ? `-${formatMoney(data.totalExpense, currency)}` : '—'}
        </Text>
      </View>
      <View style={styles.daySumDivider} />
      <View style={styles.daySumItem}>
        <Text style={styles.daySumLabel}>{t('calendar.net')}</Text>
        <Text style={[styles.daySumValue, { color: data.netBalance >= 0 ? Colors.income : Colors.expense }]}>
          {data.netBalance >= 0 ? '+' : ''}{formatMoney(data.netBalance, currency)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.subViewToggle}>
        {subViewButtons.map((btn) => (
          <TouchableOpacity
            key={btn.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: subView === btn.key }}
            style={[styles.subViewBtn, subView === btn.key && styles.subViewBtnActive]}
            onPress={() => { setSubView(btn.key); setSelectedDate(null); }}
          >
            <MaterialIcons
              name={btn.icon as any}
              size={13}
              color={subView === btn.key ? Colors.primaryStrong : Colors.light.textSecondary}
            />
            <Text style={[styles.subViewLabel, subView === btn.key && styles.subViewLabelActive]}>
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primaryStrong} />
        </View>
      )}

      {loadError && (
        <TouchableOpacity accessibilityRole="button" onPress={loadData} style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('charts.loadError')} · {t('common.retry')}</Text>
        </TouchableOpacity>
      )}

      {!loading && !loadError && (
        <>
          {subView === 'grid' && (
            <>
              <View style={styles.weekdayRow}>
                {weekdays.map((label, idx) => (
                  <View key={idx} style={styles.weekdayCell}>
                    <Text style={[styles.weekdayLabel, idx === 0 && styles.sundayLabel]}>{label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarDays.map((day) => {
                  const data = dayMap.get(day.dateStr);
                  const isSelected = selectedDate === day.dateStr;
                  const hasIncome = data && data.totalIncome > 0;
                  const hasExpense = data && data.totalExpense > 0;
                  const isSunday = new Date(day.year, day.month - 1, day.day).getDay() === 0;

                  return (
                    <TouchableOpacity
                      key={day.dateStr}
                      activeOpacity={day.isCurrentMonth ? 0.75 : 1}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                        day.isToday && !isSelected && styles.dayCellToday,
                      ]}
                      onPress={() => handleDayPress(day.dateStr, day.isCurrentMonth)}
                      accessibilityRole="button"
                      accessibilityLabel={day.dateStr}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          !day.isCurrentMonth && styles.dayNumberOtherMonth,
                          day.isToday && styles.dayNumberToday,
                          isSelected && styles.dayNumberSelected,
                          isSunday && day.isCurrentMonth && !isSelected && styles.dayNumberSunday,
                        ]}
                      >
                        {day.day}
                      </Text>
                      {day.isCurrentMonth && (hasIncome || hasExpense) && (
                        <View style={styles.dotRow}>
                          {hasIncome && <View style={[styles.dot, styles.incomeDot]} />}
                          {hasExpense && <View style={[styles.dot, styles.expenseDot]} />}
                        </View>
                      )}
                      {day.isCurrentMonth && data && (
                        <View style={styles.amountBadges}>
                          {data.totalIncome > 0 && (
                            <Text style={styles.incomeAmount} numberOfLines={1}>
                              +{compactMoney(data.totalIncome, currency)}
                            </Text>
                          )}
                          {data.totalExpense > 0 && (
                            <Text style={styles.expenseAmount} numberOfLines={1}>
                              -{compactMoney(data.totalExpense, currency)}
                            </Text>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, styles.incomeDot]} />
                  <Text style={styles.legendLabel}>{t('calendar.income')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, styles.expenseDot]} />
                  <Text style={styles.legendLabel}>{t('calendar.expense')}</Text>
                </View>
              </View>

              {selectedDate && (
                <Animated.View
                  style={[
                    styles.detailPanel,
                    {
                      opacity: detailAnim,
                      transform: [{ translateY: detailAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                    },
                  ]}
                >
                  <Card style={styles.detailCard}>
                    <View style={styles.detailHeader}>
                      <Text style={styles.detailDateLabel}>{formatDateDisplay(selectedDate, locale)}</Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={t('common.close')}
                        onPress={() => setSelectedDate(null)}
                        style={styles.closeBtn}
                      >
                        <MaterialIcons name="close" size={18} color={Colors.light.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    {selectedDayData ? (
                      <>
                        {renderDaySummaryRow(selectedDayData)}
                        <View style={styles.detailDivider} />
                        <ScrollView style={styles.txList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                          {selectedDayData.transactions.map(renderTxRow)}
                        </ScrollView>
                      </>
                    ) : (
                      <View style={styles.emptyDay}>
                        <MaterialIcons name="event-available" size={28} color={Colors.light.border} />
                        <Text style={styles.emptyDayText}>{t('calendar.noTransactions')}</Text>
                      </View>
                    )}
                  </Card>
                </Animated.View>
              )}
            </>
          )}

          {subView === 'day' && (
            <>
              {sortedDays.length === 0 ? (
                <View style={styles.emptyDay}>
                  <MaterialIcons name="event-note" size={32} color={Colors.light.border} />
                  <Text style={styles.emptyDayText}>{t('calendar.noTransactionsMonth')}</Text>
                </View>
              ) : (
                sortedDays.map(([dateStr, data]) => (
                  <Card key={dateStr} style={styles.dayListCard}>
                    <View style={styles.dayListHeader}>
                      <Text style={styles.dayListDate}>{formatDateDisplay(dateStr, locale)}</Text>
                      <Text
                        style={[
                          styles.dayListNet,
                          { color: data.netBalance >= 0 ? Colors.income : Colors.expense },
                        ]}
                      >
                        {data.netBalance >= 0 ? '+' : ''}{formatMoney(data.netBalance, currency)}
                      </Text>
                    </View>
                    <View style={styles.dayListMeta}>
                      {data.totalIncome > 0 && (
                        <Text style={[styles.dayListMetaText, { color: Colors.income }]}>
                          {t('calendar.income')} +{formatMoney(data.totalIncome, currency)}
                        </Text>
                      )}
                      {data.totalExpense > 0 && (
                        <Text style={[styles.dayListMetaText, { color: Colors.expense }]}>
                          {t('calendar.expense')} -{formatMoney(data.totalExpense, currency)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.detailDivider} />
                    {data.transactions.map(renderTxRow)}
                  </Card>
                ))
              )}
            </>
          )}

          {subView === 'month' && (
            <>
              {monthSummaries.map((ms) => {
                const isCurrentMonth = ms.year === year && ms.month === month;
                const hasData = ms.totalIncome > 0 || ms.totalExpense > 0;
                const incomeWidth = Math.round((ms.totalIncome / maxMonthAmount) * 100);
                const expenseWidth = Math.round((ms.totalExpense / maxMonthAmount) * 100);

                return (
                  <Card
                    key={`${ms.year}-${ms.month}`}
                    style={[styles.monthCard, isCurrentMonth && styles.monthCardCurrent]}
                  >
                    <View style={styles.monthCardRow}>
                      <Text style={[styles.monthCardLabel, isCurrentMonth && styles.monthCardLabelCurrent]}>
                        {monthNames[ms.month - 1]}
                      </Text>
                      <View style={styles.monthBarsContainer}>
                        <View style={styles.monthBarTrack}>
                          <View style={[styles.monthBar, styles.incomeBar, { width: `${incomeWidth}%` }]} />
                        </View>
                        <View style={styles.monthBarTrack}>
                          <View style={[styles.monthBar, styles.expenseBar, { width: `${expenseWidth}%` }]} />
                        </View>
                      </View>
                      <View style={styles.monthAmounts}>
                        {hasData ? (
                          <>
                            {ms.totalIncome > 0 && (
                              <Text style={[styles.monthAmountText, { color: Colors.income }]} numberOfLines={1}>
                                +{compactMoney(ms.totalIncome, currency)}
                              </Text>
                            )}
                            {ms.totalExpense > 0 && (
                              <Text style={[styles.monthAmountText, { color: Colors.expense }]} numberOfLines={1}>
                                -{compactMoney(ms.totalExpense, currency)}
                              </Text>
                            )}
                          </>
                        ) : (
                          <Text style={styles.monthAmountEmpty}>—</Text>
                        )}
                      </View>
                    </View>
                  </Card>
                );
              })}
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
  },
  subViewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  subViewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 10,
  },
  subViewBtnActive: {
    backgroundColor: Colors.light.surface,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  subViewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  subViewLabelActive: {
    color: Colors.primaryStrong,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: Colors.expense,
    textAlign: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  sundayLabel: {
    color: Colors.expense,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    minHeight: 62,
    padding: 3,
    alignItems: 'center',
    borderRadius: 8,
    gap: 1,
  },
  dayCellToday: {
    backgroundColor: Colors.primaryLight,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
    lineHeight: 18,
  },
  dayNumberOtherMonth: {
    color: Colors.light.border,
    fontWeight: '500',
  },
  dayNumberToday: {
    color: Colors.primaryStrong,
  },
  dayNumberSelected: {
    color: Colors.primaryStrong,
  },
  dayNumberSunday: {
    color: Colors.expense,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  incomeDot: {
    backgroundColor: Colors.income,
  },
  expenseDot: {
    backgroundColor: Colors.expense,
  },
  amountBadges: {
    gap: 1,
    alignItems: 'center',
    width: '100%',
  },
  incomeAmount: {
    fontSize: 8.5,
    fontWeight: '700',
    color: Colors.income,
    textAlign: 'center',
  },
  expenseAmount: {
    fontSize: 8.5,
    fontWeight: '700',
    color: Colors.expense,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  detailPanel: {
    marginTop: 4,
  },
  detailCard: {
    padding: 16,
    gap: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailDateLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
  },
  closeBtn: {
    padding: 4,
  },
  daySummaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  daySumItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  daySumLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  daySumValue: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  daySumDivider: {
    width: 1,
    backgroundColor: Colors.light.border,
    alignSelf: 'stretch',
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.light.backgroundElement,
  },
  txList: {
    maxHeight: 260,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundElement,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  txNote: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  emptyDay: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  emptyDayText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  dayListCard: {
    padding: 12,
    gap: 8,
  },
  dayListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayListDate: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
  },
  dayListNet: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  dayListMeta: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  dayListMetaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  monthCard: {
    padding: 10,
  },
  monthCardCurrent: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primaryDark,
  },
  monthCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthCardLabel: {
    width: 36,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  monthCardLabelCurrent: {
    color: Colors.primaryStrong,
  },
  monthBarsContainer: {
    flex: 1,
    gap: 3,
  },
  monthBarTrack: {
    height: 7,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 3.5,
    overflow: 'hidden',
  },
  monthBar: {
    height: '100%',
    borderRadius: 3.5,
    minWidth: 2,
  },
  incomeBar: {
    backgroundColor: Colors.income,
  },
  expenseBar: {
    backgroundColor: Colors.expense,
  },
  monthAmounts: {
    width: 72,
    alignItems: 'flex-end',
    gap: 1,
  },
  monthAmountText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  monthAmountEmpty: {
    fontSize: 11,
    color: Colors.light.border,
  },
});
