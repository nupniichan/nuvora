import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { MoneyInput } from '@/components/ui/money-input';
import { Colors } from '@/constants/theme';
import { GoalType } from '@/database/types';
import {
  addGoalContribution,
  createGoal,
  deleteGoal,
  FinancialGoalWithProgress,
  getAllGoals,
  updateGoal,
} from '@/features/goals/financial-goals';
import { alertMessage, confirmAction } from '@/shared/dialog';
import { formatMoney } from '@/shared/money';

const GOAL_TYPE_OPTIONS: { type: GoalType; label: string; icon: string }[] = [
  { type: 'saving', label: 'Tiết kiệm', icon: 'savings' },
  { type: 'debt_payoff', label: 'Trả nợ', icon: 'credit-card' },
  { type: 'investment', label: 'Đầu tư', icon: 'trending-up' },
  { type: 'custom', label: 'Mục tiêu khác', icon: 'flag' },
];

export default function ManageGoalsModal() {
  const router = useRouter();

  const [goals, setGoals] = useState<FinancialGoalWithProgress[]>([]);

  // Goal Form State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoalWithProgress | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('saving');
  const [targetAmount, setTargetAmount] = useState<number>(10000000);
  const [currentAmount, setCurrentAmount] = useState<number>(0);
  const [targetDate, setTargetDate] = useState<string>('');
  const [goalIcon, setGoalIcon] = useState<string>('savings');
  const [goalColor, setGoalColor] = useState<string>(PRESET_COLORS[9]);
  const [notes, setNotes] = useState('');

  // Contribution State
  const [contribModalVisible, setContribModalVisible] = useState(false);
  const [activeContribGoal, setActiveContribGoal] = useState<FinancialGoalWithProgress | null>(null);
  const [contribAmount, setContribAmount] = useState<number>(500000);
  const [contribNote, setContribNote] = useState('');

  const loadData = useCallback(async () => {
    try {
      const items = await getAllGoals();
      setGoals(items);
    } catch (e) {
      console.warn('Lỗi tải mục tiêu tài chính', e);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const items = await getAllGoals();
        if (isMounted) setGoals(items);
      } catch (e) {
        console.warn('Lỗi tải mục tiêu tài chính', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const openCreateModal = () => {
    setEditingGoal(null);
    setGoalName('');
    setGoalType('saving');
    setTargetAmount(10000000);
    setCurrentAmount(0);
    setTargetDate('');
    setGoalIcon('savings');
    setGoalColor(PRESET_COLORS[9]);
    setNotes('');
    setCreateModalVisible(true);
  };

  const openEditModal = (item: FinancialGoalWithProgress) => {
    setEditingGoal(item);
    setGoalName(item.name);
    setGoalType(item.type);
    setTargetAmount(item.target_amount);
    setCurrentAmount(item.current_amount);
    setTargetDate(item.target_date || '');
    setGoalIcon(item.icon || 'savings');
    setGoalColor(item.color || PRESET_COLORS[9]);
    setNotes(item.notes || '');
    setCreateModalVisible(true);
  };

  const openContribModal = (item: FinancialGoalWithProgress) => {
    setActiveContribGoal(item);
    setContribAmount(500000);
    setContribNote('');
    setContribModalVisible(true);
  };

  const handleSaveGoal = async () => {
    if (!goalName.trim()) {
      alertMessage('Thông báo', 'Vui lòng nhập tên mục tiêu');
      return;
    }
    const safeTarget = typeof targetAmount === 'number' && !isNaN(targetAmount) ? targetAmount : 0;
    const safeCurrent = typeof currentAmount === 'number' && !isNaN(currentAmount) ? currentAmount : 0;
    if (safeTarget <= 0) {
      alertMessage('Thông báo', 'Số tiền mục tiêu phải lớn hơn 0');
      return;
    }

    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, {
          name: goalName.trim(),
          type: goalType,
          target_amount: safeTarget,
          current_amount: safeCurrent,
          target_date: targetDate.trim() || null,
          icon: goalIcon,
          color: goalColor,
          notes: notes.trim() || null,
        });
      } else {
        await createGoal({
          name: goalName.trim(),
          type: goalType,
          target_amount: safeTarget,
          current_amount: safeCurrent,
          target_date: targetDate.trim() || null,
          icon: goalIcon,
          color: goalColor,
          notes: notes.trim() || null,
        });
      }
      setCreateModalVisible(false);
      await loadData();
    } catch (e: any) {
      alertMessage('Lỗi', e.message || 'Không thể lưu mục tiêu');
    }
  };

  const handleAddContribution = async () => {
    const safeContrib = typeof contribAmount === 'number' && !isNaN(contribAmount) ? contribAmount : 0;
    if (!activeContribGoal || safeContrib <= 0) {
      alertMessage('Thông báo', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }

    try {
      await addGoalContribution(activeContribGoal.id, safeContrib, contribNote);
      setContribModalVisible(false);
      await loadData();
    } catch (e: any) {
      alertMessage('Lỗi', e.message || 'Không thể nạp tiền vào mục tiêu');
    }
  };

  const handleDeleteGoal = (goal: FinancialGoalWithProgress) => {
    confirmAction(
      'Xóa mục tiêu',
      `Bạn có chắc chắn muốn xóa mục tiêu "${goal.name}" không?`,
      async () => {
        await deleteGoal(goal.id);
        await loadData();
      },
      'Xóa',
      'Hủy'
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mục tiêu Tài chính</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Button
          title="Tạo mục tiêu mới"
          variant="primary"
          icon={<MaterialIcons name="add" size={18} color="#FFFFFF" />}
          onPress={openCreateModal}
        />

        {goals.length === 0 ? (
          <Card variant="flat" style={styles.emptyCard}>
            <MaterialIcons name="flag" size={48} color={Colors.light.textSecondary} />
            <Text style={styles.emptyTitle}>Chưa có mục tiêu nào</Text>
            <Text style={styles.emptyDesc}>
              Tạo các mục tiêu như Quỹ khẩn cấp, Mua nhà, Trả nợ ngân hàng, Tích lũy đầu tư... để theo dõi tiến độ.
            </Text>
          </Card>
        ) : (
          goals.map((goal) => {
            const isCompleted = goal.isCompleted;
            const isOverdue = goal.isOverdue;

            return (
              <Card key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View
                    style={[
                      styles.goalIconBadge,
                      { backgroundColor: goal.color || Colors.primaryDark },
                    ]}
                  >
                    <MaterialIcons
                      name={(goal.icon as any) || 'flag'}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>

                  <View style={styles.goalTitleDetails}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    <Text style={styles.goalTypeLabel}>
                      {GOAL_TYPE_OPTIONS.find((t) => t.type === goal.type)?.label || 'Mục tiêu'}
                      {goal.target_date ? ` • Hạn: ${goal.target_date}` : ''}
                    </Text>
                  </View>

                  {isCompleted ? (
                    <View style={styles.completedBadge}>
                      <MaterialIcons name="check-circle" size={14} color="#2E7D32" />
                      <Text style={styles.completedText}>Hoàn thành</Text>
                    </View>
                  ) : isOverdue ? (
                    <View style={styles.overdueBadge}>
                      <MaterialIcons name="error" size={14} color="#C62828" />
                      <Text style={styles.overdueText}>Quá hạn</Text>
                    </View>
                  ) : null}
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${goal.percentage}%`,
                        backgroundColor: isCompleted
                          ? Colors.income
                          : goal.color || Colors.primaryDark,
                      },
                    ]}
                  />
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <View>
                    <Text style={styles.statLabel}>Hiện tại</Text>
                    <Text style={styles.currentAmountText}>
                      {formatMoney(goal.current_amount, 'VND')}
                    </Text>
                  </View>

                  <View style={styles.pctBadge}>
                    <Text style={styles.pctText}>{goal.percentage}%</Text>
                  </View>

                  <View style={styles.alignRight}>
                    <Text style={styles.statLabel}>Mục tiêu</Text>
                    <Text style={styles.targetAmountText}>
                      {formatMoney(goal.target_amount, 'VND')}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.goalActions}>
                  <TouchableOpacity
                    style={styles.actionBtnSecondary}
                    onPress={() => openContribModal(goal)}
                  >
                    <MaterialIcons name="add-circle-outline" size={16} color={Colors.primaryDark} />
                    <Text style={styles.actionBtnText}>Cập nhật tiền</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => openEditModal(goal)}
                  >
                    <MaterialIcons name="edit" size={18} color={Colors.light.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => handleDeleteGoal(goal)}
                  >
                    <MaterialIcons name="delete-outline" size={18} color={Colors.expense} />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Goal Create / Edit Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingGoal ? 'Chỉnh sửa Mục tiêu' : 'Tạo Mục tiêu Mới'}
            </Text>
            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
              <MaterialIcons name="close" size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Goal Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tên mục tiêu</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: Quỹ khẩn cấp, Mua xe, Trả nợ ngân hàng..."
                placeholderTextColor={Colors.light.textSecondary}
                value={goalName}
                onChangeText={setGoalName}
              />
            </View>

            {/* Goal Type Chips */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Loại mục tiêu</Text>
              <View style={styles.typeRow}>
                {GOAL_TYPE_OPTIONS.map((item) => {
                  const isSelected = goalType === item.type;
                  return (
                    <TouchableOpacity
                      key={item.type}
                      style={[styles.typeChip, isSelected && styles.selectedTypeChip]}
                      onPress={() => {
                        setGoalType(item.type);
                        setGoalIcon(item.icon);
                      }}
                    >
                      <MaterialIcons
                        name={item.icon as any}
                        size={16}
                        color={isSelected ? '#1A1C2E' : Colors.light.textSecondary}
                      />
                      <Text style={[styles.typeChipText, isSelected && styles.selectedTypeChipText]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Target Amount */}
            <MoneyInput
              label="Số tiền mục tiêu"
              valueMinor={targetAmount}
              onChangeMinor={setTargetAmount}
              currency="VND"
            />

            {/* Current Amount */}
            <MoneyInput
              label="Số tiền đã có sẵn (ban đầu)"
              valueMinor={currentAmount}
              onChangeMinor={setCurrentAmount}
              currency="VND"
            />

            {/* Target Date */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Thời hạn hoàn thành (Tùy chọn - YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: 2026-12-31"
                placeholderTextColor={Colors.light.textSecondary}
                value={targetDate}
                onChangeText={setTargetDate}
              />
            </View>

            {/* Color & Icon */}
            <ColorPicker
              label="Chọn màu đại diện"
              selectedColor={goalColor}
              onSelectColor={setGoalColor}
            />

            <IconPicker
              label="Chọn biểu tượng"
              selectedIcon={goalIcon}
              selectedColor={goalColor}
              onSelectIcon={setGoalIcon}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Lưu mục tiêu"
              variant="primary"
              onPress={handleSaveGoal}
            />
          </View>
        </View>
      </Modal>

      {/* Contribution Modal */}
      <Modal
        visible={contribModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setContribModalVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Cập nhật tiền mục tiêu</Text>
            <Text style={styles.dialogDesc}>
              {activeContribGoal?.name}
            </Text>

            <MoneyInput
              label="Số tiền thêm (+)"
              valueMinor={contribAmount}
              onChangeMinor={setContribAmount}
              currency="VND"
            />

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Ghi chú (Tùy chọn)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ví dụ: Trích lương tháng 9..."
                placeholderTextColor={Colors.light.textSecondary}
                value={contribNote}
                onChangeText={setContribNote}
              />
            </View>

            <View style={styles.dialogActions}>
              <Button
                title="Hủy"
                variant="outline"
                onPress={() => setContribModalVisible(false)}
                style={styles.dialogBtn}
              />
              <Button
                title="Xác nhận"
                variant="primary"
                onPress={handleAddContribution}
                style={styles.dialogBtn}
              />
            </View>
          </View>
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
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    gap: 10,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  goalCard: {
    padding: 16,
    gap: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitleDetails: {
    flex: 1,
    gap: 2,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  goalTypeLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overdueText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C62828',
  },
  progressContainer: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.backgroundElement,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  currentAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
  },
  targetAmountText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  pctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundElement,
  },
  pctText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.backgroundElement,
    paddingTop: 10,
    marginTop: 2,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundElement,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  iconActionBtn: {
    padding: 8,
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundElement,
  },
  selectedTypeChip: {
    backgroundColor: Colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  selectedTypeChipText: {
    color: '#1A1C2E',
    fontWeight: '700',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  dialogDesc: {
    fontSize: 14,
    color: Colors.primaryDark,
    fontWeight: '600',
    marginTop: -8,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  dialogBtn: {
    flex: 1,
  },
});
