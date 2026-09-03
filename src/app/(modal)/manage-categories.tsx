import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
import { alertMessage, confirmAction } from '@/shared/dialog';

export default function ManageCategoriesModal() {
  const { t } = useTranslation();
  const router = useRouter();

  const [groups, setGroups] = useState<CategoryGroupRow[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Template Modal State
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [addingTemplate, setAddingTemplate] = useState(false);

  // Category Edit / Create state
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
    let isMounted = true;
    (async () => {
      try {
        const grps = await getAllCategoryGroups();
        const cats = await getAllCategories();
        if (isMounted) {
          setGroups(grps);
          setCategories(cats);
          setLoading(false);
        }
      } catch (e) {
        console.warn('Lỗi tải danh mục', e);
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
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
      Alert.alert('Thông báo', 'Vui lòng nhập tên danh mục');
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
      alertMessage('Lỗi', e.message || 'Không thể lưu danh mục');
    }
  };

  const handleDeleteCategory = async (cat: CategoryRow) => {
    const txCount = await getCategoryTransactionCount(cat.id);
    if (txCount > 0) {
      confirmAction(
        'Lưu trữ danh mục',
        `Danh mục "${cat.name}" đang có ${txCount} giao dịch. Danh mục sẽ được chuyển vào mục lưu trữ để đảm bảo lịch sử chi tiêu.`,
        async () => {
          await archiveCategory(cat.id);
          await loadData();
        },
        'Đồng ý lưu trữ',
        'Hủy'
      );
    } else {
      confirmAction(
        'Xóa danh mục',
        `Bạn có chắc chắn muốn xóa "${cat.name}" không?`,
        async () => {
          await deleteCategory(cat.id);
          await loadData();
        },
        'Xóa',
        'Hủy'
      );
    }
  };

  // Group Create / Edit state
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
      'Xóa nhóm danh mục',
      `Bạn có chắc chắn muốn xóa nhóm "${group.name}" và toàn bộ danh mục trong nhóm này không?`,
      async () => {
        await archiveCategoryGroup(group.id);
        await loadData();
      },
      'Xóa nhóm',
      'Hủy'
    );
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      alertMessage('Thông báo', 'Vui lòng nhập tên nhóm danh mục');
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
      alertMessage('Lỗi', e.message || 'Không thể lưu nhóm danh mục');
    }
  };

  const handleAddTemplate = async (template: StarterGroupTemplate) => {
    setAddingTemplate(true);
    try {
      const db = getDatabase();
      await seedSingleGroupTemplate(db, template, 'vi');
      await loadData();
      alertMessage('Thành công', `Đã tạo nhóm "${template.nameVi}" cùng ${template.categories.length} danh mục con!`);
    } catch (e: any) {
      alertMessage('Lỗi', e.message || 'Không thể tạo nhóm mẫu');
    } finally {
      setAddingTemplate(false);
    }
  };

  const handleAddAllTemplates = () => {
    confirmAction(
      'Tạo tất cả nhóm mẫu',
      'Bạn có muốn thêm toàn bộ các nhóm và danh mục mẫu tiêu chuẩn vào danh sách không?',
      async () => {
        setAddingTemplate(true);
        try {
          const db = getDatabase();
          await seedStarterCategories(db, 'vi');
          await loadData();
          setTemplateModalVisible(false);
          alertMessage('Thành công', 'Đã thêm toàn bộ nhóm và danh mục mẫu thành công!');
        } catch (e: any) {
          alertMessage('Lỗi', e.message || 'Không thể thêm danh mục mẫu');
        } finally {
          setAddingTemplate(false);
        }
      },
      'Thêm tất cả',
      'Hủy'
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý Danh mục</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topActions}>
          <Button
            title="Thêm nhóm mới"
            variant="outline"
            icon={<MaterialIcons name="create-new-folder" size={18} color={Colors.primaryDark} />}
            onPress={openAddGroup}
            style={styles.actionBtnHalf}
          />
          <Button
            title="Mẫu nhóm có sẵn"
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
                    {isIncome ? 'Dòng tiền vào' : 'Dòng tiền ra'} • {groupCats.length} danh mục
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
                    <Text style={styles.addCategoryText}>Thêm</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.categoryList}>
                {groupCats.length === 0 ? (
                  <Text style={styles.emptyGroupText}>Chưa có danh mục nào trong nhóm này</Text>
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

      {/* Category Create / Edit Modal */}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingCategory ? 'Sửa Danh mục' : 'Thêm Danh mục Mới'}
            </Text>
            <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
              <MaterialIcons name="close" size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Name Input */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tên danh mục</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: Tiền điện, Mua cổ phiếu, Lương..."
                placeholderTextColor={Colors.light.textSecondary}
                value={catName}
                onChangeText={setCatName}
              />
            </View>

            {/* Select Group */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Thuộc nhóm</Text>
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

            {/* Color Picker */}
            <ColorPicker
              label="Chọn màu đại diện"
              selectedColor={catColor}
              onSelectColor={setCatColor}
            />

            {/* Icon Picker */}
            <IconPicker
              label="Chọn biểu tượng (icon)"
              selectedIcon={catIcon}
              selectedColor={catColor}
              onSelectIcon={setCatIcon}
            />

            {/* Preview Banner */}
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Xem trước hiển thị</Text>
              <View style={styles.previewRow}>
                <View style={[styles.previewBadge, { backgroundColor: catColor }]}>
                  <MaterialIcons name={(catIcon as any) || 'category'} size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.previewName}>{catName || 'Tên danh mục'}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Lưu danh mục"
              variant="primary"
              onPress={handleSaveCategory}
            />
          </View>
        </View>
      </Modal>

      {/* Group Create Modal */}
      <Modal
        visible={groupModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setGroupModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tạo Nhóm Danh mục Mới</Text>
            <TouchableOpacity onPress={() => setGroupModalVisible(false)}>
              <MaterialIcons name="close" size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tên nhóm</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: Đầu tư, Khoản nợ, Quỹ dự phòng..."
                placeholderTextColor={Colors.light.textSecondary}
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Loại dòng tiền</Text>
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
                    Chi tiêu / Tiền ra
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
                    Thu nhập / Tiền vào
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <ColorPicker
              label="Chọn màu nhóm"
              selectedColor={groupColor}
              onSelectColor={setGroupColor}
            />

            <IconPicker
              label="Chọn icon nhóm"
              selectedIcon={groupIcon}
              selectedColor={groupColor}
              onSelectIcon={setGroupIcon}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Tạo nhóm"
              variant="primary"
              onPress={handleSaveGroup}
            />
          </View>
        </View>
      </Modal>

      {/* Starter Templates Modal */}
      <Modal
        visible={templateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTemplateModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Mẫu nhóm danh mục</Text>
              <Text style={styles.modalSubtitle}>Chọn nhóm mẫu để thêm nhanh vào hệ thống</Text>
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
                  <Text style={styles.addAllTitle}>Tạo tất cả {STARTER_TEMPLATES.length} nhóm mẫu</Text>
                  <Text style={styles.addAllSub}>Khởi tạo nhanh toàn bộ danh mục tài chính tiêu chuẩn</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={Colors.light.textSecondary} />
            </TouchableOpacity>

            <Text style={styles.templateSectionHeading}>Danh sách nhóm mẫu chuẩn</Text>

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
                      <Text style={styles.templateName}>{tmpl.nameVi}</Text>
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
                            {tmpl.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                          </Text>
                        </View>
                        <Text style={styles.templateCatCount}>
                          {tmpl.categories.length} danh mục con
                        </Text>
                      </View>
                    </View>

                    {alreadyExists ? (
                      <View style={styles.alreadyExistsBadge}>
                        <MaterialIcons name="check" size={14} color="#2E7D32" />
                        <Text style={styles.alreadyExistsText}>Đã có</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addSingleTemplateBtn}
                        disabled={addingTemplate}
                        onPress={() => handleAddTemplate(tmpl)}
                      >
                        <MaterialIcons name="add" size={16} color="#1A1C2E" />
                        <Text style={styles.addSingleTemplateBtnText}>Thêm</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Sub categories preview */}
                  <View style={styles.templateCatWrap}>
                    {tmpl.categories.map((c, cIdx) => (
                      <View key={cIdx} style={styles.templateCatChip}>
                        <View style={[styles.templateCatDot, { backgroundColor: c.color }]} />
                        <Text style={styles.templateCatText}>{c.nameVi}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
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
    paddingTop: 18,
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
