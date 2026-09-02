import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';

export default function BudgetsScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('budgets.title')}</Text>

        <Card style={styles.card}>
          <Text style={styles.icon}>📊</Text>
          <Text style={styles.cardTitle}>Quản lý Ngân sách (Phase 1B)</Text>
          <Text style={styles.cardDesc}>
            Thiết lập quy tắc phân bổ cố định và phần trăm (%) chi tiêu cho từng danh mục.
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
  },
  card: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  icon: {
    fontSize: 40,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  cardDesc: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
