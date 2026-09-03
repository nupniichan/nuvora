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
import { MoneyInput } from '@/components/ui/money-input';
import { Colors } from '@/constants/theme';
import { getDatabase } from '@/database/database';
import { AccountRow, CategoryGroupRow, TransactionType } from '@/database/types';
import { createAccount, getAllAccounts } from '@/features/accounts/account-queries';
import { checkSpendingLimit } from '@/features/budgets/budget-queries';
import {
  CategoryWithGroup,
  createCategory,
  getAllCategories,
  getAllCategoryGroups,
} from '@/features/categories/category-queries';
import { seedStarterCategories } from '@/features/categories/starter-templates';
import { createTransaction } from '@/features/transactions/transaction-queries';
import { formatDateISO } from '@/shared/date-utils';
import { formatMoney } from '@/shared/money';

export default function AddTransactionModal() {
  const { t } = useTranslation();
  const router = useRouter();

  const [type, setType] = useState<TransactionType>('expense');
  const [amountMinor, setAmountMinor] = useState<number>(0);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [groups, setGroups] = useState<CategoryGroupRow[]>([]);
  const [categories, setCategories] = useState<CategoryWithGroup[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(formatDateISO(new Date()));
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Category presentation states (compact & group tabs)
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [searchCatQuery, setSearchCatQuery] = useState('');

  // Quick Inline Custom Category addition
  const [isAddingCustomCat, setIsAddingCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [creatingCustomCat, setCreatingCustomCat] = useState(false);

  // Spending limit warning
  const [limitWarning, setLimitWarning] = useState<{
    hasLimit: boolean;
    isOverLimit: boolean;
    percentUsed: number;
    limit: number;
    projectedTotal: number;
  } | null>(null);

  useEffect(() => {
    async function loadAccounts() {
      let accs = await getAllAccounts();
      if (accs.length === 0) {
        const defaultAcc = await createAccount({
          name: 'Tiền mặt',
          type: 'cash',
          currency: 'VND',
          initialBalance: 0,
        });
        accs = [defaultAcc];
      }
      setAccounts(accs);
      if (accs.length > 0) {
        setSelectedAccountId(accs[0].id);
        if (accs.length > 1) {
          setToAccountId(accs[1].id);
        }
      }
    }
    loadAccounts();
  }, []);

  useEffect(() => {
    async function loadCategories() {
      if (type !== 'transfer') {
        let [grps, cats] = await Promise.all([
          getAllCategoryGroups(type),
          getAllCategories(type),
        ]);
        if (grps.length === 0 || cats.length === 0) {
          try {
            const db = getDatabase();
            await seedStarterCategories(db, 'vi');
            [grps, cats] = await Promise.all([
              getAllCategoryGroups(type),
              getAllCategories(type),
            ]);
          } catch (err) {
            console.warn('Could not auto-seed categories:', err);
          }
        }
        setGroups(grps);
        setCategories(cats);
        if (cats.length > 0) {
          setSelectedCategoryId((prev) => (prev && cats.some((c) => c.id === prev) ? prev : cats[0].id));
        } else {
          setSelectedCategoryId(null);
        }
      } else {
        setGroups([]);
        setCategories([]);
        setSelectedCategoryId(null);
      }
    }
    loadCategories();
  }, [type]);

  const handleCreateCustomCat = async () => {
    if (!customCatName.trim()) return;
    const targetGroupId =
      (selectedGroupFilter !== 'all' ? selectedGroupFilter : groups[0]?.id) || '';
    if (!targetGroupId) return;

    const targetGroup = groups.find((g) => g.id === targetGroupId) || groups[0];
    setCreatingCustomCat(true);
    try {
      const created = await createCategory({
        groupId: targetGroup.id,
        name: customCatName.trim(),
        icon: targetGroup.icon || 'category',
        color: targetGroup.color || Colors.primaryDark,
      });
      const updatedCats = await getAllCategories(type);
      setCategories(updatedCats);
      setSelectedCategoryId(created.id);
      setCustomCatName('');
      setIsAddingCustomCat(false);
      setIsCategoryExpanded(false);
    } catch (e: any) {
      console.warn('Lỗi khi tạo danh mục tùy chỉnh', e);
    } finally {
      setCreatingCustomCat(false);
    }
  };

  const filteredCategories = categories.filter((cat) => {
    const matchesGroup =
      selectedGroupFilter === 'all' ||
      cat.group_id === selectedGroupFilter ||
      cat.group_name === selectedGroupFilter;
    const matchesSearch =
      !searchCatQuery.trim() ||
      cat.name.toLowerCase().includes(searchCatQuery.toLowerCase().trim()) ||
      cat.group_name.toLowerCase().includes(searchCatQuery.toLowerCase().trim());
    return matchesGroup && matchesSearch;
  });

  // Real-time limit check
  useEffect(() => {
    async function checkLimit() {
      if (type === 'expense' && selectedCategoryId && amountMinor > 0) {
        const d = new Date(date);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const res = await checkSpendingLimit(selectedCategoryId, y, m, amountMinor);
        if (res.hasLimit) {
          setLimitWarning({
            hasLimit: true,
            isOverLimit: res.isOverLimit,
            percentUsed: res.percentUsed,
            limit: res.limit,
            projectedTotal: res.projectedTotal,
          });
        } else {
          setLimitWarning(null);
        }
      } else {
        setLimitWarning(null);
      }
    }
    checkLimit();
  }, [type, selectedCategoryId, amountMinor, date]);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId);
  const currency = activeAccount ? activeAccount.currency : 'VND';
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const handleDatePreset = (preset: 'today' | 'yesterday' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setDate(formatDateISO(now));
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setDate(formatDateISO(y));
    }
  };

  const handleSave = async () => {
    if (amountMinor <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (!selectedAccountId) {
      setError('Vui lòng chọn tài khoản');
      return;
    }
    if (type === 'transfer') {
      if (!toAccountId || toAccountId === selectedAccountId) {
        setError('Vui lòng chọn tài khoản đích khác tài khoản nguồn');
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      await createTransaction({
        type,
        amount: amountMinor,
        currency,
        accountId: selectedAccountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        categoryId: type !== 'transfer' ? (selectedCategoryId || undefined) : undefined,
        note: note || undefined,
        date,
      });

      router.back();
    } catch (e: any) {
      setError(e.message || 'Lỗi khi lưu giao dịch');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ghi chép Giao dịch</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Transaction Type Segment */}
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, type === 'expense' && styles.activeExpense]}
            onPress={() => setType('expense')}
          >
            <Text style={[styles.segmentText, type === 'expense' && styles.activeText]}>
              Chi tiêu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, type === 'income' && styles.activeIncome]}
            onPress={() => setType('income')}
          >
            <Text style={[styles.segmentText, type === 'income' && styles.activeText]}>
              Thu nhập
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, type === 'transfer' && styles.activeTransfer]}
            onPress={() => setType('transfer')}
          >
            <Text style={[styles.segmentText, type === 'transfer' && styles.activeText]}>
              Chuyển khoản
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <MoneyInput
          label="Số tiền"
          currency={currency}
          valueMinor={amountMinor}
          onChangeMinor={setAmountMinor}
        />

        {/* Spending Limit Warning Banner */}
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
                  ? 'Vượt hạn mức chi tiêu!'
                  : `Đạt ${limitWarning.percentUsed}% hạn mức`}
              </Text>
              <Text style={styles.warningSub}>
                Hạn mức {selectedCategory?.name}: {formatMoney(limitWarning.limit, 'VND')} (Dự kiến: {formatMoney(limitWarning.projectedTotal, 'VND')})
              </Text>
            </View>
          </View>
        )}

        {/* Date Selector */}
        <Card style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>Ngày ghi nhận</Text>
          <View style={styles.datePresetRow}>
            <TouchableOpacity
              style={[styles.datePresetBtn, datePreset === 'today' && styles.activeDatePreset]}
              onPress={() => handleDatePreset('today')}
            >
              <Text style={[styles.datePresetText, datePreset === 'today' && styles.activeDatePresetText]}>
                Hôm nay
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.datePresetBtn, datePreset === 'yesterday' && styles.activeDatePreset]}
              onPress={() => handleDatePreset('yesterday')}
            >
              <Text style={[styles.datePresetText, datePreset === 'yesterday' && styles.activeDatePresetText]}>
                Hôm qua
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.datePresetBtn, datePreset === 'custom' && styles.activeDatePreset]}
              onPress={() => setDatePreset('custom')}
            >
              <Text style={[styles.datePresetText, datePreset === 'custom' && styles.activeDatePresetText]}>
                Ngày khác
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

        {/* Source Account Selector */}
        <Card style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>Tài khoản thanh toán</Text>
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
                    size={16}
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

        {/* Target Account Selector for Transfer */}
        {type === 'transfer' ? (
          <Card style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Tài khoản nhận</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
              {accounts
                .filter((a) => a.id !== selectedAccountId)
                .map((acc) => {
                  const isSelected = acc.id === toAccountId;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[styles.chip, isSelected && styles.selectedChip]}
                      onPress={() => setToAccountId(acc.id)}
                    >
                      <MaterialIcons
                        name={(acc.icon as any) || 'account-balance'}
                        size={16}
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
        ) : null}

        {/* Category Selector for Income / Expense (Compact & Expandable with Group Pills) */}
        {type !== 'transfer' && (
          <Card style={styles.fieldCard}>
            <View style={styles.fieldHeaderRow}>
              <Text style={styles.fieldLabel}>Danh mục</Text>
              <View style={styles.catHeaderRight}>
                <TouchableOpacity onPress={() => setIsCategoryExpanded(!isCategoryExpanded)}>
                  <Text style={styles.toggleCatBtnText}>
                    {isCategoryExpanded ? 'Thu gọn ▲' : 'Đổi danh mục ▼'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/(modal)/manage-categories' as any)}>
                  <Text style={styles.manageCategoryLink}>+ Quản lý</Text>
                </TouchableOpacity>
              </View>
            </View>

            {categories.length === 0 ? (
              <View style={styles.emptyCatBox}>
                <Text style={styles.emptyCatText}>Chưa có danh mục cho loại giao dịch này</Text>
                <TouchableOpacity
                  style={styles.seedCatBtn}
                  onPress={async () => {
                    const db = getDatabase();
                    await seedStarterCategories(db, 'vi');
                    const cats = await getAllCategories(type);
                    setCategories(cats);
                    if (cats.length > 0) setSelectedCategoryId(cats[0].id);
                  }}
                >
                  <MaterialIcons name="auto-awesome" size={16} color="#1A1C2E" />
                  <Text style={styles.seedCatBtnText}>Tạo danh mục mẫu</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.categoryCardBody}>
                {/* 1. Selected Category Highlight Tile (Compact view) */}
                {selectedCategory ? (
                  <TouchableOpacity
                    style={[
                      styles.selectedCategoryTile,
                      { borderColor: selectedCategory.color || Colors.primaryDark },
                    ]}
                    onPress={() => setIsCategoryExpanded(!isCategoryExpanded)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.selectedCatIconBadge,
                        { backgroundColor: selectedCategory.color || Colors.primaryDark },
                      ]}
                    >
                      <MaterialIcons
                        name={(selectedCategory.icon as any) || 'category'}
                        size={20}
                        color="#FFFFFF"
                      />
                    </View>

                    <View style={styles.selectedCatInfo}>
                      <Text style={styles.selectedCatName}>{selectedCategory.name}</Text>
                      <Text style={styles.selectedCatGroup}>{selectedCategory.group_name}</Text>
                    </View>

                    <View style={styles.changeBadge}>
                      <Text style={styles.changeBadgeText}>
                        {isCategoryExpanded ? 'Đang chọn' : 'Đổi'}
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
                    <Text style={styles.noCatText}>Chọn một danh mục...</Text>
                  </TouchableOpacity>
                )}

                {/* 2. Expanded Category Selector Panel with Group Tabs & Search */}
                {isCategoryExpanded && (
                  <View style={styles.expandedCatPanel}>
                    {/* Search input if more than 6 categories */}
                    {categories.length > 6 && (
                      <View style={styles.catSearchBox}>
                        <MaterialIcons name="search" size={16} color={Colors.light.textSecondary} />
                        <TextInput
                          style={styles.catSearchInput}
                          placeholder="Tìm nhanh danh mục..."
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

                    {/* Group Filter Tabs / Pills (Danh mục tổng) */}
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
                            Tất cả ({categories.length})
                          </Text>
                        </TouchableOpacity>

                        {groups.map((grp) => {
                          const count = categories.filter((c) => c.group_id === grp.id).length;
                          const isSelected = selectedGroupFilter === grp.id;
                          return (
                            <TouchableOpacity
                              key={grp.id}
                              style={[styles.groupPill, isSelected && styles.activeGroupPill]}
                              onPress={() => setSelectedGroupFilter(grp.id)}
                            >
                              <MaterialIcons
                                name={(grp.icon as any) || 'folder'}
                                size={14}
                                color={isSelected ? '#1A1C2E' : grp.color || Colors.light.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.groupPillText,
                                  isSelected && styles.activeGroupPillText,
                                ]}
                              >
                                {grp.name} ({count})
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}

                    {/* Quick Inline Custom Category Form */}
                    {isAddingCustomCat ? (
                      <View style={styles.quickAddCatBox}>
                        <View style={styles.quickAddCatHeader}>
                          <Text style={styles.quickAddCatTitle}>
                            Thêm danh mục con vào "
                            {selectedGroupFilter === 'all'
                              ? groups[0]?.name || 'Nhóm chung'
                              : groups.find((g) => g.id === selectedGroupFilter)?.name || ''}
                            "
                          </Text>
                          <TouchableOpacity onPress={() => setIsAddingCustomCat(false)}>
                            <MaterialIcons name="close" size={18} color={Colors.light.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.quickAddCatInputRow}>
                          <TextInput
                            style={styles.quickAddCatInput}
                            placeholder="Nhập tên danh mục con (ví dụ: Ăn vặt, Tiền gửi xe...)"
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
                              {creatingCustomCat ? '...' : 'Thêm'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}

                    {/* Category Grid Items */}
                    <ScrollView
                      style={styles.catGridScroll}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={styles.categoryGridContainer}>
                        {filteredCategories.map((cat) => {
                          const isSelected = cat.id === selectedCategoryId;
                          const catColor = cat.color || Colors.primaryDark;
                          return (
                            <TouchableOpacity
                              key={cat.id}
                              style={[
                                styles.categoryGridItem,
                                isSelected && {
                                  backgroundColor: catColor,
                                  borderColor: catColor,
                                },
                              ]}
                              onPress={() => {
                                setSelectedCategoryId(cat.id);
                                setIsCategoryExpanded(false);
                              }}
                            >
                              <MaterialIcons
                                name={(cat.icon as any) || 'category'}
                                size={16}
                                color={isSelected ? '#FFFFFF' : catColor}
                              />
                              <Text
                                style={[
                                  styles.categoryGridText,
                                  isSelected && styles.selectedCategoryChipText,
                                ]}
                                numberOfLines={1}
                              >
                                {cat.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}

                        {/* Button to add custom category */}
                        <TouchableOpacity
                          style={styles.addCustomCatBtn}
                          onPress={() => setIsAddingCustomCat(true)}
                        >
                          <MaterialIcons name="add" size={16} color={Colors.primaryDark} />
                          <Text style={styles.addCustomCatBtnText}>+ Thêm con</Text>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </Card>
        )}

        {/* Note Input with quick suggestions */}
        <Card style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>Ghi chú</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Ví dụ: Tiền điện tháng 9, Ăn trưa đồng nghiệp, Thưởng quý..."
            placeholderTextColor={Colors.light.textSecondary}
            value={note}
            onChangeText={setNote}
          />
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Lưu giao dịch"
          onPress={handleSave}
          variant="primary"
          loading={loading}
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
  activeTransfer: {
    backgroundColor: '#E3F2FD',
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
  chipList: {
    gap: 8,
    paddingVertical: 2,
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
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
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
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCatInfo: {
    flex: 1,
    gap: 2,
  },
  selectedCatName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  selectedCatGroup: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.primaryFaded,
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
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  noCatText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  expandedCatPanel: {
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  catSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeGroupPill: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
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
  catGridScroll: {
    maxHeight: 200,
  },
  categoryGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  categoryGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: 'transparent',
    maxWidth: '48%',
  },
  quickAddCatBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1.5,
    borderColor: Colors.primary,
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
    color: Colors.light.text,
  },
  quickAddCatInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  quickAddCatInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickAddCatSubmitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1C2E',
  },
  addCustomCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primaryFaded,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  addCustomCatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  emptyCatBox: {
    paddingVertical: 16,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  seedCatBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1C2E',
  },
  noteInput: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.light.text,
  },
  errorText: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
});
