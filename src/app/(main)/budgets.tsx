import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { MonthlyLimitCard } from '@/components/ui/monthly-limit-card';
import { getDefaultAccount } from '@/features/accounts/account-queries';
import { EmptyState } from '@/components/ui/empty-state';
import { DailyExpenseChart, MonthlyCashflowChart } from '@/components/ui/insight-charts';
import {
  CashflowComparisonChart,
  CategoryBreakdownChart,
} from '@/components/ui/charts';
import { Colors, MaxContentWidth } from '@/constants/theme';
import {
  GOAL_COMPLETION_CATEGORY_ID,
  getMonthlySnapshot,
  MonthlySnapshot,
} from '@/features/budgets/budget-queries';
import {
  FinancialGoalWithProgress,
  getAllGoals,
} from '@/features/goals/financial-goals';
import { formatMoney } from '@/shared/money';
import { getSpendingHistory, SpendingHistory } from '@/features/insights/insight-data';

export default function BudgetsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);

  const [snapshot, setSnapshot] = useState<MonthlySnapshot | null>(null);
  const [goals, setGoals] = useState<FinancialGoalWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<SpendingHistory | null>(null);
  const [loadError, setLoadError] = useState(false);
  const requestId = useRef(0);

  const loadData = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setLoadError(false);
    setSnapshot(null);
    setHistory(null);
    try {
      const account = await getDefaultAccount();
      const snap = await getMonthlySnapshot(currentYear, currentMonth, account.currency);
      const [activeGoals, spendingHistory] = await Promise.all([
        getAllGoals('active'), getSpendingHistory(currentYear, currentMonth, snap.currency),
      ]);
      if (request !== requestId.current) return;
      setSnapshot(snap);
      setHistory(spendingHistory);
      setGoals(activeGoals.slice(0, 3)); // Top 3 goals
    } catch (e) {
      if (request !== requestId.current) return;
      setLoadError(true);
      console.warn('Lỗi tải tổng quan ngân sách', e);
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => { requestId.current++; };
    }, [loadData])
  );

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const totalIncome = snapshot?.totalIncome ?? 0;
  const totalExpense = snapshot?.totalExpense ?? 0;
  const netBalance = snapshot?.netBalance ?? 0;
  const currency = snapshot?.currency ?? 'VND';

  // Overall spending percentage compared to income
  const spendVsIncomePercent =
    totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0;

  // Prepare breakdown items for chart
  const expenseChartItems = (snapshot?.expenseCategories || []).map((cat) => ({
    id: cat.categoryId,
    name: cat.categoryId === GOAL_COMPLETION_CATEGORY_ID ? t('charts.goalCompletion') : cat.categoryName,
    amount: cat.totalAmount,
    color: cat.categoryColor,
    icon: cat.categoryIcon,
  }));
  const monthLabel = new Intl.DateTimeFormat(i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(currentYear, currentMonth - 1, 1));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.eyebrow}>NUVORA</Text>
            <Text style={styles.title}>{t('budgets.pageTitle')}</Text>
          </View>
        </View>

        {/* Month Navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('charts.previousMonth')} onPress={handlePrevMonth} style={styles.navArrowBtn}>
            <MaterialIcons name="chevron-left" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.monthNavTitle}>{monthLabel}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('charts.nextMonth')} onPress={handleNextMonth} style={styles.navArrowBtn}>
            <MaterialIcons name="chevron-right" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator color={Colors.primaryStrong} /> : null}
        {loadError && <TouchableOpacity accessibilityRole="button" onPress={loadData}><Text style={styles.emptyCategoryText}>{t('charts.loadError')} · {t('common.retry')}</Text></TouchableOpacity>}
        {!loading && !loadError && <>
        {/* Monthly Financial Overview Card */}
        {snapshot && <MonthlyLimitCard snapshot={snapshot} />}
        <Card style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>{t('budgets.overview')}</Text>
            {snapshot && snapshot.overLimitCount > 0 && (
              <View style={styles.overLimitBadge}>
                <MaterialIcons name="warning" size={13} color="#C62828" />
                <Text style={styles.overLimitBadgeText}>
                  {t('budgets.overLimitCount', { count: snapshot.overLimitCount })}
                </Text>
              </View>
            )}
          </View>

          {/* Key Metrics Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{t('budgets.totalIncome')}</Text>
              <Text style={[styles.metricValue, { color: Colors.income }]}>
                +{formatMoney(totalIncome, currency)}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{t('budgets.totalExpense')}</Text>
              <Text style={[styles.metricValue, { color: Colors.expense }]}>
                -{formatMoney(totalExpense, currency)}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{t('budgets.netBalance')}</Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: netBalance >= 0 ? Colors.primaryDark : Colors.expense },
                ]}
              >
                {netBalance >= 0 ? '+' : ''}
                {formatMoney(netBalance, currency)}
              </Text>
            </View>
          </View>

          {/* Progress Bar of Spend vs Income */}
          {totalIncome > 0 && (
            <View style={styles.overviewProgressSection}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressLabel}>{t('budgets.spendIncomeRatio')}</Text>
                <Text style={styles.progressPercent}>{spendVsIncomePercent}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${spendVsIncomePercent}%`,
                      backgroundColor:
                        spendVsIncomePercent > 90
                          ? Colors.expense
                          : spendVsIncomePercent > 70
                          ? Colors.accent
                          : Colors.income,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </Card>

        {/* Cashflow Comparison Chart */}
        <CashflowComparisonChart
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          netBalance={netBalance}
          currency={currency}
        />

        {history && <>
          <MonthlyCashflowChart key={`months-${currentYear}-${currentMonth}`} months={history.months} currency={history.currency} />
          <DailyExpenseChart key={`days-${currentYear}-${currentMonth}`} days={history.days} currency={history.currency} />
        </>}

        {/* Category Expense Breakdown Chart */}
        <CategoryBreakdownChart
          title={t('budgets.breakdownTitle')}
          totalAmount={totalExpense}
          currency={currency}
          items={expenseChartItems}
          emptyMessage={t('budgets.noExpenseThisMonth')}
        />

        {/* Quick Actions Bar */}
        <View style={styles.quickBar}>
          <TouchableOpacity
            style={[styles.quickBtn, styles.primaryQuickBtn]}
            onPress={() => router.push('/(modal)/add-transaction')}
          >
            <MaterialIcons name="add" size={18} color={Colors.light.text} />
            <Text style={[styles.quickBtnText, styles.primaryQuickBtnText]}>{t('budgets.newEntry')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => router.push({ pathname: '/(modal)/manage-budget', params: { year: currentYear, month: currentMonth } })}
          >
            <MaterialIcons name="tune" size={18} color={Colors.primaryDark} />
            <Text style={styles.quickBtnText}>{t('budgets.manageLimits')}</Text>
          </TouchableOpacity>
        </View>

        {/* Section 1: Income Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('budgets.incomeSection')}</Text>
            <Text style={[styles.sectionTotalText, { color: Colors.income }]}>
              {formatMoney(totalIncome, currency)}
            </Text>
          </View>

          {snapshot && snapshot.incomeCategories.length === 0 ? (
            <Card variant="flat" style={styles.emptyCategoryCard}>
              <Text style={styles.emptyCategoryText}>
                {t('budgets.noIncomeThisMonth')}
              </Text>
            </Card>
          ) : (
            snapshot?.incomeCategories.map((cat) => (
              <Card key={cat.categoryId} style={styles.catCard}>
                <View style={styles.catRow}>
                  <View
                    style={[
                      styles.catIcon,
                      { backgroundColor: cat.categoryColor || Colors.income },
                    ]}
                  >
                    <MaterialIcons
                      name={(cat.categoryIcon as any) || 'account-balance-wallet'}
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>

                  <View style={styles.catDetails}>
                    <Text style={styles.catName}>{cat.categoryName}</Text>
                    <Text style={styles.catSubtext}>
                      {cat.groupName} · {t('budgets.transactionCount', { count: cat.transactionCount })}
                    </Text>
                  </View>

                  <Text style={[styles.catAmount, { color: Colors.income }]}>
                    +{formatMoney(cat.totalAmount, currency)}
                  </Text>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Section 2: Expense Breakdown & Spending Limits */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('budgets.expenseSection')}</Text>
            <Text style={[styles.sectionTotalText, { color: Colors.expense }]}>
              {formatMoney(totalExpense, currency)}
            </Text>
          </View>

          {snapshot && snapshot.expenseCategories.length === 0 ? (
            <Card variant="flat" style={styles.emptyCategoryCard}>
              <Text style={styles.emptyCategoryText}>
                {t('budgets.noExpenseThisMonth')}
              </Text>
            </Card>
          ) : (
            snapshot?.expenseCategories.map((cat) => {
              const hasLimit = cat.spendingLimit !== null && cat.spendingLimit > 0;
              const percent = cat.percentUsed ?? 0;

              return (
                <Card key={cat.categoryId} style={styles.catCard}>
                  <View style={styles.catRow}>
                    <View
                      style={[
                        styles.catIcon,
                        { backgroundColor: cat.categoryColor || Colors.primaryDark },
                      ]}
                    >
                      <MaterialIcons
                        name={(cat.categoryIcon as any) || 'category'}
                        size={18}
                        color="#FFFFFF"
                      />
                    </View>

                    <View style={styles.catDetails}>
                      <View style={styles.catTitleRow}>
                        <Text style={styles.catName}>{cat.categoryId === GOAL_COMPLETION_CATEGORY_ID ? t('charts.goalCompletion') : cat.categoryName}</Text>
                        <Text
                          style={[
                            styles.catRemainingText,
                            cat.isOverLimit ? styles.overspentText : styles.okText,
                          ]}
                        >
                          {hasLimit
                            ? cat.isOverLimit
                              ? t('budgets.overBy', { amount: formatMoney(Math.abs(cat.remainingAmount ?? 0), currency) })
                              : t('budgets.remainingAmount', { amount: formatMoney(cat.remainingAmount ?? 0, currency) })
                            : t('budgets.transactionCount', { count: cat.transactionCount })}
                        </Text>
                      </View>

                      {/* Limit Progress Bar */}
                      {hasLimit && (
                        <View style={styles.catProgressTrack}>
                          <View
                            style={[
                              styles.catProgressBar,
                              {
                                width: `${Math.min(100, percent)}%`,
                                backgroundColor: cat.isOverLimit
                                  ? Colors.expense
                                  : percent > 80
                                  ? Colors.accent
                                  : Colors.income,
                              },
                            ]}
                          />
                        </View>
                      )}

                      <View style={styles.catAmountsRow}>
                        <Text style={styles.catAmountSpent}>
                          {t('budgets.spentAmount', { amount: formatMoney(cat.totalAmount, currency) })}
                        </Text>
                        {hasLimit ? (
                          <Text style={styles.catLimitAmount}>
                            {t('budgets.limitAmount', { amount: formatMoney(cat.spendingLimit ?? 0, currency), percent })}
                          </Text>
                        ) : (
                          <Text style={styles.catNoLimit}>{t('budgets.unlimited')}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </View>

        {/* Section 3: Financial Goals Progress */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('budgets.goalsSection')}</Text>
            <TouchableOpacity onPress={() => router.push('/(modal)/manage-goals')}>
              <Text style={styles.seeAllLink}>{t('budgets.seeAllCount', { count: goals.length })} →</Text>
            </TouchableOpacity>
          </View>

          {goals.length === 0 ? (
            <EmptyState icon="savings" title={t('dashboard.goalPromptTitle')} description={t('budgets.noGoals')} actionLabel={t('budgets.createGoalNow')} onAction={() => router.push('/(modal)/manage-goals')} />
          ) : (
            goals.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                activeOpacity={0.8}
                onPress={() => router.push('/(modal)/manage-goals')}
              >
                <Card style={styles.goalMiniCard}>
                  <View style={styles.goalMiniHeader}>
                    <View
                      style={[
                        styles.goalMiniIcon,
                        { backgroundColor: goal.color || Colors.primaryDark },
                      ]}
                    >
                      <MaterialIcons
                        name={(goal.icon as any) || 'flag'}
                        size={16}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text style={styles.goalMiniName}>{goal.name}</Text>
                    <Text style={styles.goalMiniPct}>{goal.percentage}%</Text>
                  </View>

                  <View style={styles.goalMiniTrack}>
                    <View
                      style={[
                        styles.goalMiniFill,
                        {
                          width: `${goal.percentage}%`,
                          backgroundColor: goal.isCompleted
                            ? Colors.income
                            : goal.color || Colors.primaryDark,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.goalMiniAmounts}>
                    <Text style={styles.goalMiniCurrent}>
                      {formatMoney(goal.current_amount, goal.currency)}
                    </Text>
                    <Text style={styles.goalMiniTarget}>
                      {t('budgets.goalTarget', { amount: formatMoney(goal.target_amount, goal.currency) })}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
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
    color: Colors.light.text,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: Colors.primaryDark,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight,
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
    color: Colors.light.text,
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
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  overLimitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overLimitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C62828',
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
    backgroundColor: Colors.light.border,
  },
  metricLabel: {
    fontSize: 13,
    flexShrink: 1,
    fontWeight: '600',
    color: Colors.light.textSecondary,
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
    borderTopColor: Colors.light.backgroundElement,
    paddingTop: 10,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.light.text,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.backgroundElement,
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
    backgroundColor: Colors.light.backgroundElement,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  primaryQuickBtn: {
    backgroundColor: Colors.primary,
  },
  primaryQuickBtnText: {
    color: Colors.light.text,
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
    color: Colors.light.text,
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
    color: Colors.light.textSecondary,
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
    color: Colors.light.text,
  },
  catSubtext: {
    fontSize: 11,
    color: Colors.light.textSecondary,
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
    backgroundColor: Colors.light.backgroundElement,
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
    color: Colors.light.textSecondary,
  },
  catLimitAmount: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.text,
  },
  catNoLimit: {
    fontSize: 11,
    color: Colors.light.textSecondary,
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
    color: Colors.light.text,
  },
  goalMiniPct: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  goalMiniTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.backgroundElement,
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
    color: Colors.light.text,
  },
  goalMiniTarget: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
});
