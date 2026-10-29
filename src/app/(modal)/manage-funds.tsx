import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
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
import { IconPicker } from '@/components/ui/icon-picker';
import { MoneyInput } from '@/components/ui/money-input';
import { Colors } from '@/constants/theme';
import { FundRow, TransactionRow } from '@/database/types';
import {
  createFund,
  deleteFund,
  depositToFund,
  getAllFunds,
  getAssetSummary,
  getFundTransactions,
  reorderFunds,
  transferBetweenFunds,
  updateFund,
  withdrawFromFund,
} from '@/features/funds/fund-queries';
import { useSafeBack } from '@/hooks/use-safe-back';
import { alertMessage, confirmAction } from '@/shared/dialog';
import { formatDateDisplay } from '@/shared/date-utils';
import { formatMoney } from '@/shared/money';

export default function ManageFundsModal() {
  const closeModal = useSafeBack('/(main)');
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN';

  const [funds, setFunds] = useState<FundRow[]>([]);
  const [assetSummary, setAssetSummary] = useState<{
    walletBalance: number;
    fundsBalance: number;
    totalAssets: number;
    currency: string;
  } | null>(null);

  // Form modal (Create / Edit)
  const [formVisible, setFormVisible] = useState(false);
  const [editingFund, setEditingFund] = useState<FundRow | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('savings');
  const [color, setColor] = useState(PRESET_COLORS[9]);
  const [hasTarget, setHasTarget] = useState(false);
  const [targetAmount, setTargetAmount] = useState<number>(5000000);
  const [saving, setSaving] = useState(false);

  // Transfer modal (Deposit / Withdraw / Transfer)
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferType, setTransferType] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const [activeFund, setActiveFund] = useState<FundRow | null>(null);
  const [targetFundId, setTargetFundId] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferNote, setTransferNote] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Delete modal (for non-zero balance)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingFund, setDeletingFund] = useState<FundRow | null>(null);
  const [deleteAction, setDeleteAction] = useState<'refund_to_wallet' | 'transfer_to_fund'>('refund_to_wallet');
  const [deleteTargetFundId, setDeleteTargetFundId] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

  // History modal
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyFund, setHistoryFund] = useState<FundRow | null>(null);
  const [historyTransactions, setHistoryTransactions] = useState<TransactionRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [allFunds, summary] = await Promise.all([
        getAllFunds(false),
        getAssetSummary(),
      ]);
      setFunds(allFunds);
      setAssetSummary(summary);
    } catch (e) {
      console.warn('Failed to load funds', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const openCreateModal = () => {
    setEditingFund(null);
    setName('');
    setDescription('');
    setIcon('savings');
    setColor(PRESET_COLORS[9]);
    setHasTarget(false);
    setTargetAmount(5000000);
    setFormVisible(true);
  };

  const openEditModal = (fund: FundRow) => {
    setEditingFund(fund);
    setName(fund.name);
    setDescription(fund.description || '');
    setIcon(fund.icon || 'savings');
    setColor(fund.color || PRESET_COLORS[9]);
    setHasTarget(fund.target_amount !== null && fund.target_amount > 0);
    setTargetAmount(fund.target_amount || 5000000);
    setFormVisible(true);
  };

  const handleSaveFund = async () => {
    if (saving) return;
    if (!name.trim()) {
      alertMessage(t('common.notice'), t('funds.nameRequired'));
      return;
    }

    setSaving(true);
    try {
      if (editingFund) {
        await updateFund(editingFund.id, {
          name: name.trim(),
          description: description.trim() || null,
          icon,
          color,
          targetAmount: hasTarget && targetAmount > 0 ? targetAmount : null,
        });
      } else {
        await createFund({
          name: name.trim(),
          description: description.trim() || null,
          icon,
          color,
          targetAmount: hasTarget && targetAmount > 0 ? targetAmount : null,
          currency: assetSummary?.currency,
        });
      }
      setFormVisible(false);
      await loadData();
    } catch {
      alertMessage(t('common.error'), t('funds.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const reordered = [...funds];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;
    setFunds(reordered);
    await reorderFunds(reordered.map((f) => f.id));
  };

  const handleMoveDown = async (index: number) => {
    if (index === funds.length - 1) return;
    const reordered = [...funds];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;
    setFunds(reordered);
    await reorderFunds(reordered.map((f) => f.id));
  };

  const openTransferModal = (fund: FundRow, type: 'deposit' | 'withdraw' | 'transfer') => {
    setActiveFund(fund);
    setTransferType(type);
    setTransferAmount(0);
    setTransferNote('');
    const otherFunds = funds.filter((f) => f.id !== fund.id);
    setTargetFundId(otherFunds[0]?.id || '');
    setTransferModalVisible(true);
  };

  const handleExecuteTransfer = async () => {
    if (!activeFund || transferring) return;
    if (transferAmount <= 0) {
      alertMessage(t('common.notice'), t('funds.amountRequired'));
      return;
    }

    setTransferring(true);
    try {
      if (transferType === 'deposit') {
        if ((assetSummary?.walletBalance ?? 0) < transferAmount) {
          alertMessage(t('common.error'), t('funds.errors.insufficientWallet'));
          return;
        }
        await depositToFund({
          fundId: activeFund.id,
          amount: transferAmount,
          note: transferNote.trim() || undefined,
        });
      } else if (transferType === 'withdraw') {
        if (activeFund.balance < transferAmount) {
          alertMessage(t('common.error'), t('funds.errors.insufficientFund'));
          return;
        }
        await withdrawFromFund({
          fundId: activeFund.id,
          amount: transferAmount,
          note: transferNote.trim() || undefined,
        });
      } else if (transferType === 'transfer') {
        if (!targetFundId || targetFundId === activeFund.id) {
          alertMessage(t('common.notice'), t('funds.targetFundRequired'));
          return;
        }
        if (activeFund.balance < transferAmount) {
          alertMessage(t('common.error'), t('funds.errors.insufficientFund'));
          return;
        }
        await transferBetweenFunds({
          fromFundId: activeFund.id,
          toFundId: targetFundId,
          amount: transferAmount,
          note: transferNote.trim() || undefined,
        });
      }

      setTransferModalVisible(false);
      await loadData();
    } catch (err: any) {
      alertMessage(t('common.error'), err.message || t('funds.saveError'));
    } finally {
      setTransferring(false);
    }
  };

  const handleDeleteFund = (fund: FundRow) => {
    if (fund.balance > 0) {
      setDeletingFund(fund);
      setDeleteAction('refund_to_wallet');
      const otherFunds = funds.filter((f) => f.id !== fund.id);
      setDeleteTargetFundId(otherFunds[0]?.id || '');
      setDeleteModalVisible(true);
    } else {
      confirmAction(
        t('funds.deleteTitle'),
        t('funds.deleteConfirm', { name: fund.name }),
        async () => {
          try {
            await deleteFund(fund.id);
            await loadData();
          } catch {
            alertMessage(t('common.error'), t('funds.errors.deleteError'));
          }
        },
        t('common.delete'),
        t('common.cancel')
      );
    }
  };

  const handleConfirmDeleteWithBalance = async () => {
    if (!deletingFund || deleting) return;
    if (deleteAction === 'transfer_to_fund' && (!deleteTargetFundId || deleteTargetFundId === deletingFund.id)) {
      alertMessage(t('common.notice'), t('funds.targetFundRequired'));
      return;
    }

    setDeleting(true);
    try {
      await deleteFund(deletingFund.id, {
        action: deleteAction,
        targetFundId: deleteAction === 'transfer_to_fund' ? deleteTargetFundId : undefined,
      });
      setDeleteModalVisible(false);
      setDeletingFund(null);
      await loadData();
    } catch (e: any) {
      alertMessage(t('common.error'), e.message || t('funds.errors.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const openHistoryModal = async (fund: FundRow) => {
    setHistoryFund(fund);
    setHistoryModalVisible(true);
    setLoadingHistory(true);
    try {
      const txs = await getFundTransactions(fund.id);
      setHistoryTransactions(txs);
    } catch (e) {
      console.warn('Failed to load fund history', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const currency = assetSummary?.currency || 'VND';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.eyebrow}>NUVORA</Text>
          <Text style={styles.title}>{t('funds.title')}</Text>
        </View>
        <TouchableOpacity
          onPress={closeModal}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <MaterialIcons name="close" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Assets & Balance Split Card */}
        {assetSummary && (
          <Card style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryBadge}>
                <MaterialIcons name="account-balance" size={16} color={Colors.primaryStrong} />
                <Text style={styles.summaryBadgeText}>{t('funds.totalAssets')}</Text>
              </View>
              <Text style={styles.totalAssetsAmount}>
                {formatMoney(assetSummary.totalAssets, currency, locale)}
              </Text>
            </View>

            <View style={styles.summarySplit}>
              <View style={styles.splitItem}>
                <View style={styles.splitIconRow}>
                  <MaterialIcons name="account-balance-wallet" size={16} color={Colors.light.textSecondary} />
                  <Text style={styles.splitLabel}>{t('funds.walletBalance')}</Text>
                </View>
                <Text style={styles.splitValue}>
                  {formatMoney(assetSummary.walletBalance, currency, locale)}
                </Text>
              </View>

              <View style={styles.splitDivider} />

              <View style={styles.splitItem}>
                <View style={styles.splitIconRow}>
                  <MaterialIcons name="savings" size={16} color={Colors.light.textSecondary} />
                  <Text style={styles.splitLabel}>{t('funds.totalFunds')}</Text>
                </View>
                <Text style={styles.splitValue}>
                  {formatMoney(assetSummary.fundsBalance, currency, locale)}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('funds.fundsCount', { count: funds.length })}</Text>
          <TouchableOpacity
            style={styles.createBtnHeader}
            onPress={openCreateModal}
            accessibilityRole="button"
            accessibilityLabel={t('funds.createTitle')}
          >
            <MaterialIcons name="add" size={18} color={Colors.primaryStrong} />
            <Text style={styles.createBtnHeaderText}>{t('funds.createFundNow')}</Text>
          </TouchableOpacity>
        </View>

        {/* Empty state */}
        {funds.length === 0 ? (
          <Card variant="flat" style={styles.emptyCard}>
            <MaterialIcons name="savings" size={48} color={Colors.light.textSecondary} />
            <Text style={styles.emptyTitle}>{t('funds.emptyTitle')}</Text>
            <Text style={styles.emptyDesc}>{t('funds.emptyDescription')}</Text>
            <Button
              title={t('funds.createFundNow')}
              icon={<MaterialIcons name="add" size={18} color={Colors.primaryStrong} />}
              onPress={openCreateModal}
              variant="primary"
              style={styles.emptyActionBtn}
            />
          </Card>
        ) : (
          funds.map((fund, index) => {
            const hasTargetAmount = fund.target_amount !== null && fund.target_amount > 0;
            const targetVal = hasTargetAmount ? fund.target_amount! : 1;
            const currentVal = Math.max(0, fund.balance);
            const percentage = hasTargetAmount
              ? currentVal >= targetVal
                ? 100
                : Math.floor((currentVal / targetVal) * 100)
              : null;

            return (
              <Card key={fund.id} style={styles.fundCard}>
                <View style={styles.fundCardHeader}>
                  <View
                    style={[
                      styles.fundIconBadge,
                      { backgroundColor: fund.color || Colors.primaryDark },
                    ]}
                  >
                    <MaterialIcons
                      name={(fund.icon as any) || 'savings'}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>

                  <View style={styles.fundHeaderInfo}>
                    <Text style={styles.fundName}>{fund.name}</Text>
                    {fund.description ? (
                      <Text style={styles.fundDesc} numberOfLines={1}>
                        {fund.description}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.reorderGroup}>
                    {index > 0 && (
                      <TouchableOpacity
                        onPress={() => handleMoveUp(index)}
                        style={styles.reorderBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Move up"
                      >
                        <MaterialIcons name="arrow-upward" size={16} color={Colors.light.textSecondary} />
                      </TouchableOpacity>
                    )}
                    {index < funds.length - 1 && (
                      <TouchableOpacity
                        onPress={() => handleMoveDown(index)}
                        style={styles.reorderBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Move down"
                      >
                        <MaterialIcons name="arrow-downward" size={16} color={Colors.light.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Progress bar if target is set */}
                {hasTargetAmount && percentage !== null && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${percentage}%`,
                            backgroundColor: percentage >= 100 ? Colors.income : fund.color || Colors.primaryDark,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.targetRow}>
                      <Text style={styles.targetLabel}>
                        {t('funds.targetProgress', { percent: percentage })}
                      </Text>
                      <Text style={styles.targetValue}>
                        {formatMoney(fund.target_amount!, fund.currency, locale)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Balance display */}
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>{t('funds.currentBalance')}</Text>
                  <Text style={styles.balanceValue}>
                    {formatMoney(fund.balance, fund.currency, locale)}
                  </Text>
                </View>

                {/* Action buttons */}
                <View style={styles.actionsGrid}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openTransferModal(fund, 'deposit')}
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="add-circle-outline" size={16} color={Colors.primaryStrong} />
                    <Text style={styles.actionBtnText}>{t('funds.deposit')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openTransferModal(fund, 'withdraw')}
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="remove-circle-outline" size={16} color={Colors.primaryStrong} />
                    <Text style={styles.actionBtnText}>{t('funds.withdraw')}</Text>
                  </TouchableOpacity>

                  {funds.length > 1 && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => openTransferModal(fund, 'transfer')}
                      accessibilityRole="button"
                    >
                      <MaterialIcons name="swap-horiz" size={16} color={Colors.primaryStrong} />
                      <Text style={styles.actionBtnText}>{t('funds.transfer')}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openHistoryModal(fund)}
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="history" size={16} color={Colors.light.textSecondary} />
                    <Text style={styles.actionBtnText}>{t('funds.transactions')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconOnlyBtn}
                    onPress={() => openEditModal(fund)}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.edit')}
                  >
                    <MaterialIcons name="edit" size={16} color={Colors.light.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconOnlyBtn}
                    onPress={() => handleDeleteFund(fund)}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.delete')}
                  >
                    <MaterialIcons name="delete-outline" size={16} color={Colors.expense} />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* MODAL 1: Create / Edit Fund */}
      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFormVisible(false)}
      >
        <SafeAreaView style={styles.modalRoot} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t(editingFund ? 'funds.editTitle' : 'funds.createTitle')}
            </Text>
            <TouchableOpacity onPress={() => setFormVisible(false)} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('funds.name')} *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t('funds.namePlaceholder')}
                  placeholderTextColor={Colors.light.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('funds.description')}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t('funds.descriptionPlaceholder')}
                  placeholderTextColor={Colors.light.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <View style={styles.formGroup}>
                <IconPicker
                  label={t('funds.pickIcon')}
                  selectedIcon={icon}
                  onSelectIcon={setIcon}
                />
              </View>

              <View style={styles.formGroup}>
                <ColorPicker
                  label={t('funds.pickColor')}
                  selectedColor={color}
                  onSelectColor={setColor}
                />
              </View>

              <View style={styles.targetToggleRow}>
                <TouchableOpacity
                  style={[styles.checkboxBtn, hasTarget && styles.checkboxActive]}
                  onPress={() => setHasTarget(!hasTarget)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: hasTarget }}
                >
                  <MaterialIcons
                    name={hasTarget ? 'check-box' : 'check-box-outline-blank'}
                    size={20}
                    color={hasTarget ? Colors.primaryStrong : Colors.light.textSecondary}
                  />
                  <Text style={styles.checkboxLabel}>{t('funds.targetAmount')}</Text>
                </TouchableOpacity>
              </View>

              {hasTarget && (
                <View style={styles.formGroup}>
                  <MoneyInput
                    label={t('funds.targetAmount')}
                    currency={currency}
                    valueMinor={targetAmount}
                    onChangeMinor={setTargetAmount}
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title={t('funds.save')}
                variant="primary"
                onPress={handleSaveFund}
                loading={saving}
                disabled={!name.trim()}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* MODAL 2: Deposit / Withdraw / Transfer */}
      <Modal
        visible={transferModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTransferModalVisible(false)}
      >
        <SafeAreaView style={styles.modalRoot} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {transferType === 'deposit'
                ? t('funds.depositTitle')
                : transferType === 'withdraw'
                ? t('funds.withdrawTitle')
                : t('funds.transferTitle')}
            </Text>
            <TouchableOpacity onPress={() => setTransferModalVisible(false)} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Context banner */}
              <Card variant="flat" style={styles.contextBanner}>
                {transferType === 'deposit' && (
                  <>
                    <Text style={styles.contextLabel}>{t('funds.fromFund')}: <Text style={styles.contextValue}>{t('funds.sourceWallet')} ({formatMoney(assetSummary?.walletBalance ?? 0, currency, locale)})</Text></Text>
                    <Text style={styles.contextLabel}>{t('funds.toFund')}: <Text style={styles.contextValue}>{activeFund?.name} ({formatMoney(activeFund?.balance ?? 0, currency, locale)})</Text></Text>
                  </>
                )}
                {transferType === 'withdraw' && (
                  <>
                    <Text style={styles.contextLabel}>{t('funds.fromFund')}: <Text style={styles.contextValue}>{activeFund?.name} ({formatMoney(activeFund?.balance ?? 0, currency, locale)})</Text></Text>
                    <Text style={styles.contextLabel}>{t('funds.toFund')}: <Text style={styles.contextValue}>{t('funds.destinationWallet')} ({formatMoney(assetSummary?.walletBalance ?? 0, currency, locale)})</Text></Text>
                  </>
                )}
                {transferType === 'transfer' && (
                  <>
                    <Text style={styles.contextLabel}>{t('funds.fromFund')}: <Text style={styles.contextValue}>{activeFund?.name} ({formatMoney(activeFund?.balance ?? 0, currency, locale)})</Text></Text>
                  </>
                )}
              </Card>

              {/* Target fund selector for transfer between funds */}
              {transferType === 'transfer' && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('funds.selectTargetFund')}</Text>
                  <View style={styles.targetFundsList}>
                    {funds
                      .filter((f) => f.id !== activeFund?.id)
                      .map((f) => {
                        const isSelected = f.id === targetFundId;
                        return (
                          <TouchableOpacity
                            key={f.id}
                            style={[styles.fundSelectOption, isSelected && styles.fundSelectOptionActive]}
                            onPress={() => setTargetFundId(f.id)}
                          >
                            <View style={[styles.fundOptionBadge, { backgroundColor: f.color || Colors.primaryDark }]}>
                              <MaterialIcons name={(f.icon as any) || 'savings'} size={16} color="#FFF" />
                            </View>
                            <View style={styles.fundOptionDetails}>
                              <Text style={[styles.fundOptionName, isSelected && styles.fundOptionNameActive]}>
                                {f.name}
                              </Text>
                              <Text style={styles.fundOptionBalance}>
                                {formatMoney(f.balance, f.currency, locale)}
                              </Text>
                            </View>
                            {isSelected && (
                              <MaterialIcons name="check" size={18} color={Colors.primaryStrong} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <MoneyInput
                  label={t('funds.amount')}
                  currency={currency}
                  valueMinor={transferAmount}
                  onChangeMinor={setTransferAmount}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('funds.note')}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t('funds.notePlaceholder')}
                  placeholderTextColor={Colors.light.textSecondary}
                  value={transferNote}
                  onChangeText={setTransferNote}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title={t('common.confirm')}
                variant="primary"
                onPress={handleExecuteTransfer}
                loading={transferring}
                disabled={transferAmount <= 0}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* MODAL 3: Delete Fund with remaining balance */}
      <Modal
        visible={deleteModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <SafeAreaView style={styles.modalRoot} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('funds.deleteTitle')}</Text>
            <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.warningBox}>
              <MaterialIcons name="warning" size={24} color="#C62828" />
              <Text style={styles.warningBoxText}>
                {t('funds.deleteNonEmptyPrompt', {
                  amount: formatMoney(deletingFund?.balance ?? 0, currency, locale),
                })}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.deleteOptionCard, deleteAction === 'refund_to_wallet' && styles.deleteOptionCardActive]}
              onPress={() => setDeleteAction('refund_to_wallet')}
            >
              <View style={styles.radioRow}>
                <MaterialIcons
                  name={deleteAction === 'refund_to_wallet' ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={20}
                  color={deleteAction === 'refund_to_wallet' ? Colors.primaryStrong : Colors.light.textSecondary}
                />
                <Text style={styles.deleteOptionTitle}>{t('funds.refundToWallet')}</Text>
              </View>
              <Text style={styles.deleteOptionDesc}>
                {formatMoney(deletingFund?.balance ?? 0, currency, locale)} → {t('funds.sourceWallet')}
              </Text>
            </TouchableOpacity>

            {funds.filter((f) => f.id !== deletingFund?.id).length > 0 && (
              <TouchableOpacity
                style={[styles.deleteOptionCard, deleteAction === 'transfer_to_fund' && styles.deleteOptionCardActive]}
                onPress={() => setDeleteAction('transfer_to_fund')}
              >
                <View style={styles.radioRow}>
                  <MaterialIcons
                    name={deleteAction === 'transfer_to_fund' ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={20}
                    color={deleteAction === 'transfer_to_fund' ? Colors.primaryStrong : Colors.light.textSecondary}
                  />
                  <Text style={styles.deleteOptionTitle}>{t('funds.transferToAnother')}</Text>
                </View>

                {deleteAction === 'transfer_to_fund' && (
                  <View style={styles.targetFundsList}>
                    {funds
                      .filter((f) => f.id !== deletingFund?.id)
                      .map((f) => {
                        const isSelected = f.id === deleteTargetFundId;
                        return (
                          <TouchableOpacity
                            key={f.id}
                            style={[styles.fundSelectOption, isSelected && styles.fundSelectOptionActive]}
                            onPress={() => setDeleteTargetFundId(f.id)}
                          >
                            <View style={[styles.fundOptionBadge, { backgroundColor: f.color || Colors.primaryDark }]}>
                              <MaterialIcons name={(f.icon as any) || 'savings'} size={16} color="#FFF" />
                            </View>
                            <View style={styles.fundOptionDetails}>
                              <Text style={[styles.fundOptionName, isSelected && styles.fundOptionNameActive]}>
                                {f.name}
                              </Text>
                              <Text style={styles.fundOptionBalance}>
                                {formatMoney(f.balance, f.currency, locale)}
                              </Text>
                            </View>
                            {isSelected && (
                              <MaterialIcons name="check" size={18} color={Colors.primaryStrong} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={t('common.confirm')}
              variant="primary"
              onPress={handleConfirmDeleteWithBalance}
              loading={deleting}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODAL 4: Fund History Modal */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <SafeAreaView style={styles.modalRoot} edges={['top', 'left', 'right']}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{historyFund?.name}</Text>
              <Text style={styles.modalSubtitle}>{t('funds.transactions')}</Text>
            </View>
            <TouchableOpacity onPress={() => setHistoryModalVisible(false)} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {loadingHistory ? (
              <Text style={styles.emptyDesc}>{t('common.loading')}</Text>
            ) : historyTransactions.length === 0 ? (
              <Card variant="flat" style={styles.emptyCard}>
                <MaterialIcons name="history" size={40} color={Colors.light.textSecondary} />
                <Text style={styles.emptyTitle}>{t('funds.noTransactions')}</Text>
              </Card>
            ) : (
              historyTransactions.map((tx) => {
                const isDeposit = tx.type === 'fund_deposit';
                const isWithdrawal = tx.type === 'fund_withdrawal';
                const isTransfer = tx.type === 'fund_transfer';
                const isIncome = tx.type === 'income';
                const isExpense = tx.type === 'expense';

                const isCredit = isDeposit || isIncome || (isTransfer && tx.to_fund_id === historyFund?.id);
                const isDebit = isWithdrawal || isExpense || (isTransfer && tx.fund_id === historyFund?.id);

                const typeLabel = isDeposit
                  ? t('transactions.fund_deposit')
                  : isWithdrawal
                  ? t('transactions.fund_withdrawal')
                  : isTransfer
                  ? t('transactions.fund_transfer')
                  : isIncome
                  ? t('transactions.income')
                  : t('transactions.expense');

                return (
                  <Card key={tx.id} style={styles.historyCard}>
                    <View style={styles.historyLeft}>
                      <View
                        style={[
                          styles.historyIconBadge,
                          {
                            backgroundColor: isCredit
                              ? '#E8F5E9'
                              : isDebit
                              ? '#FFEBEE'
                              : Colors.light.backgroundElement,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={
                            isCredit
                              ? 'arrow-downward'
                              : isDebit
                              ? 'arrow-upward'
                              : 'swap-horiz'
                          }
                          size={18}
                          color={isCredit ? Colors.income : Colors.expense}
                        />
                      </View>
                      <View style={styles.historyDetails}>
                        <Text style={styles.historyType}>{typeLabel}</Text>
                        {tx.note ? <Text style={styles.historyNote}>{tx.note}</Text> : null}
                        <Text style={styles.historyDate}>
                          {formatDateDisplay(tx.date, locale.startsWith('en') ? 'en' : 'vi')}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.historyAmount,
                        { color: isCredit ? Colors.income : Colors.expense },
                      ]}
                    >
                      {isCredit ? '+' : '-'}
                      {formatMoney(tx.amount, tx.currency, locale)}
                    </Text>
                  </Card>
                );
              })
            )}
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
  headerTitleContainer: {
    gap: 2,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: Colors.primaryStrong,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundElement,
    gap: 14,
  },
  summaryTop: {
    alignItems: 'center',
    gap: 4,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryStrong,
    textTransform: 'uppercase',
  },
  totalAssetsAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.light.text,
  },
  summarySplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 12,
  },
  splitItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  splitIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  splitLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  splitValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
  },
  splitDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.light.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  createBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundElement,
  },
  createBtnHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryStrong,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  emptyActionBtn: {
    marginTop: 8,
  },
  fundCard: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  fundCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fundIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fundHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  fundName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  fundDesc: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  reorderGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  reorderBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: Colors.light.backgroundElement,
  },
  progressSection: {
    gap: 6,
  },
  progressContainer: {
    height: 8,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  targetValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: 1,
    borderTopColor: Colors.light.backgroundElement,
    paddingTop: 10,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.backgroundElement,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundElement,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
  },
  iconOnlyBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundElement,
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
  },
  keyboardAvoid: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
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
  targetToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  checkboxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxActive: {},
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  contextBanner: {
    padding: 14,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    gap: 6,
  },
  contextLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  contextValue: {
    fontWeight: '700',
    color: Colors.light.text,
  },
  targetFundsList: {
    gap: 8,
  },
  fundSelectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  fundSelectOptionActive: {
    borderColor: Colors.primaryStrong,
    backgroundColor: Colors.light.backgroundElement,
  },
  fundOptionBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fundOptionDetails: {
    flex: 1,
    gap: 2,
  },
  fundOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  fundOptionNameActive: {
    color: Colors.primaryStrong,
  },
  fundOptionBalance: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
  },
  warningBoxText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#C62828',
  },
  deleteOptionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    gap: 10,
  },
  deleteOptionCardActive: {
    borderColor: Colors.primaryStrong,
    backgroundColor: Colors.light.backgroundElement,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  deleteOptionDesc: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginLeft: 28,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  historyIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDetails: {
    flex: 1,
    gap: 2,
  },
  historyType: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  historyNote: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  historyDate: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
});

