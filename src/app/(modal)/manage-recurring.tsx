import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Colors } from '@/constants/theme';
import { AccountRow, TransactionType } from '@/database/types';
import { createAccount, getAllAccounts } from '@/features/accounts/account-queries';
import { CategoryWithGroup, getAllCategories } from '@/features/categories/category-queries';
import { createRecurringRule, processRecurringCatchUp } from '@/features/recurring/recurring-queries';
import { useSafeBack } from '@/hooks/use-safe-back';
import { formatDateISO } from '@/shared/date-utils';

export default function ManageRecurringModal() {
  const { t } = useTranslation();
  const closeModal = useSafeBack('/(main)/more');

  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [amountMinor, setAmountMinor] = useState<number>(0);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [categories, setCategories] = useState<CategoryWithGroup[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'daily' | 'yearly'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState<number>(new Date().getDate());
  const [behavior, setBehavior] = useState<'confirm' | 'auto_post'>('confirm');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      let accs = await getAllAccounts();
      if (accs.length === 0) {
        const defaultAcc = await createAccount({
          name: t('accounts.typeCash'),
          type: 'cash',
          currency: 'VND',
          initialBalance: 0,
        });
        accs = [defaultAcc];
      }
      setAccounts(accs);
      if (accs.length > 0) {
        setSelectedAccountId(accs[0].id);
      }

      const cats = await getAllCategories(type === 'transfer' ? undefined : type);
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCategoryId(cats[0].id);
      }
    }
    void loadData();
  }, [t, type]);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId);
  const currency = activeAccount ? activeAccount.currency : 'VND';

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('recurring.ruleNameRequired'));
      return;
    }
    if (amountMinor <= 0) {
      setError(t('recurring.amountRequired'));
      return;
    }
    if (!selectedAccountId) {
      setError(t('recurring.accountRequired'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const today = formatDateISO(new Date());
      await createRecurringRule({
        name: name.trim(),
        type,
        amount: amountMinor,
        currency,
        accountId: selectedAccountId,
        categoryId: type !== 'transfer' ? (selectedCategoryId || null) : null,
        frequency,
        interval: 1,
        dayOfMonth: frequency === 'monthly' ? dayOfMonth : null,
        monthEndBehavior: 'last_day',
        startDate: today,
        behavior,
      });

      // Run catch up immediately so any due occurrence is populated
      await processRecurringCatchUp();

      closeModal();
    } catch (e: any) {
      setError(e.message || t('recurring.saveError'));
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('recurring.addRule')}</Text>
        <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        )}

        {/* Rule Name */}
        <Input
          label={t('recurring.ruleName')}
          placeholder={t('recurring.ruleNamePlaceholder')}
          value={name}
          onChangeText={setName}
        />

        {/* Type Segment */}
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, type === 'expense' && styles.activeExpense]}
            onPress={() => setType('expense')}
          >
            <Text style={[styles.segmentText, type === 'expense' && styles.activeText]}>
              {t('transactions.expense')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, type === 'income' && styles.activeIncome]}
            onPress={() => setType('income')}
          >
            <Text style={[styles.segmentText, type === 'income' && styles.activeText]}>
              {t('transactions.income')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <MoneyInput
          label={t('transactions.amount')}
          currency={currency}
          valueMinor={amountMinor}
          onChangeMinor={setAmountMinor}
        />

        {/* Account Selector */}
        <Card style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>{t('transactions.account')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
            {accounts.map((acc) => {
              const isSelected = acc.id === selectedAccountId;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.chip, isSelected && styles.selectedChip]}
                  onPress={() => setSelectedAccountId(acc.id)}
                >
                  <MaterialIcons
                    name={(acc.icon as any) || 'account-balance-wallet'}
                    size={14}
                    color={isSelected ? '#1A1C2E' : Colors.light.textSecondary}
                  />
                  <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>

        {/* Category Selector */}
        {categories.length > 0 && (
          <Card style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>{t('transactions.category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
              {categories.map((cat) => {
                const isSelected = cat.id === selectedCategoryId;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, isSelected && styles.selectedChip]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                  >
                    <MaterialIcons
                      name={(cat.icon as any) || 'category'}
                      size={14}
                      color={isSelected ? '#1A1C2E' : Colors.light.textSecondary}
                    />
                    <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Card>
        )}

        {/* Frequency Row */}
        <Card style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>{t('recurring.frequency')}</Text>
          <View style={styles.freqRow}>
            {(['monthly', 'weekly', 'daily'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.freqBtn, frequency === f && styles.activeFreqBtn]}
                onPress={() => setFrequency(f)}
              >
                <Text style={[styles.freqText, frequency === f && styles.activeFreqText]}>
                  {t(`recurring.${f}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {frequency === 'monthly' && (
            <View style={styles.dayPickerRow}>
              <Text style={styles.dayLabel}>{t('recurring.dayOfMonth')}:</Text>
              <View style={styles.daySelector}>
                <TouchableOpacity
                  style={styles.dayStepBtn}
                  onPress={() => setDayOfMonth((prev) => Math.max(1, prev - 1))}
                >
                  <MaterialIcons name="remove" size={18} color={Colors.light.text} />
                </TouchableOpacity>
                <Text style={styles.dayValue}>
                  {t('recurring.dayValue', { day: dayOfMonth })}
                </Text>
                <TouchableOpacity
                  style={styles.dayStepBtn}
                  onPress={() => setDayOfMonth((prev) => Math.min(31, prev + 1))}
                >
                  <MaterialIcons name="add" size={18} color={Colors.light.text} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Card>

        {/* Execution Mode */}
        <Card style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>{t('recurring.postingMode')}</Text>
          <View style={styles.behaviorRow}>
            <TouchableOpacity
              style={[styles.behaviorBtn, behavior === 'confirm' && styles.activeBehaviorBtn]}
              onPress={() => setBehavior('confirm')}
            >
              <MaterialIcons
                name="checklist"
                size={18}
                color={behavior === 'confirm' ? '#1A1C2E' : Colors.light.textSecondary}
              />
              <Text style={[styles.behaviorText, behavior === 'confirm' && styles.activeBehaviorText]}>
                {t('recurring.waitForConfirmation')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.behaviorBtn, behavior === 'auto_post' && styles.activeBehaviorBtn]}
              onPress={() => setBehavior('auto_post')}
            >
              <MaterialIcons
                name="bolt"
                size={18}
                color={behavior === 'auto_post' ? '#1A1C2E' : Colors.light.textSecondary}
              />
              <Text style={[styles.behaviorText, behavior === 'auto_post' && styles.activeBehaviorText]}>
                {t('recurring.autoPost')}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Button
          title={t('common.save')}
          onPress={handleSave}
          variant="primary"
          loading={loading}
          style={styles.saveBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
  },
  errorText: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeExpense: {
    backgroundColor: '#FFEBEE',
  },
  activeIncome: {
    backgroundColor: '#E8F5E9',
  },
  activeText: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  fieldCard: {
    padding: 14,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  chipList: {
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundElement,
  },
  selectedChip: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  selectedChipText: {
    color: '#1A1C2E',
    fontWeight: '700',
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
  },
  activeFreqBtn: {
    backgroundColor: Colors.primary,
  },
  freqText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeFreqText: {
    color: '#1A1C2E',
    fontWeight: '700',
  },
  dayPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  dayLabel: {
    fontSize: 14,
    color: Colors.light.text,
  },
  daySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    minWidth: 64,
    textAlign: 'center',
  },
  behaviorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  behaviorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundElement,
  },
  activeBehaviorBtn: {
    backgroundColor: Colors.primary,
  },
  behaviorText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeBehaviorText: {
    color: '#1A1C2E',
    fontWeight: '700',
  },
  saveBtn: {
    marginTop: 10,
    marginBottom: 30,
  },
});
