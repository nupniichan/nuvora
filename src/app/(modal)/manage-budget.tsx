import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
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
  setMonthlyBudgetTotal,
} from '@/features/budgets/budget-queries';
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
  limitAmount: number; // Integer minor units
}

export default function ManageBudgetModal() {
  const { t } = useTranslation();
  const closeModal = useSafeBack('/(main)/budgets');

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
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const monthStr = String(month).padStart(2, '0');

        let active = await getActiveBudget();
        if (!active) {
          active = await createBudget({
            name: t('budgets.monthlyPlanName', { month, year }),
            period_type: 'monthly',
            start_date: `${year}-${monthStr}-01`,
            currency: 'VND',
          });
        }

        setBudgetId(active.id);
        if (active.total_budget && active.total_budget > 0) {
          setTotalBudgetEnabled(true);
          setTotalBudgetAmount(active.total_budget);
        }

        const full = await getBudgetWithAllocations(active.id);
        const limitMap = new Map<string, number>();
        if (full) {
          full.allocations.forEach((a) => {
            if (a.amount && a.amount > 0) {
              limitMap.set(a.category_id, a.amount);
            }
          });
        }

        // Load all expense categories
        const allCats = await getAllCategories('expense');
        const drafts: CategoryLimitDraft[] = allCats.map((cat) => {
          const existingLimit = limitMap.get(cat.id);
          return {
            categoryId: cat.id,
            categoryName: cat.name,
            categoryIcon: cat.icon,
            categoryColor: cat.color,
            groupName: cat.group_name,
            isEnabled: !!existingLimit,
            limitAmount: existingLimit || 1000000,
          };
        });

        setCategoryLimits(drafts);
      } catch (e) {
        console.warn('Lỗi tải hạn mức', e);
      } finally {
        setInitialLoading(false);
      }
    }
    load();
  }, [t]);

  const handleToggleLimit = (index: number, val: boolean) => {
    setCategoryLimits((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], isEnabled: val };
      return next;
    });
  };

  const handleUpdateAmount = (index: number, amt: number) => {
    setCategoryLimits((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], limitAmount: amt };
      return next;
    });
  };

  const totalLimits = categoryLimits
    .filter((c) => c.isEnabled)
    .reduce((sum, c) => sum + c.limitAmount, 0);

  const handleSave = async () => {
    if (!budgetId) return;

    setLoading(true);
    try {
      // 1. Save total budget limit
      await setMonthlyBudgetTotal(
        budgetId,
        totalBudgetEnabled && totalBudgetAmount > 0 ? totalBudgetAmount : null
      );

      // 2. Save individual category limits
      for (const item of categoryLimits) {
        await setCategorySpendingLimit(
          budgetId,
          item.categoryId,
          item.isEnabled && item.limitAmount > 0 ? item.limitAmount : null
        );
      }

      closeModal();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('common.error'));
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
        {initialLoading ? <ActivityIndicator color={Colors.primaryStrong} /> : null}
        {/* Total Monthly Budget Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextInfo}>
              <Text style={styles.toggleTitle}>{t('budgets.totalMonthlyLimit')}</Text>
              <Text style={styles.toggleDesc}>{t('budgets.totalMonthlyLimitDescription')}</Text>
            </View>
            <Switch
              value={totalBudgetEnabled}
              onValueChange={setTotalBudgetEnabled}
              trackColor={{ false: Colors.light.backgroundElement, true: Colors.primaryDark }}
              thumbColor="#FFFFFF"
            />
          </View>

          {totalBudgetEnabled && (
            <View style={styles.totalInputBox}>
              <MoneyInput
                label={t('budgets.totalLimitAmount')}
                valueMinor={totalBudgetAmount}
                onChangeMinor={setTotalBudgetAmount}
                currency="VND"
              />
            </View>
          )}
        </Card>

        {/* Category Spending Limits List */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{t('budgets.byCategory')}</Text>
            {totalLimits > 0 && (
              <Text style={styles.totalLimitsBadge}>
                {t('budgets.totalLabel', { amount: formatMoney(totalLimits, 'VND') })}
              </Text>
            )}
          </View>

          {totalBudgetEnabled && totalLimits > totalBudgetAmount && (
            <View style={styles.warningBanner}>
              <MaterialIcons name="warning" size={16} color="#E65100" />
              <Text style={styles.warningText}>
                {t('budgets.categoryLimitsExceed', {
                  categoryTotal: formatMoney(totalLimits, 'VND'),
                  monthlyTotal: formatMoney(totalBudgetAmount, 'VND'),
                })}
              </Text>
            </View>
          )}

          {categoryLimits.map((cat, idx) => (
            <Card key={cat.categoryId} style={styles.catCard}>
              <View style={styles.catCardHeader}>
                <View
                  style={[
                    styles.catIconBadge,
                    { backgroundColor: cat.categoryColor || Colors.primaryDark },
                  ]}
                >
                  <MaterialIcons
                    name={(cat.categoryIcon as any) || 'category'}
                    size={18}
                    color="#FFFFFF"
                  />
                </View>

                <View style={styles.catNameContainer}>
                  <Text style={styles.catName}>{cat.categoryName}</Text>
                  <Text style={styles.catGroup}>{cat.groupName}</Text>
                </View>

                <Switch
                  value={cat.isEnabled}
                  onValueChange={(val) => handleToggleLimit(idx, val)}
                  trackColor={{ false: Colors.light.backgroundElement, true: Colors.primaryDark }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {cat.isEnabled ? (
                <View style={styles.catInputContainer}>
                  <MoneyInput
                    valueMinor={cat.limitAmount}
                    onChangeMinor={(amt) => handleUpdateAmount(idx, amt)}
                    currency="VND"
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
