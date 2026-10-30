import { withMonthlyLimitConfirmation } from '@/features/budgets/confirm-monthly-limit';
import { alertMessage } from '@/shared/dialog';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackupReminderCard } from '@/components/backup/backup-reminder-card';
import { Card } from '@/components/ui/card';
import { CategoryBreakdownChart } from '@/components/ui/charts';
import { EmptyState } from '@/components/ui/empty-state';
import { DailyExpenseChart } from '@/components/ui/insight-charts';
import { MonthlyLimitCard } from '@/components/ui/monthly-limit-card';
import { Colors } from '@/constants/theme';
import { FundRow, TransactionRow } from '@/database/types';
import { getAllAccounts, getDefaultAccount } from '@/features/accounts/account-queries';
import {
  getMonthlySnapshot,
  GOAL_COMPLETION_CATEGORY_ID,
  MonthlySnapshot,
} from '@/features/budgets/budget-queries';
import { getAllFunds, getAssetSummary } from '@/features/funds/fund-queries';
import {
  FinancialGoalWithProgress,
  getAllGoals,
} from '@/features/goals/financial-goals';
import { BalanceComparison, BalanceComparisonPeriod, buildBalanceComparisons } from '@/features/insights/balance-comparison';
import { getSpendingHistory, SpendingHistory } from '@/features/insights/insight-data';
import { calculateDueOccurrences } from '@/features/recurring/recurring-engine';
import {
  confirmOccurrence,
  getAllRecurringRules,
  getPendingOccurrences,
  PendingOccurrenceWithRule,
  processRecurringCatchUp,
  skipOccurrence,
} from '@/features/recurring/recurring-queries';
import { getTransactions } from '@/features/transactions/transaction-queries';
import { useTheme } from '@/hooks/use-theme';
import {
  BackupReminderStatus,
  checkBackupReminderStatus,
  dismissBackupReminder,
} from '@/services/backup/backup-reminder';
import { formatDateDisplay, formatDateISO } from '@/shared/date-utils';
import { formatMoney } from '@/shared/money';

