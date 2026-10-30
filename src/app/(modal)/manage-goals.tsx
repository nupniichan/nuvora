import { useTheme } from '@/hooks/use-theme';
import { createManageGoalsStyles } from './manage-goals.styles';
import { MaterialIcons } from '@expo/vector-icons';
import { withMonthlyLimitConfirmation } from '@/features/budgets/confirm-monthly-limit';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ColorPicker, PRESET_COLORS } from '@/components/ui/color-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { IconPicker } from '@/components/ui/icon-picker';
import { MoneyInput } from '@/components/ui/money-input';
import { Colors } from '@/constants/theme';
import { GoalType } from '@/database/types';
import {
  completeGoal,
  getGoalFunds,
  GoalFunds,
  GoalActionError,
  createGoal,
  deleteGoal,
  FinancialGoalWithProgress,
  getAllGoals,
  updateGoal,
} from '@/features/goals/financial-goals';
import { useSafeBack } from '@/hooks/use-safe-back';
import { alertMessage, confirmAction } from '@/shared/dialog';
import { formatMoney } from '@/shared/money';

const GOAL_TYPE_OPTIONS: { type: GoalType; labelKey: string; icon: string }[] = [
  { type: 'saving', labelKey: 'goals.saving', icon: 'savings' },
  { type: 'debt_payoff', labelKey: 'goals.debtPayoff', icon: 'credit-card' },
  { type: 'investment', labelKey: 'goals.investment', icon: 'trending-up' },
  { type: 'custom', labelKey: 'goals.custom', icon: 'flag' },
];

