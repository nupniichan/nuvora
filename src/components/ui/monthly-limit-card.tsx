import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { MonthlySnapshot } from '@/features/budgets/budget-queries';
import { formatMoney } from '@/shared/money';
import { Card } from './card';

export function MonthlyLimitCard({ snapshot }: { snapshot: MonthlySnapshot }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN';
  const router = useRouter();
  const { monthlyLimit: limit, totalExpense: spent, currency, year, month } = snapshot;
  const over = limit !== null && spent > limit;
  const color = over ? Colors.expense : Colors.primaryDark;
  return <Card style={styles.card}>
    <TouchableOpacity accessibilityRole="button" onPress={() => router.push({ pathname: '/(modal)/manage-budget', params: { year, month } })} style={styles.row}>
      <Text style={styles.title}>{t('budgets.totalMonthlyLimit')}</Text>
      <MaterialIcons name="tune" size={22} color={Colors.primaryDark} />
    </TouchableOpacity>
    {limit === null ? <Text style={styles.detail}>{t('monthlyLimit.notSet')}</Text> : <>
      <Text style={[styles.amount, { color }]}>{formatMoney(spent, currency, locale)} / {formatMoney(limit, currency, locale)}</Text>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.min(100, Math.round(spent / limit * 100)) }} style={styles.track}>
        <View style={{ height: 7, borderRadius: 8, width: `${Math.min(100, spent / limit * 100)}%`, backgroundColor: color }} />
      </View>
      <Text style={[styles.detail, { color }]}>{t(over ? 'monthlyLimit.over' : 'monthlyLimit.remaining', { amount: formatMoney(Math.abs(limit - spent), currency, locale) })}</Text>
    </>}
  </Card>;
}

const styles = StyleSheet.create({
  card: { padding: 18, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.light.text },
  amount: { fontSize: 18, fontWeight: '700' },
  detail: { fontSize: 13, color: Colors.light.textSecondary },
  track: { height: 7, borderRadius: 8, backgroundColor: Colors.light.backgroundElement, overflow: 'hidden' },
});
