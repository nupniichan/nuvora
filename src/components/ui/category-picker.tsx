import { useTheme } from '@/hooks/use-theme';
import { createCategoryPickerStyles } from './category-picker.styles';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleProp,
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
  onSelectCategory: (categoryId: string | null, category?: CategoryWithGroup) => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
  allowClear?: boolean;
  onCategoriesLoaded?: (categories: CategoryWithGroup[]) => void;
}

export function CategoryPicker({
  type,
  selectedCategoryId,
  onSelectCategory,
  label,
  style,
  allowClear = false,
  onCategoriesLoaded,
}: CategoryPickerProps) {
  const theme = useTheme();
  const styles = createCategoryPickerStyles(theme);
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

  const onSelectCategoryRef = useRef(onSelectCategory);
  const onCategoriesLoadedRef = useRef(onCategoriesLoaded);
  const selectedCategoryIdRef = useRef(selectedCategoryId);

  useEffect(() => {
    onSelectCategoryRef.current = onSelectCategory;
    onCategoriesLoadedRef.current = onCategoriesLoaded;
    selectedCategoryIdRef.current = selectedCategoryId;
  });

  const loadCategories = useCallback(async () => {
    try {
      const [categoryGroups, categoryList] = await Promise.all([
        getAllCategoryGroups(type),
        getAllCategories(type),
      ]);
      setGroups(categoryGroups);
      setCategories(categoryList);
      onCategoriesLoadedRef.current?.(categoryList);

      const currentId = selectedCategoryIdRef.current;
      const validSelected = currentId && categoryList.some((category) => category.id === currentId);

      if (!validSelected && categoryList.length > 0 && !allowClear) {
        onSelectCategoryRef.current(categoryList[0].id, categoryList[0]);
      } else if (validSelected) {
        const activeCat = categoryList.find((category) => category.id === currentId);
        if (activeCat) {
          onSelectCategoryRef.current(activeCat.id, activeCat);
        }
      }

      setSelectedGroupFilter((previousGroupId) =>
        previousGroupId === 'all' || categoryGroups.some((group) => group.id === previousGroupId)
          ? previousGroupId
          : 'all'
      );
    } catch (e) {
      console.warn('Failed to load categories', e);
    }
  }, [type, allowClear]);

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
      onCategoriesLoadedRef.current?.(updatedCategories);
      const createdWithGroup = updatedCategories.find((category) => category.id === created.id);
      onSelectCategoryRef.current(created.id, createdWithGroup);
      setCustomCatName('');
      setIsAddingCustomCat(false);
      setIsCategoryExpanded(false);
    } catch (createError: any) {
      console.warn('Could not create custom category', createError);
    } finally {
      setCreatingCustomCat(false);
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
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
  }, [categories, selectedGroupFilter, searchCatQuery]);

  const selectedCategory = useMemo(() => {
    return categories.find((category) => category.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  return (
    <Card style={[styles.fieldCard, style]}>
      <View style={styles.fieldHeaderRow}>
        <Text style={styles.fieldLabel}>{label || t('transactions.category')}</Text>
        <View style={styles.catHeaderRight}>
          {allowClear && selectedCategoryId && (
            <TouchableOpacity onPress={() => onSelectCategoryRef.current(null, undefined)}>
              <Text style={styles.clearCatText}>{t('common.removeSelection')}</Text>
            </TouchableOpacity>
          )}
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
                          onSelectCategoryRef.current(category.id, category);
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