export default function ManageGoalsModal() {
  const theme = useTheme();
  const styles = createManageGoalsStyles(theme);
  const closeModal = useSafeBack('/(main)/budgets');
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN';
  const [funds, setFunds] = useState<GoalFunds | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [goals, setGoals] = useState<FinancialGoalWithProgress[]>([]);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoalWithProgress | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('saving');
  const [targetAmount, setTargetAmount] = useState<number>(10000000);
  const [targetDate, setTargetDate] = useState<string>('');
  const [goalIcon, setGoalIcon] = useState<string>('savings');
  const [goalColor, setGoalColor] = useState<string>(PRESET_COLORS[9]);
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [items, available] = await Promise.all([getAllGoals(), getGoalFunds()]);
      setGoals(items);
      setFunds(available);
    } catch (e) {
      console.warn(t('goals.loadError'), e);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  const openCreateModal = () => {
    setEditingGoal(null);
    setGoalName('');
    setGoalType('saving');
    setTargetAmount(10000000);
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
    setTargetDate(item.target_date || '');
    setGoalIcon(item.icon || 'savings');
    setGoalColor(item.color || PRESET_COLORS[9]);
    setNotes(item.notes || '');
    setCreateModalVisible(true);
  };

  const handleSaveGoal = async () => {
    if (saving || !funds) return;
    if (!goalName.trim()) {
      alertMessage(t('common.notice'), t('goals.nameRequired'));
      return;
    }
    const safeTarget = typeof targetAmount === 'number' && !isNaN(targetAmount) ? targetAmount : 0;
    if (safeTarget <= 0) {
      alertMessage(t('common.notice'), t('goals.targetRequired'));
      return;
    }

    setSaving(true);
    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, {
          name: goalName.trim(),
          type: goalType,
          target_amount: safeTarget,
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
          target_date: targetDate.trim() || null,
          icon: goalIcon,
          color: goalColor,
          notes: notes.trim() || null,
        });
      }
      setCreateModalVisible(false);
      await loadData();
    } catch (e: any) {
      alertMessage(t('common.error'), e instanceof GoalActionError ? t('goals.errors.' + e.code) : t('goals.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteGoal = async (goal: FinancialGoalWithProgress) => {
    if (completingId) return;
    setCompletingId(goal.id);
    try {
      await withMonthlyLimitConfirmation((approval) => completeGoal(goal.id, t('goals.completionTransaction', { name: goal.name }), approval), t);
      await loadData();
    } catch (error) {
      alertMessage(t('common.error'), error instanceof GoalActionError ? t('goals.errors.' + error.code) : t('goals.completionError'));
      await loadData();
    } finally {
      setCompletingId(null);
    }
  };

  const handleDeleteGoal = (goal: FinancialGoalWithProgress) => {
    if (goal.isCompleted || completingId) return;
    confirmAction(
      t('goals.deleteTitle'),
      t('goals.deleteDescription', { name: goal.name }),
      async () => {
        try {
          await deleteGoal(goal.id);
        } catch (error) {
          alertMessage(t('common.error'), error instanceof GoalActionError ? t('goals.errors.' + error.code) : t('goals.deleteError'));
        } finally {
          await loadData();
        }
      },
      t('common.delete'),
      t('common.cancel')
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('goals.title')}</Text>
        <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Button
          title={t('goals.create')}
          variant="primary"
          icon={<MaterialIcons name="add" size={18} color={Colors.light.text} />}
          onPress={openCreateModal}
          disabled={!funds || !!completingId}
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

                <View style={styles.statsRow}>
                  <View>
                    <Text style={styles.statLabel}>{t(isCompleted ? 'goals.amountUsed' : 'goals.availableBalance')}</Text>
                    <Text style={styles.currentAmountText}>
                      {formatMoney(goal.current_amount, goal.currency, locale)}
                    </Text>
                  </View>

                  <View style={styles.pctBadge}>
                    <Text style={styles.pctText}>{goal.percentage}%</Text>
                  </View>

                  <View style={styles.alignRight}>
                    <Text style={styles.statLabel}>{t('goals.target')}</Text>
                    <Text style={styles.targetAmountText}>
                      {formatMoney(goal.target_amount, goal.currency, locale)}
                    </Text>
                  </View>
                </View>

                {goal.status === 'active' && (
                  <Text style={styles.balanceHelp}>
                    {goal.canComplete
                      ? t('goals.balanceAfterCompletion', { amount: formatMoney(goal.current_amount - goal.target_amount, goal.currency, locale) })
                      : t('goals.amountNeeded', { amount: formatMoney(goal.remainingAmount, goal.currency, locale) })}
                  </Text>
                )}
                {!isCompleted && <View style={styles.goalActions}>
                  {goal.canComplete && (
                    <Button
                      title={t('goals.completeAction')}
                      icon={<MaterialIcons name="check-circle-outline" size={18} color={Colors.primaryStrong} />}
                      onPress={() => handleCompleteGoal(goal)}
                      loading={completingId === goal.id}
                      disabled={!!completingId}
                      style={styles.completeButton}
                    />
                  )}
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('goals.editTitle')}
                    disabled={!!completingId} style={styles.iconActionBtn} onPress={() => openEditModal(goal)}>
                    <MaterialIcons name="edit" size={18} color={Colors.light.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('goals.deleteTitle')}
                    disabled={!!completingId} style={styles.iconActionBtn} onPress={() => handleDeleteGoal(goal)}>
                    <MaterialIcons name="delete-outline" size={18} color={Colors.expense} />
                  </TouchableOpacity>
                </View>}
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={createModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <SafeAreaView style={styles.modalRoot} edges={['top', 'left', 'right']}>
          <KeyboardAvoidingView
            behavior="padding"
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingGoal ? t('goals.editTitle') : t('goals.createTitle')}
              </Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <MaterialIcons name="close" size={22} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >

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

            <MoneyInput
              label={t('goals.targetAmount')}
              valueMinor={targetAmount}
              onChangeMinor={setTargetAmount}
              currency={funds?.currency || 'VND'}
            />

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('goals.availableBalance')}</Text>
              <Text style={styles.currentAmountText}>
                {funds ? formatMoney(funds.balance, funds.currency, locale) : t('common.loading')}
              </Text>
              <Text style={styles.balanceHelp}>{t('goals.balanceHelp')}</Text>
            </View>

            <View style={styles.formGroup}>
              <DatePicker
                label={t('goals.targetDate')}
                placeholder={t('goals.targetDatePlaceholder')}
                value={targetDate}
                onChange={setTargetDate}
                allowClear
              />
            </View>

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
                loading={saving}
                disabled={!funds || saving}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}
