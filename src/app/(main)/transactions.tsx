import { useTheme } from '@/hooks/use-theme';
import { createTransactionsStyles } from './transactions.styles';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
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
import { Colors } from '@/constants/theme';
import { EntryType, TransactionRow } from '@/database/types';
import { CategoryWithGroup, getAllCategories } from '@/features/categories/category-queries';
import {
  deleteTransaction,
  isGoalCompletionTransaction,
  getTransactions,
  updateTransaction,
} from '@/features/transactions/transaction-queries';
import { appendCurrentTime, formatDateDisplay, formatDateTimeISO } from '@/shared/date-utils';
import { formatMoney } from '@/shared/money';

import { alertMessage, confirmAction } from '@/shared/dialog';
import { withMonthlyLimitConfirmation } from '@/features/budgets/confirm-monthly-limit';
import { isValidTransactionDate } from '@/features/budgets/monthly-limits';

export default function TransactionsScreen() {
  const theme = useTheme();
  const styles = createTransactionsStyles(theme);
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'vi';
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
    if ((transaction.type !== 'income' && transaction.type !== 'expense') || isGoalCompletionTransaction(transaction.id)) return;
    setEditingTransaction(transaction);
    setEditType(transaction.type);
    setEditAmount(typeof transaction.amount === 'number' && !isNaN(transaction.amount) ? transaction.amount : 0);
    setEditCategoryId(transaction.category_id || null);
    setEditNote(transaction.note || '');
    setEditDate(transaction.date ? appendCurrentTime(transaction.date) : formatDateTimeISO(new Date()));
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
      const date = editDate.trim() ? appendCurrentTime(editDate.trim()) : formatDateTimeISO(new Date());
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
            <TouchableOpacity onPress={() => openEditModal(item)} disabled={(item.type !== 'income' && item.type !== 'expense') || isGoalCompletionTransaction(item.id)} activeOpacity={0.8}>
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
                      {category?.name ? `${category.name} • ` : ''}{formatDateDisplay(item.date, locale)}
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
                    {(item.type === 'income' || item.type === 'expense') && !isGoalCompletionTransaction(item.id) && (
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
        <SafeAreaView style={styles.modalRoot} edges={['top', 'left', 'right']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('transactions.editTitle')}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={22} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
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
                mode="datetime"
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
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
