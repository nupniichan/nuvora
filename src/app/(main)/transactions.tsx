import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { TransactionRow, TransactionType } from '@/database/types';
import { deleteTransaction, getTransactions } from '@/features/transactions/transaction-queries';
import { formatMoney } from '@/shared/money';

export default function TransactionsScreen() {
  const { t } = useTranslation();

  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');

  const loadTransactions = useCallback(async () => {
    const filter = filterType === 'all' ? {} : { type: filterType };
    const txs = await getTransactions(filter);
    setTransactions(txs);
  }, [filterType]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const handleDelete = (id: string) => {
    Alert.alert('Xóa giao dịch', 'Bạn có chắc chắn muốn xóa giao dịch này không?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(id);
          await loadTransactions();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('transactions.title')}</Text>
        <View style={styles.filterRow}>
          {(['all', 'expense', 'income', 'transfer'] as const).map((typeItem) => (
            <TouchableOpacity
              key={typeItem}
              style={[
                styles.filterChip,
                filterType === typeItem && styles.activeFilterChip,
              ]}
              onPress={() => setFilterType(typeItem)}
            >
              <Text
                style={[
                  styles.filterText,
                  filterType === typeItem && styles.activeFilterText,
                ]}
              >
                {typeItem === 'all'
                  ? 'Tất cả'
                  : t(`transactions.${typeItem}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity onLongPress={() => handleDelete(item.id)} activeOpacity={0.8}>
            <Card style={styles.txCard}>
              <View style={styles.txRow}>
                <View style={styles.txIconBadge}>
                  <Text style={styles.txIcon}>
                    {item.type === 'income' ? '📈' : item.type === 'expense' ? '💸' : '🔄'}
                  </Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txNote}>{item.note || item.type.toUpperCase()}</Text>
                  <Text style={styles.txDate}>{item.date}</Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    item.type === 'income'
                      ? styles.incomeText
                      : item.type === 'expense'
                      ? styles.expenseText
                      : styles.transferText,
                  ]}
                >
                  {item.type === 'income' ? '+' : item.type === 'expense' ? '-' : ''}
                  {formatMoney(item.amount, item.currency)}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Card variant="flat" style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>{t('transactions.noTransactions')}</Text>
          </Card>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    padding: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundElement,
  },
  activeFilterChip: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeFilterText: {
    color: '#1A1C2E',
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
    gap: 10,
  },
  txCard: {
    padding: 14,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
