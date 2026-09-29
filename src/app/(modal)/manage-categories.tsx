import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ColorPicker, PRESET_COLORS } from '@/components/ui/color-picker';
import { IconPicker } from '@/components/ui/icon-picker';
import { Colors } from '@/constants/theme';
import { getDatabase } from '@/database/database';
import { CategoryGroupRow, CategoryRow, CategoryType } from '@/database/types';
import {
  archiveCategory,
  archiveCategoryGroup,
  createCategory,
  createCategoryGroup,
  deleteCategory,
  getAllCategories,
  getAllCategoryGroups,
  getCategoryTransactionCount,
  updateCategory,
  updateCategoryGroup,
} from '@/features/categories/category-queries';
import {
  STARTER_TEMPLATES,
  StarterGroupTemplate,
  seedSingleGroupTemplate,
  seedStarterCategories,
} from '@/features/categories/starter-templates';
import { useSafeBack } from '@/hooks/use-safe-back';
import { alertMessage, confirmAction } from '@/shared/dialog';

export default function ManageCategoriesModal() {
  const { t, i18n } = useTranslation();
  const closeModal = useSafeBack('/(main)/more');

  const [groups, setGroups] = useState<CategoryGroupRow[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [addingTemplate, setAddingTemplate] = useState(false);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState<string>('category');
  const [catColor, setCatColor] = useState<string>(PRESET_COLORS[0]);

  const loadData = useCallback(async () => {
    try {
      const grps = await getAllCategoryGroups();
      const cats = await getAllCategories();
      setGroups(grps);
      setCategories(cats);
    } catch (e) {
      console.warn('Lỗi tải danh mục', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getAllCategoryGroups(), getAllCategories()])
      .then(([grps, cats]) => {
        if (!active) return;
        setGroups(grps);
        setCategories(cats);
      })
      .catch((error) => console.warn('Could not load categories', error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openAddCategory = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    setSelectedGroupId(groupId);
    setEditingCategory(null);
    setCatName('');
    setCatIcon('category');
    setCatColor(group?.color || PRESET_COLORS[0]);
    setCategoryModalVisible(true);
  };

  const openEditCategory = (cat: CategoryRow) => {
    setEditingCategory(cat);
    setSelectedGroupId(cat.group_id);
    setCatName(cat.name);
    setCatIcon(cat.icon || 'category');
    setCatColor(cat.color || PRESET_COLORS[0]);
    setCategoryModalVisible(true);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      Alert.alert(t('common.notice'), t('categories.nameRequired'));
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: catName.trim(),
          icon: catIcon,
          color: catColor,
          groupId: selectedGroupId,
        });
      } else {
        await createCategory({
          groupId: selectedGroupId,
          name: catName.trim(),
          icon: catIcon,
          color: catColor,
        });
      }
      setCategoryModalVisible(false);
      await loadData();
    } catch (e: any) {
      alertMessage(t('common.error'), e.message || t('categories.saveError'));
    }
  };

  const handleDeleteCategory = async (cat: CategoryRow) => {
    const txCount = await getCategoryTransactionCount(cat.id);
    if (txCount > 0) {
      confirmAction(
        t('categories.archiveTitle'),
        t('categories.archiveDescription', { name: cat.name, count: txCount }),
        async () => {
          await archiveCategory(cat.id);
          await loadData();
        },
        t('categories.archiveConfirm'),
        t('common.cancel')
      );
    } else {
      confirmAction(
        t('categories.deleteTitle'),
        t('categories.deleteDescription', { name: cat.name }),
        async () => {
          await deleteCategory(cat.id);
          await loadData();
        },
        t('common.delete'),
        t('common.cancel')
      );
    }
  };

  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CategoryGroupRow | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState<CategoryType>('expense');
  const [groupIcon, setGroupIcon] = useState<string>('folder');
  const [groupColor, setGroupColor] = useState<string>(PRESET_COLORS[5]);

  const openAddGroup = () => {
    setEditingGroup(null);
    setGroupName('');
    setGroupType('expense');
    setGroupIcon('folder');
    setGroupColor(PRESET_COLORS[5]);
    setGroupModalVisible(true);
  };

  const openEditGroup = (group: CategoryGroupRow) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupType(group.type);
    setGroupIcon(group.icon || 'folder');
    setGroupColor(group.color || PRESET_COLORS[5]);
    setGroupModalVisible(true);
  };

  const handleDeleteGroup = (group: CategoryGroupRow) => {
    confirmAction(
      t('categories.deleteGroupTitle'),
      t('categories.deleteGroupDescription', { name: group.name }),
      async () => {
        await archiveCategoryGroup(group.id);
        await loadData();
      },
      t('categories.deleteGroup'),
      t('common.cancel')
    );
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      alertMessage(t('common.notice'), t('categories.groupNameRequired'));
      return;
    }

    try {
      if (editingGroup) {
        await updateCategoryGroup(editingGroup.id, {
          name: groupName.trim(),
          type: groupType,
          icon: groupIcon,
          color: groupColor,
        });
      } else {
        await createCategoryGroup({
          name: groupName.trim(),
          type: groupType,
          icon: groupIcon,
          color: groupColor,
        });
      }
      setGroupModalVisible(false);
      await loadData();
    } catch (e: any) {
      alertMessage(t('common.error'), e.message || t('categories.saveGroupError'));
    }
  };

  const handleAddTemplate = async (template: StarterGroupTemplate) => {
    setAddingTemplate(true);
    try {
      const db = getDatabase();
      const language = i18n.resolvedLanguage === 'en' ? 'en' : 'vi';
      await seedSingleGroupTemplate(db, template, language);
      await loadData();
      const templateName = i18n.resolvedLanguage === 'en' ? template.nameEn : template.nameVi;
      alertMessage(
        t('common.success'),
        t('categories.templateCreated', {
          name: templateName,
          count: template.categories.length,
        })
      );
    } catch (e: any) {
      alertMessage(t('common.error'), e.message || t('categories.templateCreateError'));
    } finally {
      setAddingTemplate(false);
    }
  };

  const handleAddAllTemplates = () => {
    confirmAction(
      t('categories.addAllTitle'),
      t('categories.addAllConfirm'),
      async () => {
        setAddingTemplate(true);
        try {
          const db = getDatabase();
          await seedStarterCategories(db, i18n.resolvedLanguage === 'en' ? 'en' : 'vi');
          await loadData();
          setTemplateModalVisible(false);
          alertMessage(t('common.success'), t('categories.allCreated'));
        } catch (e: any) {
          alertMessage(t('common.error'), e.message || t('categories.allCreateError'));
        } finally {
          setAddingTemplate(false);
        }
      },
      t('categories.addAll'),
      t('common.cancel')
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('categories.title')}</Text>
        <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator color={Colors.primaryStrong} /> : null}
        <View style={styles.topActions}>
          <Button
            title={t('categories.addGroup')}
            variant="outline"
            icon={<MaterialIcons name="create-new-folder" size={18} color={Colors.primaryDark} />}
            onPress={openAddGroup}
            style={styles.actionBtnHalf}
          />
          <Button
            title={t('categories.templates')}
            variant="primary"
            icon={<MaterialIcons name="auto-awesome" size={18} color="#1A1C2E" />}
            onPress={() => setTemplateModalVisible(true)}
            style={styles.actionBtnHalf}
          />
        </View>

        {groups.map((group) => {
          const groupCats = categories.filter((c) => c.group_id === group.id);
          const isIncome = group.type === 'income';

          return (
            <Card key={group.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View
                  style={[
                    styles.groupIconBadge,
                    { backgroundColor: group.color || Colors.primaryDark },
                  ]}
                >
                  <MaterialIcons
                    name={(group.icon as any) || (isIncome ? 'account-balance-wallet' : 'folder')}
                    size={18}
                    color="#FFFFFF"
                  />
                </View>

                <View style={styles.groupTitleInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupSubtitle}>
                    {t(isIncome ? 'categories.incomeFlow' : 'categories.expenseFlow')} · {t('categories.categoryCount', { count: groupCats.length })}
                  </Text>
                </View>

                <View style={styles.groupActionBtns}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => openEditGroup(group)}
                  >
                    <MaterialIcons name="edit" size={18} color={Colors.light.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleDeleteGroup(group)}
                  >
                    <MaterialIcons name="delete-outline" size={18} color={Colors.expense} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addCategoryChip}
                    onPress={() => openAddCategory(group.id)}
                  >
                    <MaterialIcons name="add" size={16} color={Colors.primaryDark} />
                    <Text style={styles.addCategoryText}>{t('categories.add')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.categoryList}>
                {groupCats.length === 0 ? (
                  <Text style={styles.emptyGroupText}>{t('categories.emptyGroup')}</Text>
                ) : (
                  groupCats.map((cat) => (
                    <View key={cat.id} style={styles.categoryItem}>
                      <View
                        style={[
                          styles.catColorDot,
                          { backgroundColor: cat.color || Colors.primaryDark },
                        ]}
                      >
                        <MaterialIcons
                          name={(cat.icon as any) || 'category'}
                          size={14}
                          color="#FFFFFF"
                        />
                      </View>

                      <Text style={styles.catName} numberOfLines={1}>
                        {cat.name}
                      </Text>

                      <View style={styles.catActions}>
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => openEditCategory(cat)}
                        >
                          <MaterialIcons name="edit" size={18} color={Colors.light.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => handleDeleteCategory(cat)}
                        >
                          <MaterialIcons name="delete-outline" size={18} color={Colors.expense} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </Card>
          );
        })}
      </ScrollView>

      {}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <SafeAreaView style={styles.modalRoot} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t(editingCategory ? 'categories.editCategory' : 'categories.newCategory')}
            </Text>
            <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
              <MaterialIcons name="close" size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('categories.categoryName')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('categories.categoryPlaceholder')}
                placeholderTextColor={Colors.light.textSecondary}
                value={catName}
                onChangeText={setCatName}
              />
            </View>

            {}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('categories.belongsTo')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {groups.map((grp) => {
                  const isSelected = grp.id === selectedGroupId;
                  return (
                    <TouchableOpacity
                      key={grp.id}
                      style={[styles.groupSelectChip, isSelected && styles.selectedGroupSelectChip]}
                      onPress={() => setSelectedGroupId(grp.id)}
                    >
                      <Text style={[styles.groupSelectText, isSelected && styles.selectedGroupSelectText]}>
                        {grp.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {}
            <ColorPicker
              label={t('categories.pickColor')}
              selectedColor={catColor}
              onSelectColor={setCatColor}
            />

            {}
            <IconPicker
              label={t('categories.pickIcon')}
              selectedIcon={catIcon}
              selectedColor={catColor}
              onSelectIcon={setCatIcon}
            />

            {}
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>{t('categories.preview')}</Text>
              <View style={styles.previewRow}>
                <View style={[styles.previewBadge, { backgroundColor: catColor }]}>
                  <MaterialIcons name={(catIcon as any) || 'category'} size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.previewName}>{catName || t('categories.previewName')}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={t('categories.saveCategory')}
              variant="primary"
              onPress={handleSaveCategory}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {}
      <Modal
        visible={groupModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setGroupModalVisible(false)}
      >
        <SafeAreaView style={styles.modalRoot} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('categories.newGroup')}</Text>
            <TouchableOpacity onPress={() => setGroupModalVisible(false)}>
              <MaterialIcons name="close" size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('categories.groupName')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('categories.groupPlaceholder')}
                placeholderTextColor={Colors.light.textSecondary}
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('categories.cashflowType')}</Text>
              <View style={styles.flowTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.flowTypeBtn,
                    groupType === 'expense' && styles.activeExpenseFlow,
                  ]}
                  onPress={() => setGroupType('expense')}
                >
                  <MaterialIcons
                    name="arrow-downward"
                    size={16}
                    color={groupType === 'expense' ? Colors.expense : Colors.light.textSecondary}
                  />
                  <Text style={[styles.flowTypeText, groupType === 'expense' && styles.activeFlowText]}>
                    {t('categories.expenseFlowFull')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.flowTypeBtn,
                    groupType === 'income' && styles.activeIncomeFlow,
                  ]}
                  onPress={() => setGroupType('income')}
                >
                  <MaterialIcons
                    name="arrow-upward"
                    size={16}
                    color={groupType === 'income' ? Colors.income : Colors.light.textSecondary}
                  />
                  <Text style={[styles.flowTypeText, groupType === 'income' && styles.activeFlowText]}>
                    {t('categories.incomeFlowFull')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <ColorPicker
              label={t('categories.pickGroupColor')}
              selectedColor={groupColor}
              onSelectColor={setGroupColor}
            />

            <IconPicker
              label={t('categories.pickGroupIcon')}
              selectedIcon={groupIcon}
              selectedColor={groupColor}
              onSelectIcon={setGroupIcon}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={t('categories.createGroup')}
              variant="primary"
              onPress={handleSaveGroup}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {}
      <Modal
        visible={templateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTemplateModalVisible(false)}
      >
        <SafeAreaView style={styles.modalRoot} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{t('categories.templateTitle')}</Text>
              <Text style={styles.modalSubtitle}>{t('categories.templateSubtitle')}</Text>
            </View>
            <TouchableOpacity onPress={() => setTemplateModalVisible(false)}>
              <MaterialIcons name="close" size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.templateModalContent}>
            <TouchableOpacity
              style={styles.addAllTemplatesBanner}
              activeOpacity={0.8}
              onPress={handleAddAllTemplates}
            >
              <View style={styles.addAllLeft}>
                <View style={styles.addAllIconBadge}>
                  <MaterialIcons name="auto-awesome" size={20} color="#1A1C2E" />
                </View>
                <View style={styles.addAllTextContainer}>
                  <Text style={styles.addAllTitle}>
                    {t('categories.addAllCount', { count: STARTER_TEMPLATES.length })}
                  </Text>
                  <Text style={styles.addAllSub}>{t('categories.addAllDescription')}</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={Colors.light.textSecondary} />
            </TouchableOpacity>

            <Text style={styles.templateSectionHeading}>{t('categories.templateList')}</Text>

            {STARTER_TEMPLATES.map((tmpl, idx) => {
              const alreadyExists = groups.some(
                (g) => g.name.toLowerCase().trim() === tmpl.nameVi.toLowerCase().trim()
              );

              return (
                <Card key={idx} style={styles.templateCard}>
                  <View style={styles.templateCardHeader}>
                    <View
                      style={[
                        styles.groupIconBadge,
                        { backgroundColor: tmpl.color || Colors.primaryDark },
                      ]}
                    >
                      <MaterialIcons name={(tmpl.icon as any) || 'folder'} size={18} color="#FFFFFF" />
                    </View>

                    <View style={styles.templateHeaderInfo}>
                      <Text style={styles.templateName}>{i18n.resolvedLanguage === 'en' ? tmpl.nameEn : tmpl.nameVi}</Text>
                      <View style={styles.templateTypeBadgeRow}>
                        <View
                          style={[
                            styles.templateTypeBadge,
                            tmpl.type === 'income' ? styles.incomeBadge : styles.expenseBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.templateTypeBadgeText,
                              tmpl.type === 'income' ? styles.incomeBadgeText : styles.expenseBadgeText,
                            ]}
                          >
                            {t(`transactions.${tmpl.type}`)}
                          </Text>
                        </View>
                        <Text style={styles.templateCatCount}>
                          {t('categories.childCount', { count: tmpl.categories.length })}
                        </Text>
                      </View>
                    </View>

                    {alreadyExists ? (
                      <View style={styles.alreadyExistsBadge}>
                        <MaterialIcons name="check" size={14} color="#2E7D32" />
                        <Text style={styles.alreadyExistsText}>{t('categories.alreadyAdded')}</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addSingleTemplateBtn}
                        disabled={addingTemplate}
                        onPress={() => handleAddTemplate(tmpl)}
                      >
                        <MaterialIcons name="add" size={16} color="#1A1C2E" />
                        <Text style={styles.addSingleTemplateBtnText}>{t('categories.add')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.templateCatWrap}>
                    {tmpl.categories.map((c, cIdx) => (
                      <View key={cIdx} style={styles.templateCatChip}>
                        <View style={[styles.templateCatDot, { backgroundColor: c.color }]} />
                        <Text style={styles.templateCatText}>{i18n.resolvedLanguage === 'en' ? c.nameEn : c.nameVi}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  topActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  actionBtnHalf: {
    flex: 1,
  },
  addGroupBtn: {
    alignSelf: 'flex-start',
  },
  groupCard: {
    padding: 16,
    gap: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitleInfo: {
    flex: 1,
    gap: 2,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  groupSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  groupActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 6,
  },
  addCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.primaryFaded,
  },
  addCategoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  categoryList: {
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  emptyGroupText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  catColorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  catActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  modalContent: {
    padding: 20,
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 2,
  },
  groupSelectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundElement,
  },
  selectedGroupSelectChip: {
    backgroundColor: Colors.primary,
  },
  groupSelectText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  selectedGroupSelectText: {
    color: '#1A1C2E',
    fontWeight: '800',
  },
  previewCard: {
    padding: 14,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    gap: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  flowTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flowTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeExpenseFlow: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  activeIncomeFlow: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  flowTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeFlowText: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  templateModalContent: {
    padding: 20,
    gap: 14,
  },
  addAllTemplatesBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.primaryFaded,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  addAllLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  addAllIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addAllTextContainer: {
    flex: 1,
    gap: 2,
  },
  addAllTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C2E',
  },
  addAllSub: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  templateSectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  templateCard: {
    padding: 14,
    gap: 12,
  },
  templateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  templateHeaderInfo: {
    flex: 1,
    gap: 3,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  templateTypeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expenseBadge: {
    backgroundColor: '#FFEBEE',
  },
  incomeBadge: {
    backgroundColor: '#E8F5E9',
  },
  templateTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  expenseBadgeText: {
    color: Colors.expense,
  },
  incomeBadgeText: {
    color: Colors.income,
  },
  templateCatCount: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  alreadyExistsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
  },
  alreadyExistsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  addSingleTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  addSingleTemplateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1C2E',
  },
  templateCatWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  templateCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.light.backgroundElement,
  },
  templateCatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  templateCatText: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '500',
  },
});
