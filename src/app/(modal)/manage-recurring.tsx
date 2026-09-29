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
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryPicker } from '@/components/ui/category-picker';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Colors } from '@/constants/theme';
import { AccountRow, EntryType } from '@/database/types';
import { getDefaultAccount } from '@/features/accounts/account-queries';
import { createRecurringRule, processRecurringCatchUp } from '@/features/recurring/recurring-queries';
import { useSafeBack } from '@/hooks/use-safe-back';
import { formatDateISO } from '@/shared/date-utils';

export default function ManageRecurringModal() {
  const { t } = useTranslation();
  const closeModal = useSafeBack('/(main)/more');

  const [name, setName] = useState('');
  const [type, setType] = useState<EntryType>('expense');
  const [amountMinor, setAmountMinor] = useState<number>(0);
  const [activeAccount, setActiveAccount] = useState<AccountRow | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState<number>(new Date().getDate());
  const [behavior, setBehavior] = useState<'confirm' | 'auto_post'>('confirm');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDefaultAccount().then(setActiveAccount).catch(() => setError(t('recurring.saveError')));
  }, [t]);

  const currency = activeAccount ? activeAccount.currency : 'VND';

  const handleSave = async () => {
    if (!activeAccount) return;
    if (!name.trim()) {
      setError(t('recurring.ruleNameRequired'));
      return;
    }
    if (amountMinor <= 0) {
      setError(t('recurring.amountRequired'));
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
        accountId: activeAccount.id,
        categoryId: selectedCategoryId || null,
        frequency,
        interval: 1,
        dayOfMonth: frequency === 'monthly' ? dayOfMonth : null,
        monthEndBehavior: 'last_day',
        startDate: today,
        behavior,
      });

      await processRecurringCatchUp();

      closeModal();
    } catch (saveError: any) {
      setError(saveError.message || t('recurring.saveError'));
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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

        <Input
          label={t('recurring.ruleName')}
          placeholder={t('recurring.ruleNamePlaceholder')}
          value={name}
          onChangeText={setName}
        />

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

        <MoneyInput
          label={t('transactions.amount')}
          currency={currency}
          valueMinor={amountMinor}
          onChangeMinor={setAmountMinor}
        />

        <CategoryPicker
          type={type}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(catId) => setSelectedCategoryId(catId)}
        />

        <Card style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>{t('recurring.frequency')}</Text>
          <View style={styles.freqRow}>
            {(['monthly', 'weekly', 'daily'] as const).map((freqOption) => (
              <TouchableOpacity
                key={freqOption}
                style={[styles.freqBtn, frequency === freqOption && styles.activeFreqBtn]}
                onPress={() => setFrequency(freqOption)}
              >
                <Text style={[styles.freqText, frequency === freqOption && styles.activeFreqText]}>
                  {t(`recurring.${freqOption}`)}
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
          disabled={!activeAccount}
          style={styles.saveBtn}
        />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
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


