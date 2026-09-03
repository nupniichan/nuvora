import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

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

const GOAL_TYPE_OPTIONS: { type: GoalType; labelKey: string; icon: string }[] = [
  { type: 'saving', labelKey: 'goals.saving', icon: 'savings' },
  { type: 'debt_payoff', labelKey: 'goals.debtPayoff', icon: 'credit-card' },
  { type: 'investment', labelKey: 'goals.investment', icon: 'trending-up' },
  { type: 'custom', labelKey: 'goals.custom', icon: 'flag' },
];

export default function ManageGoalsModal() {
  const router = useRouter();
  const { t } = useTranslation();

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
      console.warn(t('goals.loadError'), e);
    }
  }, [t]);

  useEffect(() => {
    let active = true;
    getAllGoals()
      .then((items) => {
        if (active) setGoals(items);
      })
      .catch((error) => console.warn(t('goals.loadError'), error));
    return () => {
      active = false;
    };
  }, [t]);

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
      alertMessage(t('common.notice'), t('goals.nameRequired'));
      return;
    }
    const safeTarget = typeof targetAmount === 'number' && !isNaN(targetAmount) ? targetAmount : 0;
    const safeCurrent = typeof currentAmount === 'number' && !isNaN(currentAmount) ? currentAmount : 0;
    if (safeTarget <= 0) {
      alertMessage(t('common.notice'), t('goals.targetRequired'));
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
      alertMessage(t('common.error'), e.message || t('goals.saveError'));
    }
  };

  const handleAddContribution = async () => {
    const safeContrib = typeof contribAmount === 'number' && !isNaN(contribAmount) ? contribAmount : 0;
    if (!activeContribGoal || safeContrib <= 0) {
      alertMessage(t('common.notice'), t('goals.contributionRequired'));
      return;
    }

    try {
      await addGoalContribution(activeContribGoal.id, safeContrib, contribNote);
      setContribModalVisible(false);
      await loadData();
    } catch (e: any) {
      alertMessage(t('common.error'), e.message || t('goals.contributionError'));
    }
  };

  const handleDeleteGoal = (goal: FinancialGoalWithProgress) => {
    confirmAction(
      t('goals.deleteTitle'),
      t('goals.deleteDescription', { name: goal.name }),
      async () => {
        await deleteGoal(goal.id);
        await loadData();
      },
      t('common.delete'),
      t('common.cancel')
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('goals.title')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Button
          title={t('goals.create')}
          variant="primary"
          icon={<MaterialIcons name="add" size={18} color="#FFFFFF" />}
          onPress={openCreateModal}
        />

        {goals.length === 0 ? (
          <Card variant="flat" style={styles.emptyCard}>
            <MaterialIcons name="flag" size={48} color={Colors.light.textSecondary} />
            <Text style={styles.emptyTitle}>{t('goals.emptyTitle')}</Text>
            <Text style={styles.emptyDesc}>{t('goals.emptyDescription')}</Text>
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
                      {t(
                        GOAL_TYPE_OPTIONS.find((option) => option.type === goal.type)?.labelKey ||
                          'goals.fallbackType'
                      )}
                      {goal.target_date
                        ? ` • ${t('goals.deadline', { date: goal.target_date })}`
                        : ''}
                    </Text>
                  </View>

                  {isCompleted ? (
                    <View style={styles.completedBadge}>
                      <MaterialIcons name="check-circle" size={14} color="#2E7D32" />
                      <Text style={styles.completedText}>{t('goals.completed')}</Text>
                    </View>
                  ) : isOverdue ? (
                    <View style={styles.overdueBadge}>
                      <MaterialIcons name="error" size={14} color="#C62828" />
                      <Text style={styles.overdueText}>{t('goals.overdue')}</Text>
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
                    <Text style={styles.statLabel}>{t('goals.current')}</Text>
                    <Text style={styles.currentAmountText}>
                      {formatMoney(goal.current_amount, 'VND')}
                    </Text>
                  </View>

                  <View style={styles.pctBadge}>
                    <Text style={styles.pctText}>{goal.percentage}%</Text>
                  </View>

                  <View style={styles.alignRight}>
                    <Text style={styles.statLabel}>{t('goals.target')}</Text>
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
                    <Text style={styles.actionBtnText}>{t('goals.updateAmount')}</Text>
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
              {editingGoal ? t('goals.editTitle') : t('goals.createTitle')}
            </Text>
            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
              <MaterialIcons name="close" size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Goal Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('goals.name')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('goals.namePlaceholder')}
                placeholderTextColor={Colors.light.textSecondary}
                value={goalName}
                onChangeText={setGoalName}
              />
            </View>

            {/* Goal Type Chips */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('goals.type')}</Text>
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
                        {t(item.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Target Amount */}
            <MoneyInput
              label={t('goals.targetAmount')}
              valueMinor={targetAmount}
              onChangeMinor={setTargetAmount}
              currency="VND"
            />

            {/* Current Amount */}
            <MoneyInput
              label={t('goals.initialAmount')}
              valueMinor={currentAmount}
              onChangeMinor={setCurrentAmount}
              currency="VND"
            />

            {/* Target Date */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('goals.targetDate')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('goals.targetDatePlaceholder')}
                placeholderTextColor={Colors.light.textSecondary}
                value={targetDate}
                onChangeText={setTargetDate}
              />
            </View>

            {/* Color & Icon */}
            <ColorPicker
              label={t('goals.pickColor')}
              selectedColor={goalColor}
              onSelectColor={setGoalColor}
            />

            <IconPicker
              label={t('goals.pickIcon')}
              selectedIcon={goalIcon}
              selectedColor={goalColor}
              onSelectIcon={setGoalIcon}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={t('goals.save')}
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
            <Text style={styles.dialogTitle}>{t('goals.contributionTitle')}</Text>
            <Text style={styles.dialogDesc}>
              {activeContribGoal?.name}
            </Text>

            <MoneyInput
              label={t('goals.contributionAmount')}
              valueMinor={contribAmount}
              onChangeMinor={setContribAmount}
              currency="VND"
            />

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('goals.note')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('goals.notePlaceholder')}
                placeholderTextColor={Colors.light.textSecondary}
                value={contribNote}
                onChangeText={setContribNote}
              />
            </View>

            <View style={styles.dialogActions}>
              <Button
                title={t('common.cancel')}
                variant="outline"
                onPress={() => setContribModalVisible(false)}
                style={styles.dialogBtn}
              />
              <Button
                title={t('common.confirm')}
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
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)' },
      default: {
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
    }),
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
