import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BalanceCardScenery } from '@/components/scenery';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { BalanceComparison, BalanceComparisonPeriod } from '@/features/insights/balance-comparison';
import { formatMoney } from '@/shared/money';
import { DashboardStyles } from '../dashboard.styles';

export interface NetWorthCardProps {
  balanceComparisons: BalanceComparison[];
  balanceLoadError: boolean;
  assetSummary: {
    totalAssets: number;
    walletBalance: number;
    fundsBalance: number;
    currency: string;
  } | null;
  comparisonPeriod: BalanceComparisonPeriod;
  setComparisonPeriod: React.Dispatch<React.SetStateAction<BalanceComparisonPeriod>>;
  locale: string;
  compact: boolean;
  styles: DashboardStyles;
  theme: typeof Colors.light;
  t: (key: string, options?: any) => string;
}

export function NetWorthCard({
  balanceComparisons,
  balanceLoadError,
  assetSummary,
  comparisonPeriod,
  setComparisonPeriod,
  locale,
  compact,
  styles,
  t,
}: NetWorthCardProps) {
  const router = useRouter();

  return (
    <Card style={styles.balanceCard}>
      <BalanceCardScenery />
      <View style={styles.balanceTop}>
        <View style={styles.balanceHeading}>
          <MaterialIcons name="account-balance" size={18} color={Colors.primaryStrong} />
          <Text style={styles.balanceLabel}>{t('dashboard.totalAssets')}</Text>
        </View>
      </View>
      {balanceComparisons.map((comparison) => {
        const change = comparison[comparisonPeriod];
        const amount = change.amount;
        const color =
          amount === null || amount === 0
            ? Colors.primaryStrong
            : amount > 0
              ? Colors.income
              : Colors.expense;
        const percent =
          change.percent === null
            ? null
            : new Intl.NumberFormat(locale, {
                style: 'percent',
                maximumFractionDigits: 1,
              }).format(Math.abs(change.percent) / 100);
        const changeKey =
          amount !== null && amount > 0
            ? percent === null
              ? 'dashboard.balanceIncreased'
              : 'dashboard.balanceIncreasedWithPercent'
            : percent === null
              ? 'dashboard.balanceDecreased'
              : 'dashboard.balanceDecreasedWithPercent';

        return (
          <View key={comparison.currency} style={styles.balanceCurrencyBlock}>
            <Text style={[styles.balanceAmount, compact && styles.compactBalanceAmount]}>
              {formatMoney(
                comparison.balance +
                  (assetSummary && assetSummary.currency === comparison.currency
                    ? assetSummary.fundsBalance
                    : 0),
                comparison.currency,
                locale
              )}
            </Text>
            <View style={styles.balanceChangeRow} accessibilityLiveRegion="polite">
              <MaterialIcons
                name={
                  amount === null
                    ? 'info-outline'
                    : amount > 0
                      ? 'trending-up'
                      : amount < 0
                        ? 'trending-down'
                        : 'remove'
                }
                size={18}
                color={color}
              />
              <Text style={[styles.balanceChangeText, { color }]}>
                {amount === null
                  ? t('dashboard.balanceNoHistory')
                  : amount === 0
                    ? t('dashboard.balanceUnchanged')
                    : t(changeKey, {
                        amount: formatMoney(Math.abs(amount), comparison.currency, locale),
                        percent,
                      })}
              </Text>
            </View>
          </View>
        );
      })}
      {balanceComparisons.length === 0 && (
        <Text style={styles.balanceChangeText}>
          {t(balanceLoadError ? 'dashboard.balanceLoadError' : 'common.loading')}
        </Text>
      )}
      {balanceLoadError && balanceComparisons.length > 0 && (
        <Text style={styles.balanceChangeText}>{t('dashboard.balanceLoadError')}</Text>
      )}

      {balanceComparisons.length > 0 && (
        <View style={styles.balanceSplitRow}>
          <View style={styles.balanceSplitItem}>
            <View style={styles.splitIconRow}>
              <MaterialIcons name="account-balance-wallet" size={14} color={Colors.primaryStrong} />
              <Text style={styles.balanceSplitLabel}>{t('dashboard.walletBalance')}</Text>
            </View>
            <Text style={styles.balanceSplitValue}>
              {formatMoney(
                assetSummary?.walletBalance ?? balanceComparisons[0]?.balance ?? 0,
                balanceComparisons[0]?.currency || 'VND',
                locale
              )}
            </Text>
          </View>

          <View style={styles.balanceSplitDivider} />

          <TouchableOpacity
            style={styles.balanceSplitItem}
            onPress={() => router.push('/(modal)/manage-funds' as any)}
            accessibilityRole="button"
            activeOpacity={0.75}
          >
            <View style={styles.splitIconRow}>
              <MaterialIcons name="savings" size={14} color={Colors.primaryStrong} />
              <Text style={styles.balanceSplitLabel}>{t('dashboard.fundsBalance')}</Text>
              <MaterialIcons name="chevron-right" size={14} color={Colors.primaryStrong} />
            </View>
            <Text style={styles.balanceSplitValue}>
              {formatMoney(
                assetSummary?.fundsBalance ?? 0,
                balanceComparisons[0]?.currency || 'VND',
                locale
              )}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.balanceComparisonFooter}>
        <Text style={styles.balanceComparisonLabel}>
          {t(comparisonPeriod === 'month' ? 'dashboard.balanceVsMonth' : 'dashboard.balanceVsYear')}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t(
            comparisonPeriod === 'month' ? 'dashboard.switchToYear' : 'dashboard.switchToMonth'
          )}
          onPress={() => setComparisonPeriod((period) => (period === 'month' ? 'year' : 'month'))}
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
  );
}
