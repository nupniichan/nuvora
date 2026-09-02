import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { AccountRow, TransactionRow } from '@/database/types';
import { getAllAccounts } from '@/features/accounts/account-queries';
import { getTransactions } from '@/features/transactions/transaction-queries';
import { formatMoney } from '@/shared/money';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const accs = await getAllAccounts();
      setAccounts(accs);
      const txs = await getTransactions({ limit: 5 });
      setRecentTransactions(txs);
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

  // Group balances by currency
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
            <Text style={styles.profileBadgeText}>⚙️</Text>
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
              {accounts.length} {t('accounts.title')}
            </Text>
          </View>
        </Card>

        {/* Quick Action Banner */}
        <Card variant="flat" style={styles.quickBanner}>
          <View style={styles.quickInfo}>
            <Text style={styles.quickTitle}>Ghi chép chi tiêu hôm nay?</Text>
            <Text style={styles.quickDesc}>Ghi nhận ngay 1 khoản chi bất ngờ nhanh chóng.</Text>
          </View>
          <Button
            title="➕ Chi ngay"
            variant="accent"
            onPress={() => router.push('/(modal)/add-transaction')}
          />
        </Card>

        {/* Recent Transactions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.recentTransactions')}</Text>
            <TouchableOpacity onPress={() => router.push('/(main)/transactions')}>
              <Text style={styles.seeAll}>{t('common.search')}</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length > 0 ? (
            <Card style={styles.txList}>
              {recentTransactions.map((tx) => (
                <View key={tx.id} style={styles.txItem}>
                  <View style={styles.txIconBadge}>
                    <Text style={styles.txIcon}>
                      {tx.type === 'income' ? '📈' : tx.type === 'expense' ? '💸' : '🔄'}
                    </Text>
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
              <Text style={styles.emptyIcon}>📝</Text>
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
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  profileBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  profileBadgeText: {
    fontSize: 20,
  },
  balanceCard: {
    backgroundColor: Colors.primary,
    padding: 22,
    gap: 8,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1C2E',
    opacity: 0.8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1C2E',
  },
  accountRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  accountCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1C2E',
  },
  quickBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  quickInfo: {
    flex: 1,
    gap: 2,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  quickDesc: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  txList: {
    padding: 0,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundElement,
    gap: 12,
  },
  txIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIcon: {
    fontSize: 18,
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txNote: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  txDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  txAmount: {
    fontSize: 15,
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
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});
