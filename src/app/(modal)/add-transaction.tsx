import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryPicker } from '@/components/ui/category-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { MoneyInput } from '@/components/ui/money-input';
import { Colors } from '@/constants/theme';
import { AccountRow, EntryType } from '@/database/types';
import { getDefaultAccount } from '@/features/accounts/account-queries';
import { checkSpendingLimit } from '@/features/budgets/budget-queries';
import { CategoryWithGroup } from '@/features/categories/category-queries';
import { useSafeBack } from '@/hooks/use-safe-back';
import { createTransaction } from '@/features/transactions/transaction-queries';
import { withMonthlyLimitConfirmation } from '@/features/budgets/confirm-monthly-limit';
import { isValidTransactionDate } from '@/features/budgets/monthly-limits';
import {
  formatDateInGmt,
  formatDateTimeInGmt,
  getEffectiveGmtOffsetMinutes,
  getPreferredGmt,
  getSystemGmtOffsetMinutes,
} from '@/services/timezone/timezone-service';
import { extractDatePart, parseISODate } from '@/shared/date-utils';
import { formatMoney } from '@/shared/money';

export default function AddTransactionModal() {
  const { t } = useTranslation();
  const router = useRouter();
  const closeModal = useSafeBack('/(main)/transactions');

  const [type, setType] = useState<EntryType>('expense');
  const [amountMinor, setAmountMinor] = useState<number>(0);
  const [activeAccount, setActiveAccount] = useState<AccountRow | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithGroup | null>(null);
  const [note, setNote] = useState<string>('');
  const [timezoneOffset, setTimezoneOffset] = useState<number>(getSystemGmtOffsetMinutes());
  const [date, setDate] = useState<string>(formatDateTimeInGmt(new Date(), getSystemGmtOffsetMinutes()));
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [limitWarning, setLimitWarning] = useState<{
    hasLimit: boolean;
    isOverLimit: boolean;
    percentUsed: number;
    limit: number;
    projectedTotal: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    getPreferredGmt()
      .then((gmt) => {
        if (!active) return;
        const offset = getEffectiveGmtOffsetMinutes(gmt);
        setTimezoneOffset(offset);
        setDate(formatDateTimeInGmt(new Date(), offset));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    getDefaultAccount().then(setActiveAccount).catch(() => setError(t('transactions.saveError')));
  }, [t]);

  useEffect(() => {
    async function checkLimit() {
      if (type === 'expense' && selectedCategoryId && amountMinor > 0) {
        const datePart = extractDatePart(date);
        const { year, month } = parseISODate(datePart);
        if (isNaN(year) || isNaN(month)) return;
        const limitResult = await checkSpendingLimit(selectedCategoryId, year, month, amountMinor);
        if (limitResult.hasLimit) {
          setLimitWarning({
            hasLimit: true,
            isOverLimit: limitResult.isOverLimit,
            percentUsed: limitResult.percentUsed,
            limit: limitResult.limit,
            projectedTotal: limitResult.projectedTotal,
          });
        } else {
          setLimitWarning(null);
        }
      } else {
        setLimitWarning(null);
      }
    }
    void checkLimit();
  }, [type, selectedCategoryId, amountMinor, date]);

  const currency = activeAccount ? activeAccount.currency : 'VND';

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const dateOnly = extractDatePart(newDate);
    const today = formatDateInGmt(new Date(), timezoneOffset);
    const yesterday = formatDateInGmt(new Date(Date.now() - 86400000), timezoneOffset);
    if (dateOnly === today) {
      setDatePreset('today');
    } else if (dateOnly === yesterday) {
      setDatePreset('yesterday');
    } else {
      setDatePreset('custom');
    }
  };

  const handleDatePreset = (preset: 'today' | 'yesterday' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setDate(formatDateTimeInGmt(now, timezoneOffset));
    } else if (preset === 'yesterday') {
      const yesterday = new Date(now.getTime() - 86400000);
      setDate(formatDateTimeInGmt(yesterday, timezoneOffset));
    }
  };

  const handleSave = async () => {
    if (!activeAccount || loading) return;
    if (amountMinor <= 0) {
      setError(t('transactions.amountRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!isValidTransactionDate(date)) {
        setError(t('monthlyLimit.invalidDate'));
        return;
      }
      const saved = await withMonthlyLimitConfirmation((monthlyLimitApproval) => createTransaction({
        type,
        amount: amountMinor,
        currency,
        accountId: activeAccount.id,
        categoryId: selectedCategoryId || undefined,
        note: note || undefined,
        date,
        monthlyLimitApproval,
      }), t);

      if (saved) {
        if (router.canDismiss?.()) {
          router.dismissAll();
        }
        router.replace('/(main)');
      }
    } catch (saveError: any) {
      setError(saveError.message || t('transactions.saveError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('transactions.entryTitle')}</Text>
        <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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

        {limitWarning && (
          <View
            style={[
              styles.warningBanner,
              limitWarning.isOverLimit ? styles.dangerBanner : styles.amberBanner,
            ]}
          >
            <MaterialIcons
              name={limitWarning.isOverLimit ? 'error' : 'warning'}
              size={18}
              color={limitWarning.isOverLimit ? '#C62828' : '#E65100'}
            />
            <View style={styles.warningTextContainer}>
              <Text
                style={[
                  styles.warningTitle,
                  { color: limitWarning.isOverLimit ? '#C62828' : '#E65100' },
                ]}
              >
                {limitWarning.isOverLimit
                  ? t('transactions.limitExceeded')
                  : t('transactions.limitReached', { percent: limitWarning.percentUsed })}
              </Text>
              <Text style={styles.warningSub}>
                {t('transactions.limitProjection', {
                  category: selectedCategory?.name,
                  limit: formatMoney(limitWarning.limit, currency),
                  projected: formatMoney(limitWarning.projectedTotal, currency),
                })}
              </Text>
            </View>
          </View>
        )}

        <Card style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>{t('transactions.recordedDate')}</Text>
          <View style={styles.datePresetRow}>
            <TouchableOpacity
              style={[styles.datePresetBtn, datePreset === 'today' && styles.activeDatePreset]}
              onPress={() => handleDatePreset('today')}
            >
              <Text style={[styles.datePresetText, datePreset === 'today' && styles.activeDatePresetText]}>
                {t('transactions.today')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.datePresetBtn, datePreset === 'yesterday' && styles.activeDatePreset]}
              onPress={() => handleDatePreset('yesterday')}
            >
              <Text style={[styles.datePresetText, datePreset === 'yesterday' && styles.activeDatePresetText]}>
                {t('transactions.yesterday')}
              </Text>
            </TouchableOpacity>
          </View>

          <DatePicker
            mode="datetime"
            value={date}
            onChange={handleDateChange}
            placeholder={t('datePicker.placeholder', { defaultValue: 'Chọn ngày...' })}
          />
        </Card>

        <CategoryPicker
          type={type}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(catId, catObj) => {
            setSelectedCategoryId(catId);
            if (catObj) setSelectedCategory(catObj);
          }}
        />

        <Card style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>{t('transactions.noteLabel')}</Text>
          <TextInput
            style={styles.noteInput}
            placeholder={t('transactions.noteExample')}
            placeholderTextColor={Colors.light.textSecondary}
            value={note}
            onChangeText={setNote}
          />
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={t('common.save')}
          onPress={handleSave}
          variant="primary"
          loading={loading}
          disabled={!activeAccount}
        />
      </View>
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  dangerBanner: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  amberBanner: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE082',
  },
  warningTextContainer: {
    flex: 1,
    gap: 2,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  warningSub: {
    fontSize: 12,
    color: Colors.light.textSecondary,
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
  datePresetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  datePresetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
  },
  activeDatePreset: {
    backgroundColor: Colors.primary,
  },
  datePresetText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeDatePresetText: {
    color: '#1A1C2E',
    fontWeight: '700',
  },
  noteInput: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  errorText: {
    fontSize: 13,
    color: '#C62828',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
});
