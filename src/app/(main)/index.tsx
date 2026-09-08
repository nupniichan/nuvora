import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { CategoryBreakdownChart } from '@/components/ui/charts';
import { DailyExpenseChart } from '@/components/ui/insight-charts';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, MaxContentWidth } from '@/constants/theme';
import { TransactionRow } from '@/database/types';
import { getAllAccounts, getDefaultAccount } from '@/features/accounts/account-queries';
import {
  GOAL_COMPLETION_CATEGORY_ID,
  getMonthlySnapshot,
  MonthlySnapshot,
} from '@/features/budgets/budget-queries';
import {
  FinancialGoalWithProgress,
  getAllGoals,
} from '@/features/goals/financial-goals';
import { calculateDueOccurrences } from '@/features/recurring/recurring-engine';
import {
  PendingOccurrenceWithRule,
  confirmOccurrence,
  getAllRecurringRules,
  getPendingOccurrences,
  processRecurringCatchUp,
  skipOccurrence,
} from '@/features/recurring/recurring-queries';
import { getTransactions } from '@/features/transactions/transaction-queries';
import { getSpendingHistory, SpendingHistory } from '@/features/insights/insight-data';
import { BalanceComparison, BalanceComparisonPeriod, buildBalanceComparisons } from '@/features/insights/balance-comparison';
import { formatDateISO } from '@/shared/date-utils';
import { formatMoney } from '@/shared/money';

interface UpcomingForecastItem {
  ruleId: string;
  ruleName: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
}

