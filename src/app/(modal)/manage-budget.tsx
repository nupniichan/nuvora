import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MoneyInput } from '@/components/ui/money-input';
import { Colors } from '@/constants/theme';
import {
  createBudget,
  getActiveBudget,
  getBudgetWithAllocations,
  setCategorySpendingLimit,
} from '@/features/budgets/budget-queries';
import { getMonthlyLimit, monthKey, MonthlyLimitScope, MonthlyLimitValidationError, saveMonthlyLimit } from '@/features/budgets/monthly-limits';
import { getDefaultAccount } from '@/features/accounts/account-queries';
import { alertMessage, confirmAction } from '@/shared/dialog';
import { getAllCategories } from '@/features/categories/category-queries';
import { useSafeBack } from '@/hooks/use-safe-back';
import { formatMoney } from '@/shared/money';

interface CategoryLimitDraft {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  groupName: string;
  isEnabled: boolean;
  limitAmount: number;
}

export default function ManageBudgetModal() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN';
  const closeModal = useSafeBack('/(main)/budgets');
  const params = useLocalSearchParams<{ year?: string; month?: string }>();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    try { return monthKey(Number(params.year), Number(params.month)); }
    catch { return monthKey(now.getFullYear(), now.getMonth() + 1); }
  });
  const [year, month] = selectedMonth.split('-').map(Number);
  const [currency, setCurrency] = useState('');
  const [categoryCurrency, setCategoryCurrency] = useState('VND');
  const [scope, setScope] = useState<MonthlyLimitScope>('month');
  const [recurringLimit, setRecurringLimit] = useState<number | null>(null);
  const [monthLoading, setMonthLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [budgetId, setBudgetId] = useState<string>('');
  const [totalBudgetEnabled, setTotalBudgetEnabled] = useState(false);
  const [totalBudgetAmount, setTotalBudgetAmount] = useState<number>(10000000);
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimitDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const monthStr = String(currentMonth).padStart(2, '0');
        const account = await getDefaultAccount();
        setCurrency(account.currency);

        let active = await getActiveBudget();
        if (!active) {
          active = await createBudget({
            name: t('budgets.monthlyPlanName', { month: currentMonth, year: currentYear }),
            period_type: 'monthly',
            start_date: `${currentYear}-${monthStr}-01`,
            currency: account.currency,
          });
        }

        setBudgetId(active.id);
        setCategoryCurrency(active.currency);

        const full = await getBudgetWithAllocations(active.id);
        const limitMap = new Map<string, number>();
        if (full) {
          full.allocations.forEach((allocation) => {
            if (allocation.amount && allocation.amount > 0) {
              limitMap.set(allocation.category_id, allocation.amount);
            }
          });
        }

        const allExpenseCategories = await getAllCategories('expense');
        const drafts: CategoryLimitDraft[] = allExpenseCategories.map((category) => {
          const existingLimit = limitMap.get(category.id);
          return {
            categoryId: category.id,
            categoryName: category.name,
            categoryIcon: category.icon,
            categoryColor: category.color,
            groupName: category.group_name,
            isEnabled: !!existingLimit,
            limitAmount: existingLimit || 1000000,
          };
        });

        setCategoryLimits(drafts);
      } catch (error) {
        setLoadError(true);
        console.warn('Lỗi tải hạn mức', error);
      } finally {
        setInitialLoading(false);
      }
    }
    void load();
  }, [t]);

  useEffect(() => {
    if (!currency) return;
    let cancelled = false;
    getMonthlyLimit(year, month, currency).then(result => {
      if (cancelled) return;
      setTotalBudgetEnabled(result.limit !== null);
      setTotalBudgetAmount(result.limit ?? 0);
      setRecurringLimit(result.recurringLimit);
      setScope(result.source === 'recurring' ? 'inherit' : 'month');
      setDirty(false);
    }).catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setMonthLoading(false); });
    return () => { cancelled = true; };
  }, [year, month, currency]);

  const changeMonth = (offset: number) => {
    const target = new Date(year, month - 1 + offset, 1);
    const change = () => {
      setMonthLoading(true);
      setSelectedMonth(monthKey(target.getFullYear(), target.getMonth() + 1));
    };
    if (dirty) confirmAction(t('monthlyLimit.unsavedTitle'), t('monthlyLimit.unsavedMessage'), change, t('monthlyLimit.discard'), t('common.cancel'));
    else change();
  };

  const handleToggleLimit = (index: number, isEnabled: boolean) => {
    setCategoryLimits((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], isEnabled };
      return next;
    });
  };

  const handleUpdateAmount = (index: number, amountMinor: number) => {
    setCategoryLimits((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], limitAmount: amountMinor };
      return next;
    });
  };

  const totalLimits = categoryLimits
    .filter((categoryLimit) => categoryLimit.isEnabled)
    .reduce((sum, categoryLimit) => sum + categoryLimit.limitAmount, 0);

  const handleSave = async () => {
    if (!budgetId || loading || initialLoading || monthLoading || loadError) return;
    if (scope !== 'inherit' && totalBudgetEnabled && (!Number.isSafeInteger(totalBudgetAmount) || totalBudgetAmount <= 0)) {
      alertMessage(t('common.error'), t('monthlyLimit.invalidAmount'));
      return;
    }

    setLoading(true);
    try {
      await saveMonthlyLimit(year, month, currency, scope !== 'inherit' && totalBudgetEnabled ? totalBudgetAmount : null, scope);

      for (const item of categoryLimits) {
        await setCategorySpendingLimit(
          budgetId,
          item.categoryId,
          item.isEnabled && item.limitAmount > 0 ? item.limitAmount : null
        );
      }

      closeModal();
    } catch (saveError: any) {
      alertMessage(t('common.error'), saveError instanceof MonthlyLimitValidationError ? t(`monthlyLimit.${saveError.code}`) : t('monthlyLimit.saveError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('budgets.editBudget')}</Text>
        <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {initialLoading || monthLoading ? <ActivityIndicator color={Colors.primaryStrong} /> : null}
        {loadError && <Text style={styles.warningText}>{t('charts.loadError')}</Text>}
        <Card style={styles.sectionCard}>
          <View style={styles.toggleRow}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('charts.previousMonth')} disabled={monthLoading || loading || year <= 1000} onPress={() => changeMonth(-1)} style={styles.closeBtn}>
              <MaterialIcons name="chevron-left" size={26} color={Colors.primaryDark} />
            </TouchableOpacity>
            <Text style={styles.toggleTitle}>{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))} · {currency}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('charts.nextMonth')} disabled={monthLoading || loading || year >= 9999} onPress={() => changeMonth(1)} style={styles.closeBtn}>
              <MaterialIcons name="chevron-right" size={26} color={Colors.primaryDark} />
            </TouchableOpacity>
          </View>
          {(['month', 'recurring', 'inherit'] as const).map(option => (
            <TouchableOpacity key={option} accessibilityRole="radio" accessibilityState={{ checked: scope === option }} disabled={monthLoading || loading} onPress={() => { setScope(option); setDirty(true); }} style={styles.toggleRow}>
              <MaterialIcons name={scope === option ? 'radio-button-checked' : 'radio-button-unchecked'} size={22} color={Colors.primaryDark} />
              <View style={styles.toggleTextInfo}>
                <Text style={styles.toggleTitle}>{t(`monthlyLimit.scope.${option}`)}</Text>
                <Text style={styles.toggleDesc}>{t(`monthlyLimit.scopeDescription.${option}`)}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {scope === 'inherit' ? <Text style={styles.toggleDesc}>{t('monthlyLimit.inheritedAmount', { amount: recurringLimit === null ? t('budgets.unlimitedSpending') : formatMoney(recurringLimit, currency, locale) })}</Text> : <>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextInfo}>
              <Text style={styles.toggleTitle}>{t('budgets.totalMonthlyLimit')}</Text>
              <Text style={styles.toggleDesc}>{t('budgets.totalMonthlyLimitDescription')}</Text>
            </View>
            <Switch
              value={totalBudgetEnabled}
              onValueChange={value => { setTotalBudgetEnabled(value); setDirty(true); }}
              disabled={monthLoading || loading}
              trackColor={{ false: Colors.light.backgroundElement, true: Colors.primaryDark }}
              thumbColor="#FFFFFF"
            />
          </View>

          {totalBudgetEnabled && (
            <View style={styles.totalInputBox}>
              <MoneyInput
                label={t('budgets.totalLimitAmount')}
                valueMinor={totalBudgetAmount}
                onChangeMinor={value => { setTotalBudgetAmount(value); setDirty(true); }}
                currency={currency || 'VND'}
              />
            </View>
          )}
          </>}
        </Card>

        <View style={styles.listSection}>
          <Text style={styles.toggleDesc}>{t('monthlyLimit.categoryShared')}</Text>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{t('budgets.byCategory')}</Text>
            {totalLimits > 0 && (
              <Text style={styles.totalLimitsBadge}>
                {t('budgets.totalLabel', { amount: formatMoney(totalLimits, categoryCurrency, locale) })}
              </Text>
            )}
          </View>

          {categoryCurrency === currency && totalBudgetEnabled && totalLimits > totalBudgetAmount && (
            <View style={styles.warningBanner}>
              <MaterialIcons name="warning" size={16} color="#E65100" />
              <Text style={styles.warningText}>
                {t('budgets.categoryLimitsExceed', {
                  categoryTotal: formatMoney(totalLimits, categoryCurrency, locale),
                  monthlyTotal: formatMoney(totalBudgetAmount, currency, locale),
                })}
              </Text>
            </View>
          )}

          {categoryLimits.map((categoryLimitItem, index) => (
            <Card key={categoryLimitItem.categoryId} style={styles.catCard}>
              <View style={styles.catCardHeader}>
                <View
                  style={[
                    styles.catIconBadge,
                    { backgroundColor: categoryLimitItem.categoryColor || Colors.primaryDark },
                  ]}
                >
                  <MaterialIcons
                    name={(categoryLimitItem.categoryIcon as any) || 'category'}
                    size={18}
                    color="#FFFFFF"
                  />
                </View>

                <View style={styles.catNameContainer}>
                  <Text style={styles.catName}>{categoryLimitItem.categoryName}</Text>
                  <Text style={styles.catGroup}>{categoryLimitItem.groupName}</Text>
                </View>

                <Switch
                  value={categoryLimitItem.isEnabled}
                  onValueChange={(val) => handleToggleLimit(index, val)}
                  trackColor={{ false: Colors.light.backgroundElement, true: Colors.primaryDark }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {categoryLimitItem.isEnabled ? (
                <View style={styles.catInputContainer}>
                  <MoneyInput
                    valueMinor={categoryLimitItem.limitAmount}
                    onChangeMinor={(amt) => handleUpdateAmount(index, amt)}
                    currency={categoryCurrency}
                  />
                </View>
              ) : (
                <Text style={styles.unlimitedText}>{t('budgets.unlimitedSpending')}</Text>
              )}
            </Card>
          ))}
        </View>

        <Button
          title={t('budgets.saveBudget')}
          variant="primary"
          onPress={handleSave}
          loading={loading}
          disabled={initialLoading || monthLoading || loadError}
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
  sectionCard: {
    padding: 16,
    gap: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTextInfo: {
    flex: 1,
    paddingRight: 10,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  toggleDesc: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 16,
  },
  totalInputBox: {
    marginTop: 4,
  },
  listSection: {
    gap: 10,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  totalLimitsBadge: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3E0',
    borderColor: '#FFE0B2',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#E65100',
    lineHeight: 16,
  },
  catCard: {
    padding: 14,
    gap: 10,
  },
  catCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catNameContainer: {
    flex: 1,
  },
  catName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  catGroup: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  catInputContainer: {
    marginTop: 2,
  },
  unlimitedText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    paddingLeft: 46,
  },
  saveBtn: {
    marginTop: 10,
    marginBottom: 30,
  },
});
