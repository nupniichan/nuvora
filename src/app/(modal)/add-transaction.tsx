import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { MoneyInput } from '@/components/ui/money-input';
import { Colors } from '@/constants/theme';
import { getDatabase } from '@/database/database';
import { AccountRow, CategoryGroupRow, EntryType } from '@/database/types';
import { getDefaultAccount } from '@/features/accounts/account-queries';
import { checkSpendingLimit } from '@/features/budgets/budget-queries';
import {
  CategoryWithGroup,
  createCategory,
  getAllCategories,
  getAllCategoryGroups,
} from '@/features/categories/category-queries';
import { seedStarterCategories } from '@/features/categories/starter-templates';
import { useSafeBack } from '@/hooks/use-safe-back';
import { createTransaction } from '@/features/transactions/transaction-queries';
import { withMonthlyLimitConfirmation } from '@/features/budgets/confirm-monthly-limit';
import { isValidTransactionDate } from '@/features/budgets/monthly-limits';
import { formatDateISO } from '@/shared/date-utils';
import { formatMoney } from '@/shared/money';

export default function AddTransactionModal() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const closeModal = useSafeBack('/(main)/transactions');

  const [type, setType] = useState<EntryType>('expense');
  const [amountMinor, setAmountMinor] = useState<number>(0);
  const [activeAccount, setActiveAccount] = useState<AccountRow | null>(null);
  const [groups, setGroups] = useState<CategoryGroupRow[]>([]);
  const [categories, setCategories] = useState<CategoryWithGroup[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(formatDateISO(new Date()));
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [searchCatQuery, setSearchCatQuery] = useState('');

  const [isAddingCustomCat, setIsAddingCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [creatingCustomCat, setCreatingCustomCat] = useState(false);

  const [limitWarning, setLimitWarning] = useState<{
    hasLimit: boolean;
    isOverLimit: boolean;
    percentUsed: number;
    limit: number;
    projectedTotal: number;
  } | null>(null);

  useEffect(() => {
    getDefaultAccount().then(setActiveAccount).catch(() => setError(t('transactions.saveError')));
  }, [t]);

  const loadCategories = useCallback(async () => {
    const [categoryGroups, categoryList] = await Promise.all([
      getAllCategoryGroups(type),
      getAllCategories(type),
    ]);
    setGroups(categoryGroups);
    setCategories(categoryList);
    setSelectedCategoryId((previousId) =>
      previousId && categoryList.some((category) => category.id === previousId)
        ? previousId
        : categoryList[0]?.id ?? null
    );
    setSelectedGroupFilter((previousGroupId) =>
      previousGroupId === 'all' || categoryGroups.some((group) => group.id === previousGroupId)
        ? previousGroupId
        : 'all'
    );
  }, [type]);

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
    }, [loadCategories])
  );

  const handleCreateCustomCat = async () => {
    if (!customCatName.trim()) return;
    const targetGroupId =
      (selectedGroupFilter !== 'all' ? selectedGroupFilter : groups[0]?.id) || '';
    if (!targetGroupId) return;

    const targetGroup = groups.find((group) => group.id === targetGroupId) || groups[0];
    setCreatingCustomCat(true);
    try {
      const created = await createCategory({
        groupId: targetGroup.id,
        name: customCatName.trim(),
        icon: targetGroup.icon || 'category',
        color: targetGroup.color || Colors.primaryDark,
      });
      const updatedCategories = await getAllCategories(targetGroup.type);
      setCategories(updatedCategories);
      setSelectedCategoryId(created.id);
      setCustomCatName('');
      setIsAddingCustomCat(false);
      setIsCategoryExpanded(false);
    } catch (createError: any) {
      console.warn('Could not create custom category', createError);
    } finally {
      setCreatingCustomCat(false);
    }
  };

  const filteredCategories = categories.filter((category) => {
    const matchesGroup =
      selectedGroupFilter === 'all' ||
      category.group_id === selectedGroupFilter ||
      category.group_name === selectedGroupFilter;
    const matchesSearch =
      !searchCatQuery.trim() ||
      category.name.toLowerCase().includes(searchCatQuery.toLowerCase().trim()) ||
      category.group_name.toLowerCase().includes(searchCatQuery.toLowerCase().trim());
    return matchesGroup && matchesSearch;
  });

  useEffect(() => {
    async function checkLimit() {
      if (type === 'expense' && selectedCategoryId && amountMinor > 0) {
        const parsedDate = new Date(date);
        const year = parsedDate.getFullYear();
        const month = parsedDate.getMonth() + 1;
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
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);

  const handleDatePreset = (preset: 'today' | 'yesterday' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setDate(formatDateISO(now));
    } else if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      setDate(formatDateISO(yesterday));
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

      if (saved) closeModal();
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

            <TouchableOpacity
              style={[styles.datePresetBtn, datePreset === 'custom' && styles.activeDatePreset]}
              onPress={() => setDatePreset('custom')}
            >
              <Text style={[styles.datePresetText, datePreset === 'custom' && styles.activeDatePresetText]}>
                {t('transactions.otherDate')}
              </Text>
            </TouchableOpacity>
          </View>

          {datePreset === 'custom' && (
            <TextInput
              style={styles.customDateInput}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.light.textSecondary}
            />
          )}
        </Card>

        <Card style={styles.fieldCard}>
          <View style={styles.fieldHeaderRow}>
            <Text style={styles.fieldLabel}>{t('transactions.category')}</Text>
            <View style={styles.catHeaderRight}>
              <TouchableOpacity onPress={() => setIsCategoryExpanded(!isCategoryExpanded)}>
                <Text style={styles.toggleCatBtnText}>
                  {isCategoryExpanded
                    ? t('transactions.collapse')
                    : t('transactions.changeCategory')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(modal)/manage-categories' as any)}>
                <Text style={styles.manageCategoryLink}>{t('transactions.manage')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {categories.length === 0 ? (
            <View style={styles.emptyCatBox}>
              <Text style={styles.emptyCatText}>{t('transactions.emptyCategories')}</Text>
              <TouchableOpacity
                style={styles.seedCatBtn}
                onPress={async () => {
                  const db = getDatabase();
                  await seedStarterCategories(
                    db,
                    i18n.resolvedLanguage === 'en' ? 'en' : 'vi'
                  );
                  await loadCategories();
                }}
              >
                <MaterialIcons name="auto-awesome" size={16} color="#1A1C2E" />
                <Text style={styles.seedCatBtnText}>
                  {t('transactions.createStarterCategories')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.categoryCardBody}>
              {selectedCategory ? (
                <TouchableOpacity
                  style={[
                    styles.selectedCategoryTile,
                    { borderColor: Colors.primaryDark },
                  ]}
                  onPress={() => setIsCategoryExpanded(!isCategoryExpanded)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.selectedCatIconBadge,
                      { backgroundColor: Colors.primaryLight },
                    ]}
                  >
                    <MaterialIcons
                      name={(selectedCategory.icon as any) || 'category'}
                      size={20}
                      color={Colors.primaryStrong}
                    />
                  </View>

                  <View style={styles.selectedCatInfo}>
                    <Text style={styles.selectedCatName}>{selectedCategory.name}</Text>
                    <Text style={styles.selectedCatGroup}>{selectedCategory.group_name}</Text>
                  </View>

                  <View style={styles.changeBadge}>
                    <Text style={styles.changeBadgeText}>
                      {isCategoryExpanded
                        ? t('transactions.selected')
                        : t('transactions.change')}
                    </Text>
                    <MaterialIcons
                      name={isCategoryExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={18}
                      color={Colors.primaryDark}
                    />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.noCatTile}
                  onPress={() => setIsCategoryExpanded(true)}
                >
                  <MaterialIcons name="add-circle-outline" size={20} color={Colors.light.textSecondary} />
                  <Text style={styles.noCatText}>{t('transactions.chooseCategory')}</Text>
                </TouchableOpacity>
              )}

              {isCategoryExpanded && (
                <View style={styles.expandedCatPanel}>
                  {categories.length > 6 && (
                    <View style={styles.catSearchBox}>
                      <MaterialIcons name="search" size={16} color={Colors.light.textSecondary} />
                      <TextInput
                        style={styles.catSearchInput}
                        placeholder={t('transactions.searchCategory')}
                        placeholderTextColor={Colors.light.textSecondary}
                        value={searchCatQuery}
                        onChangeText={setSearchCatQuery}
                      />
                      {searchCatQuery ? (
                        <TouchableOpacity onPress={() => setSearchCatQuery('')}>
                          <MaterialIcons name="close" size={16} color={Colors.light.textSecondary} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}

                  {groups.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.groupPillsRow}
                    >
                      <TouchableOpacity
                        style={[
                          styles.groupPill,
                          selectedGroupFilter === 'all' && styles.activeGroupPill,
                        ]}
                        onPress={() => setSelectedGroupFilter('all')}
                      >
                        <MaterialIcons
                          name="apps"
                          size={14}
                          color={selectedGroupFilter === 'all' ? '#1A1C2E' : Colors.light.textSecondary}
                        />
                        <Text
                          style={[
                            styles.groupPillText,
                            selectedGroupFilter === 'all' && styles.activeGroupPillText,
                          ]}
                        >
                          {t('transactions.allCategories', { count: categories.length })}
                        </Text>
                      </TouchableOpacity>

                      {groups.map((group) => {
                        const count = categories.filter((category) => category.group_id === group.id).length;
                        const isSelected = selectedGroupFilter === group.id;
                        return (
                          <TouchableOpacity
                            key={group.id}
                            style={[styles.groupPill, isSelected && styles.activeGroupPill]}
                            onPress={() => setSelectedGroupFilter(group.id)}
                          >
                            <MaterialIcons
                              name={(group.icon as any) || 'folder'}
                              size={14}
                              color={isSelected ? '#1A1C2E' : group.color || Colors.light.textSecondary}
                            />
                            <Text
                              style={[
                                styles.groupPillText,
                                isSelected && styles.activeGroupPillText,
                              ]}
                            >
                              {group.name} ({count})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  {isAddingCustomCat ? (
                    <View style={styles.quickAddCatBox}>
                      <View style={styles.quickAddCatHeader}>
                        <Text style={styles.quickAddCatTitle}>
                          {t('transactions.addChildTo', {
                            group:
                              selectedGroupFilter === 'all'
                                ? groups[0]?.name || t('transactions.commonGroup')
                                : groups.find((group) => group.id === selectedGroupFilter)?.name || '',
                          })}
                        </Text>
                        <TouchableOpacity onPress={() => setIsAddingCustomCat(false)}>
                          <MaterialIcons name="close" size={18} color={Colors.light.textSecondary} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.quickAddCatInputRow}>
                        <TextInput
                          style={styles.quickAddCatInput}
                          placeholder={t('transactions.childPlaceholder')}
                          placeholderTextColor={Colors.light.textSecondary}
                          value={customCatName}
                          onChangeText={setCustomCatName}
                          autoFocus
                        />
                        <TouchableOpacity
                          style={styles.quickAddCatSubmitBtn}
                          disabled={creatingCustomCat || !customCatName.trim()}
                          onPress={handleCreateCustomCat}
                        >
                          <Text style={styles.quickAddCatSubmitText}>
                            {creatingCustomCat ? '...' : t('categories.add')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}

                  <ScrollView
                    style={styles.catGridScroll}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.categoryGridContainer}>
                      {filteredCategories.map((category) => {
                        const isSelected = category.id === selectedCategoryId;
                        const catColor = category.color || Colors.primaryDark;
                        return (
                          <TouchableOpacity
                            key={category.id}
                            style={[
                              styles.categoryGridItem,
                              isSelected && {
                                backgroundColor: Colors.primaryLight,
                                borderColor: Colors.primaryDark,
                              },
                            ]}
                            onPress={() => {
                              setSelectedCategoryId(category.id);
                              setIsCategoryExpanded(false);
                            }}
                          >
                            <MaterialIcons
                              name={(category.icon as any) || 'category'}
                              size={16}
                              color={isSelected ? Colors.primaryStrong : catColor}
                            />
                            <Text
                              style={[
                                styles.categoryGridText,
                                isSelected && styles.selectedCategoryChipText,
                              ]}
                              numberOfLines={1}
                            >
                              {category.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}

                      <TouchableOpacity
                        style={styles.addCustomCatBtn}
                        onPress={() => setIsAddingCustomCat(true)}
                      >
                        <MaterialIcons name="add" size={16} color={Colors.primaryDark} />
                        <Text style={styles.addCustomCatBtnText}>
                          {t('transactions.addChild')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        </Card>

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
          title={t('transactions.saveTransaction')}
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
    backgroundColor: Colors.primary,
  },
  activeIncome: {
    backgroundColor: Colors.primary,
  },
  activeText: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  amberBanner: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE082',
  },
  dangerBanner: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
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
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  fieldCard: {
    padding: 14,
    gap: 10,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  manageCategoryLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  datePresetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  datePresetBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
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
  customDateInput: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  catHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleCatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  categoryCardBody: {
    gap: 10,
  },
  selectedCategoryTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1.5,
  },
  selectedCatIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCatInfo: {
    flex: 1,
    gap: 2,
  },
  selectedCatName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  selectedCatGroup: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  noCatTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.light.border,
    justifyContent: 'center',
  },
  noCatText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  expandedCatPanel: {
    gap: 10,
    marginTop: 4,
  },
  catSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  catSearchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.text,
    padding: 0,
  },
  groupPillsRow: {
    gap: 6,
    paddingVertical: 2,
  },
  groupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundElement,
  },
  activeGroupPill: {
    backgroundColor: Colors.primary,
  },
  groupPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeGroupPillText: {
    color: '#1A1C2E',
    fontWeight: '700',
  },
  quickAddCatBox: {
    backgroundColor: Colors.primaryLight,
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  quickAddCatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickAddCatTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryStrong,
  },
  quickAddCatInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAddCatInput: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  quickAddCatSubmitBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddCatSubmitText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryStrong,
  },
  catGridScroll: {
    maxHeight: 180,
  },
  categoryGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: 'transparent',
    maxWidth: '48%',
  },
  categoryGridText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
    flexShrink: 1,
  },
  selectedCategoryChipText: {
    color: Colors.primaryStrong,
    fontWeight: '700',
  },
  addCustomCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primaryDark,
  },
  addCustomCatBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  emptyCatBox: {
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  emptyCatText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  seedCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  seedCatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1C2E',
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
