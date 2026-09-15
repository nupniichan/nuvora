import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryPicker } from '@/components/ui/category-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { MoneyInput } from '@/components/ui/money-input';
import { Colors, MaxContentWidth } from '@/constants/theme';
import { EntryType, TransactionRow } from '@/database/types';
import { CategoryWithGroup, getAllCategories } from '@/features/categories/category-queries';
import {
  deleteTransaction,
  isGoalCompletionTransaction,
  getTransactions,
  updateTransaction,
} from '@/features/transactions/transaction-queries';
import { formatDateISO } from '@/shared/date-utils';
import { formatMoney } from '@/shared/money';

import { alertMessage, confirmAction } from '@/shared/dialog';
import { withMonthlyLimitConfirmation } from '@/features/budgets/confirm-monthly-limit';
import { isValidTransactionDate } from '@/features/budgets/monthly-limits';

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [filterType, setFilterType] = useState<EntryType | 'all'>('all');
  const [categories, setCategories] = useState<CategoryWithGroup[]>([]);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionRow | null>(null);
  const [editType, setEditType] = useState<EntryType>('expense');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const filter = filterType === 'all' ? {} : { type: filterType };
    const [fetchedTransactions, fetchedCategories] = await Promise.all([
      getTransactions(filter),
      getAllCategories(),
    ]);
    setTransactions(fetchedTransactions);
    setCategories(fetchedCategories);
  }, [filterType]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const openEditModal = (transaction: TransactionRow) => {
    if (transaction.type === 'transfer' || isGoalCompletionTransaction(transaction.id)) return;
    setEditingTransaction(transaction);
    setEditType(transaction.type);
    setEditAmount(typeof transaction.amount === 'number' && !isNaN(transaction.amount) ? transaction.amount : 0);
    setEditCategoryId(transaction.category_id || null);
    setEditNote(transaction.note || '');
    setEditDate(transaction.date || formatDateISO(new Date()));
    setEditModalVisible(true);
  };

  const handleTypeChange = (newType: EntryType) => {
    setEditType(newType);
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction || saving) return;
    const finalAmount = typeof editAmount === 'number' && !isNaN(editAmount) ? editAmount : 0;
    if (finalAmount <= 0) {
      alertMessage(t('common.notice'), t('transactions.amountRequired'));
      return;
    }
    setSaving(true);
    try {
      const date = editDate.trim() || formatDateISO(new Date());
      if (!isValidTransactionDate(date)) {
        alertMessage(t('common.error'), t('monthlyLimit.invalidDate'));
        return;
      }
      const saved = await withMonthlyLimitConfirmation((monthlyLimitApproval) => updateTransaction(editingTransaction.id, {
        type: editType,
        amount: finalAmount,
        categoryId: editCategoryId || null,
        note: editNote.trim() || null,
        date,
        monthlyLimitApproval,
      }), t);
      if (!saved) return;
      setEditModalVisible(false);
      await loadData();
    } catch (error: any) {
      alertMessage(t('common.error'), error.message === 'goalCompletionLocked' ? t('transactions.goalCompletionLocked') : error.message || t('transactions.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    confirmAction(
      t('transactions.deleteTitle'),
      t(isGoalCompletionTransaction(id) ? 'transactions.deleteGoalCompletionDescription' : 'transactions.deleteDescription'),
      async () => {
        await deleteTransaction(id);
        if (editModalVisible) {
          setEditModalVisible(false);
        }
        await loadData();
      },
      t('common.delete'),
      t('common.cancel')
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.eyebrow}>NUVORA</Text>
            <Text style={styles.title}>{t('transactions.title')}</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(modal)/add-transaction')}
          >
            <MaterialIcons name="add" size={18} color={Colors.primaryStrong} />
            <Text style={styles.addButtonText}>{t('transactions.addTransaction')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filterRow}>
          {(['all', 'expense', 'income'] as const).map((typeItem) => (
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
                  ? t('common.all')
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
        renderItem={({ item }) => {
          const category = categories.find((c) => c.id === item.category_id);

          return (
            <TouchableOpacity onPress={() => openEditModal(item)} disabled={item.type === 'transfer' || isGoalCompletionTransaction(item.id)} activeOpacity={0.8}>
              <Card style={styles.txCard}>
                <View style={styles.txRow}>
                  <View style={styles.txIconBadge}>
                    <MaterialIcons
                      name={
                        (category?.icon as any) ||
                        (item.type === 'income'
                          ? 'trending-up'
                          : item.type === 'expense'
                          ? 'trending-down'
                          : 'swap-horiz')
                      }
                      size={20}
                      color={category?.color || Colors.light.textSecondary}
                    />
                  </View>

                  <View style={styles.txInfo}>
                    <Text style={styles.txNote} numberOfLines={1}>
                      {item.note || category?.name || t(`transactions.${item.type}`)}
                    </Text>
                    <Text style={styles.txDate} numberOfLines={2}>
                      {category?.name ? `${category.name} • ` : ''}{item.date}
                    </Text>
                  </View>
                </View>
                <View style={styles.txFooter}>
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

                  <View style={styles.quickActions}>
                    {item.type !== 'transfer' && !isGoalCompletionTransaction(item.id) && (
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        accessibilityRole="button"
                        accessibilityLabel={t('common.edit')}
                        onPress={() => openEditModal(item)}
                      >
                        <MaterialIcons name="edit" size={18} color={Colors.light.textSecondary} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.delete')}
                      onPress={() => handleDelete(item.id)}
                    >
                      <MaterialIcons name="delete-outline" size={18} color={Colors.expense} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="receipt-long" title={t('transactions.noTransactions')} description={t('dashboard.firstEntryDescription')} actionLabel={t('transactions.addTransaction')} onAction={() => router.push('/(modal)/add-transaction')} />
        }
      />

      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('transactions.editTitle')}</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <MaterialIcons name="close" size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.segmentRow}>
              <TouchableOpacity
                style={[styles.segmentBtn, editType === 'expense' && styles.activeExpense]}
                onPress={() => handleTypeChange('expense')}
              >
                <Text style={[styles.segmentText, editType === 'expense' && styles.activeText]}>
                  {t('transactions.expense')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, editType === 'income' && styles.activeIncome]}
                onPress={() => handleTypeChange('income')}
              >
                <Text style={[styles.segmentText, editType === 'income' && styles.activeText]}>
                  {t('transactions.income')}
                </Text>
              </TouchableOpacity>
            </View>

            <MoneyInput
              label={t('transactions.amount')}
              currency={editingTransaction?.currency || 'VND'}
              valueMinor={editAmount}
              onChangeMinor={setEditAmount}
            />

            <View style={styles.formGroup}>
              <DatePicker
                label={t('transactions.date')}
                value={editDate}
                onChange={setEditDate}
                placeholder={t('datePicker.placeholder', { defaultValue: 'Chọn ngày...' })}
              />
            </View>

            <CategoryPicker
              type={editType}
              selectedCategoryId={editCategoryId}
              onSelectCategory={(catId) => setEditCategoryId(catId)}
              allowClear
            />

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('transactions.note')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('transactions.notePlaceholder')}
                placeholderTextColor={Colors.light.textSecondary}
                value={editNote}
                onChangeText={setEditNote}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={t('transactions.deleteThis')}
              variant="outline"
              onPress={() => editingTransaction && handleDelete(editingTransaction.id)}
              style={styles.deleteTxBtn}
            />
            <Button
              title={t('common.update')}
              variant="primary"
              loading={saving}
              onPress={handleSaveEdit}
              style={styles.saveTxBtn}
            />
          </View>
        </View>
      </Modal>
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
    padding: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {
    color: Colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
  },
  addButton: {
    minHeight: 42,
    maxWidth: 170,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addButtonText: {
    color: Colors.light.text,
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 4,
    borderRadius: 18,
    backgroundColor: Colors.light.backgroundElement,
  },
  filterChip: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
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
    paddingBottom: 40,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  txCard: {
    padding: 16,
    gap: 10,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
    gap: 4,
  },
  txNote: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  txDate: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
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
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
  },
  actionIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.backgroundElement,
    paddingTop: 4,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  modalContent: {
    padding: 20,
    gap: 16,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeExpense: {
    backgroundColor: Colors.primary,
  },
  activeIncome: {
    backgroundColor: Colors.primary,
  },
  activeText: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  formGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  deleteTxBtn: {
    flex: 1,
    borderColor: Colors.expense,
  },
  saveTxBtn: {
    flex: 1,
  },
});
