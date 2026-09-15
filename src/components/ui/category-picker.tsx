import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { getDatabase } from '@/database/database';
import { CategoryGroupRow, EntryType } from '@/database/types';
import {
  CategoryWithGroup,
  createCategory,
  getAllCategories,
  getAllCategoryGroups,
} from '@/features/categories/category-queries';
import { seedStarterCategories } from '@/features/categories/starter-templates';

export interface CategoryPickerProps {
  type: EntryType;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string, category?: CategoryWithGroup) => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
  onCategoriesLoaded?: (categories: CategoryWithGroup[]) => void;
}

export function CategoryPicker({
  type,
  selectedCategoryId,
  onSelectCategory,
  label,
  style,
  onCategoriesLoaded,
}: CategoryPickerProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [groups, setGroups] = useState<CategoryGroupRow[]>([]);
  const [categories, setCategories] = useState<CategoryWithGroup[]>([]);
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [searchCatQuery, setSearchCatQuery] = useState('');

  const [isAddingCustomCat, setIsAddingCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [creatingCustomCat, setCreatingCustomCat] = useState(false);

  const loadCategories = useCallback(async () => {
    const [categoryGroups, categoryList] = await Promise.all([
      getAllCategoryGroups(type),
      getAllCategories(type),
    ]);
    setGroups(categoryGroups);
    setCategories(categoryList);
    onCategoriesLoaded?.(categoryList);

    const validSelected =
      selectedCategoryId && categoryList.some((category) => category.id === selectedCategoryId);
    if (!validSelected && categoryList.length > 0) {
      onSelectCategory(categoryList[0].id, categoryList[0]);
    } else if (validSelected) {
      const activeCat = categoryList.find((category) => category.id === selectedCategoryId);
      if (activeCat) {
        onSelectCategory(activeCat.id, activeCat);
      }
    }

    setSelectedGroupFilter((previousGroupId) =>
      previousGroupId === 'all' || categoryGroups.some((group) => group.id === previousGroupId)
        ? previousGroupId
        : 'all'
    );
  }, [type, selectedCategoryId, onSelectCategory, onCategoriesLoaded]);

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
      onCategoriesLoaded?.(updatedCategories);
      const createdWithGroup = updatedCategories.find((category) => category.id === created.id);
      onSelectCategory(created.id, createdWithGroup);
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

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);

  return (
    <Card style={[styles.fieldCard, style]}>
      <View style={styles.fieldHeaderRow}>
        <Text style={styles.fieldLabel}>{label || t('transactions.category')}</Text>
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
                          onSelectCategory(category.id, category);
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
  );
}

const styles = StyleSheet.create({
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
  manageCategoryLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
    textDecorationLine: 'underline',
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
});
