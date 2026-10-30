import { useTheme } from '@/hooks/use-theme';
import { createAddTransactionStyles } from './add-transaction.styles';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
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
import { MoneyInput } from '@/components/ui/money-input';
import { Colors } from '@/constants/theme';
import { AccountRow, EntryType, FundRow } from '@/database/types';
import { getDefaultAccount } from '@/features/accounts/account-queries';
import { checkSpendingLimit } from '@/features/budgets/budget-queries';
import { CategoryWithGroup } from '@/features/categories/category-queries';
import { getAllFunds } from '@/features/funds/fund-queries';
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
  const theme = useTheme();
  const styles = createAddTransactionStyles(theme);
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN';
  const router = useRouter();
  const closeModal = useSafeBack('/(main)/transactions');

  const [type, setType] = useState<EntryType>('expense');
  const [amountMinor, setAmountMinor] = useState<number>(0);
  const [activeAccount, setActiveAccount] = useState<AccountRow | null>(null);
  const [funds, setFunds] = useState<FundRow[]>([]);
  const [selectedFundId, setSelectedFundId] = useState<string | null>(null); // null = wallet
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
    getAllFunds(false).then(setFunds).catch(() => undefined);
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

    // Check non-negative balance constraint
    if (type === 'expense') {
      if (selectedFundId) {
        const chosenFund = funds.find((f) => f.id === selectedFundId);
        if (chosenFund && amountMinor > chosenFund.balance) {
          setError(
            t('transactions.insufficientFundAlert', {
              name: chosenFund.name,
              balance: formatMoney(chosenFund.balance, currency, locale),
            })
          );
          return;
        }
      } else {
        if (amountMinor > activeAccount.balance) {
          setError(t('transactions.insufficientWalletAlert'));
          return;
        }
      }
    }

    setLoading(true);
    setError(null);
    try {
      if (!isValidTransactionDate(date)) {
        setError(t('monthlyLimit.invalidDate'));
        return;
      }
      const saved = await withMonthlyLimitConfirmation(
        (monthlyLimitApproval) =>
          createTransaction({
            type,
            amount: amountMinor,
            currency,
            accountId: activeAccount.id,
            fundId: selectedFundId || undefined,
            categoryId: selectedCategoryId || undefined,
            note: note || undefined,
            date,
            monthlyLimitApproval,
          }),
        t
      );

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('transactions.entryTitle')}</Text>
        <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          {/* Money Source / Destination (Wallet vs Funds) */}
          {funds.length > 0 && (
            <Card style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>
                {t(type === 'expense' ? 'transactions.moneySource' : 'transactions.moneyDestination')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sourcesScrollRow}
              >
                {/* Option 1: Wallet */}
                <TouchableOpacity
                  style={[
                    styles.sourceCard,
                    selectedFundId === null && styles.sourceCardActive,
                  ]}
                  onPress={() => setSelectedFundId(null)}
                >
                  <View style={[styles.sourceIconBadge, { backgroundColor: Colors.primary }]}>
                    <MaterialIcons name="account-balance-wallet" size={16} color={Colors.primaryStrong} />
                  </View>
                  <View style={styles.sourceTextGroup}>
                    <Text
                      style={[
                        styles.sourceName,
                        selectedFundId === null && styles.sourceNameActive,
                      ]}
                      numberOfLines={1}
                    >
                      {t('funds.sourceWallet')}
                    </Text>
                    <Text style={styles.sourceBalance}>
                      {formatMoney(activeAccount?.balance ?? 0, currency, locale)}
                    </Text>
                  </View>
                  {selectedFundId === null && (
                    <MaterialIcons name="check" size={16} color={Colors.primaryStrong} />
                  )}
                </TouchableOpacity>

                {/* Option 2..N: Active Funds */}
                {funds.map((f) => {
                  const isSelected = selectedFundId === f.id;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[
                        styles.sourceCard,
                        isSelected && styles.sourceCardActive,
                      ]}
                      onPress={() => setSelectedFundId(f.id)}
                    >
                      <View
                        style={[
                          styles.sourceIconBadge,
                          { backgroundColor: f.color || Colors.primaryDark },
                        ]}
                      >
                        <MaterialIcons
                          name={(f.icon as any) || 'savings'}
                          size={16}
                          color="#FFFFFF"
                        />
                      </View>
                      <View style={styles.sourceTextGroup}>
                        <Text
                          style={[
                            styles.sourceName,
                            isSelected && styles.sourceNameActive,
                          ]}
                          numberOfLines={1}
                        >
                          {f.name}
                        </Text>
                        <Text style={styles.sourceBalance}>
                          {formatMoney(f.balance, f.currency, locale)}
                        </Text>
                      </View>
                      {isSelected && (
                        <MaterialIcons name="check" size={16} color={Colors.primaryStrong} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Card>
          )}

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
                    limit: formatMoney(limitWarning.limit, currency, locale),
                    projected: formatMoney(limitWarning.projectedTotal, currency, locale),
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
                <Text
                  style={[
                    styles.datePresetText,
                    datePreset === 'today' && styles.activeDatePresetText,
                  ]}
                >
                  {t('transactions.today')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.datePresetBtn, datePreset === 'yesterday' && styles.activeDatePreset]}
                onPress={() => handleDatePreset('yesterday')}
              >
                <Text
                  style={[
                    styles.datePresetText,
                    datePreset === 'yesterday' && styles.activeDatePresetText,
                  ]}
                >
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
