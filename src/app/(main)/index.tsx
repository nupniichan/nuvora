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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryBreakdownChart } from '@/components/ui/charts';
import { Colors } from '@/constants/theme';
import { AccountRow, TransactionRow } from '@/database/types';
import { getAllAccounts } from '@/features/accounts/account-queries';
import {
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
import { formatDateISO } from '@/shared/date-utils';
import { formatMoney } from '@/shared/money';

interface UpcomingForecastItem {
  ruleId: string;
  ruleName: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  accountName: string;
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionRow[]>([]);
  const [snapshot, setSnapshot] = useState<MonthlySnapshot | null>(null);
  const [activeGoals, setActiveGoals] = useState<FinancialGoalWithProgress[]>([]);
  const [pendingOccurrences, setPendingOccurrences] = useState<PendingOccurrenceWithRule[]>([]);
  const [upcomingForecast, setUpcomingForecast] = useState<UpcomingForecastItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // 1. Run recurring catch-up reconciliation
      await processRecurringCatchUp();

      // 2. Load accounts
      const accs = await getAllAccounts();
      setAccounts(accs);

      // 3. Load recent confirmed transactions
      const txs = await getTransactions({ limit: 5 });
      setRecentTransactions(txs);

      // 4. Load monthly snapshot for current month
      const now = new Date();
      const snap = await getMonthlySnapshot(now.getFullYear(), now.getMonth() + 1);
      setSnapshot(snap);

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
            accountName: rule.account_name,
          });
        }
      }
      forecastList.sort((a, b) => a.date.localeCompare(b.date));
      setUpcomingForecast(forecastList.slice(0, 5));
    } catch (e) {
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

  // Balances by currency
  const balancesByCurrency = accounts.reduce((acc, curr) => {
    acc[curr.currency] = (acc[curr.currency] || 0) + curr.balance;
    return acc;
  }, {} as Record<string, number>);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Nuvora</Text>
            <Text style={styles.headerSubtitle}>{t('dashboard.title')}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBadge}
            onPress={() => router.push('/(main)/more')}
          >
            <MaterialIcons name="settings" size={20} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        {/* Total Balance Card */}
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('dashboard.totalBalance')}</Text>
          {Object.keys(balancesByCurrency).length > 0 ? (
            Object.entries(balancesByCurrency).map(([curr, total]) => (
              <Text key={curr} style={styles.balanceAmount}>
                {formatMoney(total, curr)}
              </Text>
            ))
          ) : (
            <Text style={styles.balanceAmount}>{formatMoney(0, 'VND')}</Text>
          )}

          <View style={styles.accountRow}>
            <Text style={styles.accountCount}>
              {t('dashboard.accountsCount', { count: accounts.length })}
            </Text>
          </View>
        </Card>

        {/* Quick Action Banner */}
        <Card variant="flat" style={styles.quickBanner}>
          <View style={styles.quickInfo}>
            <Text style={styles.quickTitle}>{t('dashboard.quickTitle')}</Text>
            <Text style={styles.quickDesc}>{t('dashboard.quickDescription')}</Text>
          </View>
          <Button
            title={t('dashboard.spendNow')}
            icon={<MaterialIcons name="add" size={18} color="#542515" />}
            variant="accent"
            onPress={() => router.push('/(modal)/add-transaction')}
          />
        </Card>

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
                      {t('dashboard.dueOn', { date: item.scheduled_date, account: item.account_name })}
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
              <Text style={styles.sectionTitle}>{t('dashboard.monthlyPlan', { month: snapshot.month, year: snapshot.year })}</Text>
              <TouchableOpacity onPress={() => router.push('/(main)/budgets')}>
                <Text style={styles.seeAll}>{t('dashboard.details')} →</Text>
              </TouchableOpacity>
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

                <View style={styles.budgetMetrics}>
                  <Text style={styles.budgetMetricText}>
                    {t('dashboard.incomeShort')}: <Text style={{ color: Colors.income, fontWeight: '700' }}>+{formatMoney(snapshot.totalIncome, snapshot.currency)}</Text>
                  </Text>
                  <Text style={styles.budgetMetricText}>
                    {t('dashboard.expenseShort')}: <Text style={{ color: Colors.expense, fontWeight: '700' }}>-{formatMoney(snapshot.totalExpense, snapshot.currency)}</Text>
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>

            {snapshot.totalExpense > 0 && (
              <CategoryBreakdownChart
                title={t('dashboard.monthlyBreakdown')}
                totalAmount={snapshot.totalExpense}
                currency={snapshot.currency}
                items={(snapshot.expenseCategories || []).map((cat) => ({
                  id: cat.categoryId,
                  name: cat.categoryName,
                  amount: cat.totalAmount,
                  color: cat.categoryColor,
                  icon: cat.categoryIcon,
                }))}
              />
            )}
          </View>
        )}

        {/* Financial Goals Widget */}
        {activeGoals.length > 0 && (
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
                        {formatMoney(goal.current_amount, 'VND')} / {formatMoney(goal.target_amount, 'VND')}
                      </Text>
                    </View>
                    <Text style={styles.goalDashPct}>{goal.percentage}%</Text>
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
                    <Text style={styles.forecastAccount}>{item.accountName}</Text>
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
                  <View style={styles.txIconBadge}>
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
                    <Text style={styles.txNote}>{tx.note || tx.type.toUpperCase()}</Text>
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
            <Card variant="flat" style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('transactions.noTransactions')}</Text>
            </Card>
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
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  profileBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    padding: 22,
    gap: 10,
    backgroundColor: Colors.primary,
    borderWidth: 0,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(32,32,51,0.66)',
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.text,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  accountCount: {
    fontSize: 13,
    color: 'rgba(32,32,51,0.66)',
    fontWeight: '500',
  },
  quickBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  quickInfo: {
    flex: 1,
    gap: 2,
    marginRight: 10,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6F301F',
  },
  quickDesc: {
    fontSize: 12,
    color: '#8C4A35',
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
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
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  budgetMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetMetricText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
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
  forecastAccount: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  forecastAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  txList: {
    padding: 10,
    gap: 10,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
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
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
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
    padding: 12,
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
});
