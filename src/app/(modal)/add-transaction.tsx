import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Colors } from '@/constants/theme';
import { AccountRow, CategoryRow, TransactionType } from '@/database/types';
import { getAllAccounts } from '@/features/accounts/account-queries';
import { createTransaction } from '@/features/transactions/transaction-queries';
import { formatDateISO } from '@/shared/date-utils';

export default function AddTransactionModal() {
  const { t } = useTranslation();
  const router = useRouter();

  const [type, setType] = useState<TransactionType>('expense');
  const [amountMinor, setAmountMinor] = useState<number>(0);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(formatDateISO(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccounts() {
      const accs = await getAllAccounts();
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

  const activeAccount = accounts.find((a) => a.id === selectedAccountId);
  const currency = activeAccount ? activeAccount.currency : 'VND';

  const handleSave = async () => {
    if (amountMinor <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (!selectedAccountId) {
      setError('Vui lòng chọn tài khoản');
      return;
    }
    if (type === 'transfer' && !toAccountId) {
      setError('Vui lòng chọn tài khoản đích');
      return;
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
        <Text style={styles.title}>{t('transactions.quickAdd')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
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

          <TouchableOpacity
            style={[styles.segmentBtn, type === 'transfer' && styles.activeTransfer]}
            onPress={() => setType('transfer')}
          >
            <Text style={[styles.segmentText, type === 'transfer' && styles.activeText]}>
              {t('transactions.transfer')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <MoneyInput
          label={t('transactions.amount')}
          currency={currency}
          valueMinor={amountMinor}
          onChangeMinor={setAmountMinor}
        />

        {/* Account Selector */}
        <Card style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>{t('transactions.account')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipList}>
            {accounts.map((acc) => {
              const isSelected = acc.id === selectedAccountId;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.chip, isSelected && styles.selectedChip]}
                  onPress={() => setSelectedAccountId(acc.id)}
                >
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
            <Text style={styles.fieldLabel}>{t('transactions.toAccount')}</Text>
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
                      <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </Card>
        ) : null}

        {/* Note Input */}
        <Input
          label={t('transactions.note')}
          placeholder="Nhập ghi chú chi tiêu..."
          value={note}
          onChangeText={setNote}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={t('common.save')}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    color: Colors.light.textSecondary,
  },
  content: {
    padding: 20,
    gap: 18,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: 4,
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
  activeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeExpense: {
    backgroundColor: Colors.expense,
  },
  activeIncome: {
    backgroundColor: Colors.income,
  },
  activeTransfer: {
    backgroundColor: Colors.transfer,
  },
  fieldCard: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  chipList: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  selectedChip: {
    backgroundColor: Colors.primaryFaded,
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  selectedChipText: {
    color: Colors.accent,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
});