export default function DashboardScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN';

  const [balanceComparisons, setBalanceComparisons] = useState<BalanceComparison[]>([]);
  const [comparisonPeriod, setComparisonPeriod] = useState<BalanceComparisonPeriod>('month');
  const [balanceLoadError, setBalanceLoadError] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<TransactionRow[]>([]);
  const [snapshot, setSnapshot] = useState<MonthlySnapshot | null>(null);
  const [history, setHistory] = useState<SpendingHistory | null>(null);
  const [activeGoals, setActiveGoals] = useState<FinancialGoalWithProgress[]>([]);
  const [pendingOccurrences, setPendingOccurrences] = useState<PendingOccurrenceWithRule[]>([]);
  const [upcomingForecast, setUpcomingForecast] = useState<UpcomingForecastItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setBalanceLoadError(false);
      await getDefaultAccount();

      // 1. Run recurring catch-up reconciliation
      await processRecurringCatchUp();

      // 2. Load accounts
      const accs = await getAllAccounts();

      // 3. Load recent confirmed transactions
      const txs = await getTransactions();
      setRecentTransactions(txs.filter((tx) => tx.status === 'confirmed').slice(0, 5));
      setBalanceComparisons(buildBalanceComparisons(accs, txs));

      // 4. Load monthly snapshot for current month
      const now = new Date();
      const snap = await getMonthlySnapshot(now.getFullYear(), now.getMonth() + 1);
      setSnapshot(snap);
      setHistory(await getSpendingHistory(now.getFullYear(), now.getMonth() + 1, snap.currency));

      // 5. Load active financial goals
      const g = await getAllGoals('active');
      setActiveGoals(g.slice(0, 2));

      // 6. Load pending occurrences
      const pending = await getPendingOccurrences();
      setPendingOccurrences(pending);

      // 6. Calculate upcoming forecast (next 30 days)
      const allRules = await getAllRecurringRules();
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const next30Days = new Date(today);
      next30Days.setDate(next30Days.getDate() + 30);

      const fromStr = formatDateISO(tomorrow);
      const toStr = formatDateISO(next30Days);

      const forecastList: UpcomingForecastItem[] = [];
      for (const rule of allRules) {
        if (!rule.is_active) continue;
        const dueDates = calculateDueOccurrences(
          {
            frequency: rule.frequency as any,
            interval: rule.interval,
            day_of_month: rule.day_of_month,
            day_of_week: rule.day_of_week,
            month_end_behavior: rule.month_end_behavior as any,
            start_date: rule.start_date,
            end_date: rule.end_date,
          },
          fromStr,
          toStr
        );
        for (const d of dueDates) {
          forecastList.push({
            ruleId: rule.id,
            ruleName: rule.name,
            type: rule.type,
            amount: rule.amount,
            currency: rule.currency,
            date: d,
          });
        }
      }
      forecastList.sort((a, b) => a.date.localeCompare(b.date));
      setUpcomingForecast(forecastList.slice(0, 5));
    } catch (e) {
      setBalanceLoadError(true);
      console.error('Failed to load dashboard data', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleConfirmOccurrence = async (id: string) => {
    await confirmOccurrence(id);
    await loadData();
  };

  const handleSkipOccurrence = async (id: string) => {
    await skipOccurrence(id);
    await loadData();
  };

  const monthLabel = new Intl.DateTimeFormat(i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN', {
    month: 'long', year: 'numeric',
  }).format(new Date());

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.header}>
          <View style={styles.brandInfo}>
            <Text style={styles.greeting}>Nuvora</Text>
            <Text style={styles.headerSubtitle}>{t('dashboard.greeting')}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBadge}
            accessibilityRole="button"
            accessibilityLabel={t('settings.title')}
            onPress={() => router.push('/(main)/more')}
          >
            <MaterialIcons name="settings" size={20} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        {/* Total Balance Card */}
        <Card style={styles.balanceCard}>
          <View pointerEvents="none" style={styles.balanceOrbit} />
          <View pointerEvents="none" style={styles.balanceOrbitInner} />
          <View style={styles.balanceTop}>
            <View style={styles.balanceHeading}>
              <MaterialIcons name="account-balance-wallet" size={18} color={Colors.primaryStrong} />
              <Text style={styles.balanceLabel}>{t('dashboard.totalBalance')}</Text>
            </View>
            <MaterialIcons name="auto-awesome" size={24} color={Colors.primaryStrong} />
          </View>
          {balanceComparisons.map((comparison) => {
            const change = comparison[comparisonPeriod];
            const amount = change.amount;
            const color = amount === null || amount === 0
              ? Colors.primaryStrong : amount > 0 ? Colors.income : Colors.expense;
            const percent = change.percent === null ? null : new Intl.NumberFormat(
              locale,
              { style: 'percent', maximumFractionDigits: 1 },
            ).format(Math.abs(change.percent) / 100);
            const changeKey = amount !== null && amount > 0
              ? percent === null ? 'dashboard.balanceIncreased' : 'dashboard.balanceIncreasedWithPercent'
              : percent === null ? 'dashboard.balanceDecreased' : 'dashboard.balanceDecreasedWithPercent';
            return (
              <View key={comparison.currency} style={styles.balanceCurrencyBlock}>
                <Text style={[styles.balanceAmount, compact && styles.compactBalanceAmount]}>
                  {formatMoney(comparison.balance, comparison.currency, locale)}
                </Text>
                <View style={styles.balanceChangeRow} accessibilityLiveRegion="polite">
                  <MaterialIcons
                    name={amount === null ? 'info-outline' : amount > 0 ? 'trending-up' : amount < 0 ? 'trending-down' : 'remove'}
                    size={18}
                    color={color}
                  />
                  <Text style={[styles.balanceChangeText, { color }]}>
                    {amount === null
                      ? t('dashboard.balanceNoHistory')
                      : amount === 0
                        ? t('dashboard.balanceUnchanged')
                        : t(changeKey, { amount: formatMoney(Math.abs(amount), comparison.currency, locale), percent })}
                  </Text>
                </View>
              </View>
            );
          })}
          {balanceComparisons.length === 0 && (
            <Text style={styles.balanceChangeText}>{t(balanceLoadError ? 'dashboard.balanceLoadError' : 'common.loading')}</Text>
          )}
          {balanceLoadError && balanceComparisons.length > 0 && (
            <Text style={styles.balanceChangeText}>{t('dashboard.balanceLoadError')}</Text>
          )}
          <View style={styles.balanceComparisonFooter}>
            <Text style={styles.balanceComparisonLabel}>
              {t(comparisonPeriod === 'month' ? 'dashboard.balanceVsMonth' : 'dashboard.balanceVsYear')}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t(comparisonPeriod === 'month' ? 'dashboard.switchToYear' : 'dashboard.switchToMonth')}
              onPress={() => setComparisonPeriod((period) => period === 'month' ? 'year' : 'month')}
              activeOpacity={0.75}
              style={styles.balanceSwitch}
            >
              <MaterialIcons name="swap-horiz" size={18} color={Colors.primaryStrong} />
              <Text style={styles.balanceSwitchText}>
                {t(comparisonPeriod === 'month' ? 'dashboard.previousMonth' : 'dashboard.previousYear')}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        <View style={styles.shortcuts}>
          {([
            { icon: 'add', label: t('transactions.quickAdd'), route: '/(modal)/add-transaction', color: Colors.primary, ink: Colors.primaryStrong },
            { icon: 'donut-small', label: t('navigation.plans'), route: '/(main)/budgets', color: Colors.primaryLight, ink: Colors.primaryStrong },
            { icon: 'outlined-flag', label: t('dashboard.goals'), route: '/(modal)/manage-goals', color: Colors.accent, ink: Colors.accentDark },
            { icon: 'event-repeat', label: t('dashboard.recurringShortcut'), route: '/(modal)/manage-recurring', color: Colors.transferLight, ink: Colors.transfer },
          ] as const).map((action) => (
            <TouchableOpacity key={action.route} accessibilityRole="button" style={styles.shortcut} onPress={() => router.push(action.route)} activeOpacity={0.75}>
              <View style={[styles.shortcutIcon, { backgroundColor: action.color }]}>
                <MaterialIcons name={action.icon} size={24} color={action.ink} />
              </View>
              <Text style={styles.shortcutLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pending Confirmations Card (Phase 1C) */}
        {pendingOccurrences.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.pendingHeaderRow}>
                <MaterialIcons name="notifications-active" size={18} color={Colors.primaryStrong} />
                <Text style={styles.sectionTitle}>{t('dashboard.pendingCount', { count: pendingOccurrences.length })}</Text>
              </View>
            </View>

            {pendingOccurrences.map((item) => (
              <Card key={item.id} style={styles.pendingCard}>
                <View style={styles.pendingTop}>
                  <View style={styles.pendingDetails}>
                    <Text style={styles.pendingRuleName}>{item.rule_name}</Text>
                    <Text style={styles.pendingDate}>
                      {t('dashboard.dueOn', { date: item.scheduled_date })}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.pendingAmount,
                      item.rule_type === 'income' ? styles.incomeText : styles.expenseText,
                    ]}
                  >
                    {item.rule_type === 'income' ? '+' : '-'}
                    {formatMoney(item.rule_amount, item.rule_currency)}
                  </Text>
                </View>

                <View style={styles.pendingActions}>
                  <TouchableOpacity
                    style={[styles.pendingBtn, styles.skipBtn]}
                    onPress={() => handleSkipOccurrence(item.id)}
                  >
                    <Text style={styles.skipBtnText}>{t('dashboard.skip')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pendingBtn, styles.confirmBtn]}
                    onPress={() => handleConfirmOccurrence(item.id)}
                  >
                    <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>{t('dashboard.post')}</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Monthly Financial Snapshot Summary */}
        {snapshot && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>{t('dashboard.thisMonth')}</Text>
                <Text style={styles.sectionSubtitle}>{monthLabel}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(main)/budgets')}>
                <Text style={styles.seeAll}>{t('dashboard.details')} →</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.flowCards, compact && styles.compactFlowCards]}>
              {([
                { label: t('transactions.income'), amount: snapshot.totalIncome, icon: 'south-west', color: Colors.income, surface: Colors.incomeLight, sign: '+' },
                { label: t('transactions.expense'), amount: snapshot.totalExpense, icon: 'north-east', color: Colors.expense, surface: Colors.expenseLight, sign: '-' },
              ] as const).map((metric) => (
                <Card key={metric.label} style={[styles.flowCard, compact && styles.compactFlowCard]}>
                  <View style={styles.flowHeading}>
                    <View style={[styles.flowIcon, { backgroundColor: metric.surface }]}><MaterialIcons name={metric.icon} size={18} color={metric.color} /></View>
                    <Text style={styles.flowLabel}>{metric.label}</Text>
                  </View>
                  <Text style={[styles.flowAmount, compact && styles.compactFlowAmount, { color: metric.color }]}>{metric.sign}{formatMoney(metric.amount, snapshot.currency)}</Text>
                </Card>
              ))}
            </View>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/(main)/budgets')}
            >
              <Card style={styles.budgetCard}>
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetName}>{t(snapshot.netBalance >= 0 ? 'dashboard.surplus' : 'dashboard.deficit', { amount: formatMoney(Math.abs(snapshot.netBalance), snapshot.currency) })}</Text>
                  {snapshot.overLimitCount > 0 ? (
                    <View style={styles.overLimitBadgeSmall}>
                      <MaterialIcons name="warning" size={12} color="#C62828" />
                      <Text style={styles.overLimitBadgeSmallText}>
                        {t('dashboard.overCount', { count: snapshot.overLimitCount })}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.budgetPct, styles.incomeText]}>{t('dashboard.balanced')}</Text>
                  )}
                </View>

              </Card>
            </TouchableOpacity>

            {history && <DailyExpenseChart key={`${snapshot.year}-${snapshot.month}`} days={history.days} currency={history.currency} />}

            {snapshot.totalExpense > 0 && (
              <CategoryBreakdownChart
                title={t('dashboard.monthlyBreakdown')}
                totalAmount={snapshot.totalExpense}
                currency={snapshot.currency}
                items={(snapshot.expenseCategories || []).map((cat) => ({
                  id: cat.categoryId,
                  name: cat.categoryId === GOAL_COMPLETION_CATEGORY_ID ? t('charts.goalCompletion') : cat.categoryName,
                  amount: cat.totalAmount,
                  color: cat.categoryColor,
                  icon: cat.categoryIcon,
                }))}
              />
            )}
          </View>
        )}

        {/* Financial Goals Widget */}
        {activeGoals.length === 0 ? (
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} onPress={() => router.push('/(modal)/manage-goals')}>
            <Card variant="flat" style={styles.goalPrompt}>
              <View style={styles.goalPromptIcon}><MaterialIcons name="savings" size={28} color={Colors.accentDark} /></View>
              <View style={styles.goalDashInfo}>
                <Text style={styles.goalPromptTitle}>{t('dashboard.goalPromptTitle')}</Text>
                <Text style={styles.goalPromptDescription}>{t('dashboard.goalPromptDescription')}</Text>
              </View>
              <MaterialIcons name="arrow-forward" size={20} color={Colors.accentDark} />
            </Card>
          </TouchableOpacity>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('dashboard.goals')}</Text>
              <TouchableOpacity onPress={() => router.push('/(modal)/manage-goals')}>
                <Text style={styles.seeAll}>{t('dashboard.seeAll')} →</Text>
              </TouchableOpacity>
            </View>

            {activeGoals.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                activeOpacity={0.8}
                onPress={() => router.push('/(modal)/manage-goals')}
              >
                <Card style={styles.goalDashCard}>
                  <View style={styles.goalDashRow}>
                    <View
                      style={[
                        styles.goalDashIcon,
                        { backgroundColor: goal.color || Colors.primaryDark },
                      ]}
                    >
                      <MaterialIcons name={(goal.icon as any) || 'flag'} size={16} color="#FFFFFF" />
                    </View>
                    <View style={styles.goalDashInfo}>
                      <Text style={styles.goalDashName}>{goal.name}</Text>
                      <Text style={styles.goalDashAmounts}>
                        {formatMoney(goal.current_amount, goal.currency)} / {formatMoney(goal.target_amount, goal.currency)}
                      </Text>
                    </View>
                    <Text style={styles.goalDashPct}>{goal.percentage}%</Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${Math.max(0, Math.min(100, goal.percentage))}%`, backgroundColor: goal.color || Colors.primaryDark }]} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upcoming Forecast (Phase 1E Calendar & Forecast) */}
        {upcomingForecast.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('dashboard.upcoming')}</Text>
              <View style={styles.plannedBadge}>
                <Text style={styles.plannedBadgeText}>{t('dashboard.planned')}</Text>
              </View>
            </View>

            <Card style={styles.forecastCard}>
              {upcomingForecast.map((item, idx) => (
                <View
                  key={`${item.ruleId}_${item.date}`}
                  style={[
                    styles.forecastItem,
                    idx < upcomingForecast.length - 1 && styles.forecastBorder,
                  ]}
                >
                  <View style={styles.forecastDateBox}>
                    <MaterialIcons name="event" size={16} color={Colors.primaryDark} />
                    <Text style={styles.forecastDate}>{item.date.slice(5)}</Text>
                  </View>
                  <View style={styles.forecastDetails}>
                    <Text style={styles.forecastName}>{item.ruleName}</Text>
                  </View>
                  <Text
                    style={[
                      styles.forecastAmount,
                      item.type === 'income' ? styles.incomeText : styles.expenseText,
                    ]}
                  >
                    {item.type === 'income' ? '+' : '-'}
                    {formatMoney(item.amount, item.currency)}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Recent Transactions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.recentTransactions')}</Text>
            <TouchableOpacity onPress={() => router.push('/(main)/transactions')}>
              <Text style={styles.seeAll}>{t('dashboard.seeAll')} →</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length > 0 ? (
            <Card style={styles.txList}>
              {recentTransactions.map((tx) => (
                <View key={tx.id} style={styles.txItem}>
                  <View style={[styles.txIconBadge, { backgroundColor: tx.type === 'income' ? Colors.incomeLight : tx.type === 'expense' ? Colors.expenseLight : Colors.transferLight }]}>
                    <MaterialIcons
                      name={
                        tx.type === 'income'
                          ? 'trending-up'
                          : tx.type === 'expense'
                          ? 'trending-down'
                          : 'swap-horiz'
                      }
                      size={20}
                      color={
                        tx.type === 'income'
                          ? Colors.income
                          : tx.type === 'expense'
                          ? Colors.expense
                          : Colors.transfer
                      }
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txNote} numberOfLines={1}>{tx.note || t(`transactions.${tx.type}`)}</Text>
                    <Text style={styles.txDate}>{tx.date}</Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      tx.type === 'income'
                        ? styles.incomeText
                        : tx.type === 'expense'
                        ? styles.expenseText
                        : styles.transferText,
                    ]}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                    {formatMoney(tx.amount, tx.currency)}
                  </Text>
                </View>
              ))}
            </Card>
          ) : (
            <EmptyState icon="receipt-long" title={t('transactions.noTransactions')} description={t('dashboard.firstEntryDescription')} actionLabel={t('dashboard.firstEntry')} onAction={() => router.push('/(modal)/add-transaction')} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  profileBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    padding: 22,
    gap: 16,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: Colors.primary,
    borderWidth: 0,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryStrong,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
    color: Colors.light.text,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.light.text,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  plannedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
  },
  plannedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  pendingCard: {
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
  pendingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pendingDetails: {
    flex: 1,
    gap: 2,
  },
  pendingRuleName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  pendingDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  pendingAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  pendingBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  skipBtn: {
    backgroundColor: Colors.light.backgroundElement,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  confirmBtn: {
    backgroundColor: Colors.income,
    flex: 1,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  budgetCard: {
    padding: 14,
    gap: 10,
    backgroundColor: Colors.primaryFaded,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  budgetName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  budgetPct: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.backgroundElement,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  forecastCard: {
    padding: 12,
  },
  forecastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  forecastBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundElement,
  },
  forecastDateBox: {
    alignItems: 'center',
    width: 44,
  },
  forecastDate: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  forecastDetails: {
    flex: 1,
    gap: 2,
  },
  forecastName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  forecastAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  txList: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  txIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txNote: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  txDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  incomeText: {
    color: Colors.income,
  },
  expenseText: {
    color: Colors.expense,
  },
  transferText: {
    color: Colors.transfer,
  },
  overLimitBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  overLimitBadgeSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C62828',
  },
  goalDashCard: {
    padding: 16,
    gap: 14,
  },
  goalDashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalDashIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalDashInfo: {
    flex: 1,
    gap: 2,
  },
  goalDashName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  goalDashAmounts: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  goalDashPct: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  brandInfo: { flex: 1 },
  compactBalanceAmount: { fontSize: 28 },
  compactFlowAmount: { fontSize: 16 },
  compactFlowCards: { flexDirection: 'column' },
  compactFlowCard: { flex: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  balanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  balanceHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  balanceOrbit: { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: '#FFFFFF60', right: -65, top: -80 },
  balanceOrbitInner: { position: 'absolute', width: 170, height: 170, borderRadius: 85, borderWidth: 32, borderColor: '#FFFFFF24', right: -30, top: -45 },
  balanceCurrencyBlock: { gap: 8 },
  balanceChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceChangeText: { flexShrink: 1, fontSize: 13, lineHeight: 20, fontWeight: '600', color: Colors.primaryStrong },
  balanceComparisonFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  balanceComparisonLabel: { flexShrink: 1, fontSize: 12, lineHeight: 18, color: Colors.primaryStrong },
  balanceSwitch: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: '#FFFFFF80' },
  balanceSwitchText: { fontSize: 12, fontWeight: '700', color: Colors.primaryStrong },
  shortcuts: { flexDirection: 'row', gap: 8 },
  shortcut: { flex: 1, alignItems: 'center', gap: 8 },
  shortcutIcon: { width: 52, height: 52, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { fontSize: 12, fontWeight: '600', color: Colors.light.text, textAlign: 'center' },
  sectionHeading: { gap: 3, flex: 1 },
  sectionSubtitle: { fontSize: 12, color: Colors.light.textSecondary, textTransform: 'capitalize' },
  flowCards: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  flowCard: { flex: 1, minWidth: 110, padding: 12, gap: 14 },
  flowHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flowIcon: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  flowLabel: { fontSize: 12, fontWeight: '600', color: Colors.light.textSecondary, flexShrink: 1 },
  flowAmount: { fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  goalPrompt: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, backgroundColor: Colors.accentLight, borderWidth: 1, borderColor: Colors.accent },
  goalPromptIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  goalPromptTitle: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  goalPromptDescription: { fontSize: 12, lineHeight: 18, color: Colors.accentDark, marginTop: 3 },
});