import { DashboardQuickActions } from './components/dashboard-quick-actions';
import { NetWorthCard } from './components/net-worth-card';
import { createDashboardStyles } from './dashboard.styles';

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
  const theme = useTheme();
  const styles = createDashboardStyles(theme);
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
  const [backupReminderStatus, setBackupReminderStatus] = useState<BackupReminderStatus | null>(null);
  const [funds, setFunds] = useState<FundRow[]>([]);
  const [assetSummary, setAssetSummary] = useState<{
    totalAssets: number;
    walletBalance: number;
    fundsBalance: number;
    currency: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await processRecurringCatchUp();

      const defaultAccount = await getDefaultAccount();
      if (!defaultAccount) {
        return;
      }

      const accounts = await getAllAccounts();
      const [allFunds, summary] = await Promise.all([
        getAllFunds(),
        getAssetSummary(),
      ]);
      setFunds(allFunds);
      setAssetSummary(summary);

      const transactions = await getTransactions();
      const recent = transactions.slice(0, 5);
      setRecentTransactions(recent);

      const now = new Date();
      const monthlySnapshot = await getMonthlySnapshot(now.getFullYear(), now.getMonth() + 1, defaultAccount.currency);
      setSnapshot(monthlySnapshot);
      const spendingHistory = await getSpendingHistory(now.getFullYear(), now.getMonth() + 1, defaultAccount.currency);
      setHistory(spendingHistory);

      const goals = await getAllGoals('active');
      setActiveGoals(goals);

      const pending = await getPendingOccurrences();
      setPendingOccurrences(pending);

      try {
        const reminderStatus = await checkBackupReminderStatus();
        setBackupReminderStatus(reminderStatus);
      } catch {
        setBackupReminderStatus(null);
      }

      const rules = await getAllRecurringRules();
      const today = formatDateISO(now);
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const toDate = formatDateISO(nextWeek);
      const forecast: UpcomingForecastItem[] = [];

      for (const rule of rules) {
        if (!rule.is_active) continue;
        const due = calculateDueOccurrences(rule, today, toDate);
        for (const date of due) {
          forecast.push({
            ruleId: rule.id,
            ruleName: rule.name,
            type: rule.type,
            amount: rule.amount,
            currency: rule.currency,
            date,
          });
        }
      }

      forecast.sort((a, b) => a.date.localeCompare(b.date));
      setUpcomingForecast(forecast.slice(0, 3));

      try {
        const comparisons = await buildBalanceComparisons(accounts, transactions);
        setBalanceComparisons(comparisons);
        setBalanceLoadError(false);
      } catch {
        setBalanceComparisons([]);
        setBalanceLoadError(true);
      }
    } catch {
      // Handled silently
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleConfirmOccurrence = async (occurrenceId: string) => {
    try {
      const saved = await withMonthlyLimitConfirmation(
        (monthlyLimitApproval) => confirmOccurrence(occurrenceId, monthlyLimitApproval),
        t
      );
      if (!saved) return;
      await loadData();
    } catch (e: any) {
      alertMessage(t('common.error'), e.message);
    }
  };

  const handleSkipOccurrence = async (occurrenceId: string) => {
    try {
      await skipOccurrence(occurrenceId);
      await loadData();
    } catch (e: any) {
      alertMessage(t('common.error'), e.message);
    }
  };

  const handleBackupPress = () => {
    router.push('/(modal)/backup-restore');
  };

  const handleDismissReminder = async () => {
    await dismissBackupReminder();
    setBackupReminderStatus(null);
  };

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryDark} />
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
            <MaterialIcons name="settings" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {backupReminderStatus?.isDue && (
          <BackupReminderCard
            status={backupReminderStatus}
            onBackupPress={handleBackupPress}
            onDismissPress={handleDismissReminder}
          />
        )}

        <NetWorthCard
          balanceComparisons={balanceComparisons}
          balanceLoadError={balanceLoadError}
          assetSummary={assetSummary}
          comparisonPeriod={comparisonPeriod}
          setComparisonPeriod={setComparisonPeriod}
          locale={locale}
          compact={compact}
          styles={styles}
          theme={theme}
          t={t}
        />

        <DashboardQuickActions styles={styles} compact={compact} theme={theme} t={t} />

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
                      {t('dashboard.dueOn', { date: formatDateDisplay(item.scheduled_date, locale === 'vi-VN' ? 'vi' : 'en') })}
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
                    <MaterialIcons name="check" size={16} color={Colors.primaryStrong} />
                    <Text style={styles.confirmBtnText}>{t('dashboard.post')}</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {snapshot && <MonthlyLimitCard snapshot={snapshot} />}

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
                { label: t('transactions.income'), amount: snapshot.totalIncome, icon: 'south-west', color: Colors.income, sign: '+' },
                { label: t('transactions.expense'), amount: snapshot.totalExpense, icon: 'north-east', color: Colors.expense, sign: '-' },
              ] as const).map((metric) => (
                <Card key={metric.label} style={[styles.flowCard, compact && styles.compactFlowCard]}>
                  <View style={styles.flowHeading}>
                    <View style={styles.flowIcon}><MaterialIcons name={metric.icon} size={18} color={theme.textSecondary} /></View>
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
                      <MaterialIcons name="warning" size={12} color={Colors.expense} />
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
                items={(snapshot.expenseCategories || []).map((category) => ({
                  id: category.categoryId,
                  name: category.categoryId === GOAL_COMPLETION_CATEGORY_ID ? t('charts.goalCompletion') : category.categoryName,
                  amount: category.totalAmount,
                  color: category.categoryColor,
                  icon: category.categoryIcon,
                }))}
              />
            )}
          </View>
        )}

        {/* Funds Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>{t('dashboard.myFunds')}</Text>
              <Text style={styles.sectionSubtitle}>{t('funds.fundsCount', { count: funds.length })}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(modal)/manage-funds' as any)}>
              <Text style={styles.seeAll}>{t('dashboard.details')} →</Text>
            </TouchableOpacity>
          </View>

          {funds.length === 0 ? (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              onPress={() => router.push('/(modal)/manage-funds' as any)}
            >
              <Card variant="flat" style={styles.fundPrompt}>
                <View style={styles.fundPromptIcon}>
                  <MaterialIcons name="savings" size={28} color={Colors.primaryStrong} />
                </View>
                <View style={styles.fundDashInfo}>
                  <Text style={styles.fundPromptTitle}>{t('funds.emptyTitle')}</Text>
                  <Text style={styles.fundPromptDescription}>{t('funds.emptyDescription')}</Text>
                </View>
                <MaterialIcons name="arrow-forward" size={20} color={Colors.primaryStrong} />
              </Card>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fundsScroll}>
              {funds.map((fund) => {
                const hasTarget = fund.target_amount !== null && fund.target_amount > 0;
                const pct = hasTarget ? Math.min(100, Math.floor((fund.balance / fund.target_amount!) * 100)) : null;
                return (
                  <TouchableOpacity
                    key={fund.id}
                    activeOpacity={0.85}
                    onPress={() => router.push('/(modal)/manage-funds' as any)}
                  >
                    <Card style={styles.dashFundCard}>
                      <View style={styles.dashFundTop}>
                        <View style={[styles.dashFundIconBadge, { backgroundColor: fund.color || Colors.primaryDark }]}>
                          <MaterialIcons name={(fund.icon as any) || 'savings'} size={18} color="#FFF" />
                        </View>
                        <Text style={styles.dashFundName} numberOfLines={1}>{fund.name}</Text>
                      </View>
                      <Text style={styles.dashFundBalance}>{formatMoney(fund.balance, fund.currency, locale)}</Text>
                      {pct !== null ? (
                        <View style={styles.dashFundProgress}>
                          <View style={styles.dashFundBarBg}>
                            <View style={[styles.dashFundBarFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? Colors.income : fund.color || Colors.primaryDark }]} />
                          </View>
                          <Text style={styles.dashFundPct}>{pct}%</Text>
                        </View>
                      ) : (
                        <Text style={styles.dashFundNoTarget}>{t('funds.noTarget')}</Text>
                      )}
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {activeGoals.length === 0 ? (
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} onPress={() => router.push('/(modal)/manage-goals')}>
            <Card variant="flat" style={styles.goalPrompt}>
              <View style={styles.goalPromptIcon}><MaterialIcons name="savings" size={28} color={Colors.primaryStrong} /></View>
              <View style={styles.goalDashInfo}>
                <Text style={styles.goalPromptTitle}>{t('dashboard.goalPromptTitle')}</Text>
                <Text style={styles.goalPromptDescription}>{t('dashboard.goalPromptDescription')}</Text>
              </View>
              <MaterialIcons name="arrow-forward" size={20} color={Colors.primaryStrong} />
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
                        { backgroundColor: theme.backgroundElement },
                      ]}
                    >
                      <MaterialIcons name={(goal.icon as any) || 'flag'} size={16} color={goal.color || Colors.primaryDark} />
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
                    <View style={[styles.progressBarFill, { width: `${Math.max(0, Math.min(100, goal.percentage))}%`, backgroundColor: Colors.primaryDark }]} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {upcomingForecast.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('dashboard.upcoming')}</Text>
              <View style={styles.plannedBadge}>
                <Text style={styles.plannedBadgeText}>{t('dashboard.planned')}</Text>
              </View>
            </View>

            <Card style={styles.forecastCard}>
              {upcomingForecast.map((item, index) => (
                <View
                  key={`${item.ruleId}_${item.date}`}
                  style={[
                    styles.forecastItem,
                    index < upcomingForecast.length - 1 && styles.forecastBorder,
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.recentTransactions')}</Text>
            <TouchableOpacity onPress={() => router.push('/(main)/transactions')}>
              <Text style={styles.seeAll}>{t('dashboard.seeAll')} →</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length > 0 ? (
            <Card style={styles.txList}>
              {recentTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.txItem}>
                  <View style={styles.txIconBadge}>
                    <MaterialIcons
                      name={
                        transaction.type === 'income'
                          ? 'trending-up'
                          : transaction.type === 'expense'
                            ? 'trending-down'
                            : 'swap-horiz'
                      }
                      size={20}
                      color={theme.textSecondary}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txNote} numberOfLines={1}>{transaction.note || t(`transactions.${transaction.type}`)}</Text>
                    <Text style={styles.txDate}>{formatDateDisplay(transaction.date, locale === 'vi-VN' ? 'vi' : 'en')}</Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      transaction.type === 'income'
                        ? styles.incomeText
                        : transaction.type === 'expense'
                          ? styles.expenseText
                          : styles.transferText,
                    ]}
                  >
                    {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                    {formatMoney(transaction.amount, transaction.currency)}
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
