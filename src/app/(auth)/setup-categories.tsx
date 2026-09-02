import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { completeOnboarding } from '@/features/onboarding/onboarding-service';

export default function SetupCategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    lang?: string;
    password?: string;
    enableBiometrics?: string;
    currency?: string;
  }>();

  const [selectedTemplate, setSelectedTemplate] = useState<'personal' | 'empty'>('personal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async () => {
    setLoading(true);
    setError(null);
    try {
      await completeOnboarding({
        masterPassword: params.password || '',
        enableBiometrics: params.enableBiometrics === 'true',
        currency: params.currency || 'VND',
        language: (params.lang as 'vi' | 'en') || 'vi',
        templateOption: selectedTemplate,
      });

      router.replace('/(main)');
    } catch (e: any) {
      setError(e.message || 'Setup failed');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('onboarding.templateTitle')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.templateSubtitle')}</Text>
        </View>

        <View style={styles.templateList}>
          <TouchableOpacity
            onPress={() => setSelectedTemplate('personal')}
            activeOpacity={0.8}
          >
            <Card
              style={[
                styles.card,
                selectedTemplate === 'personal' && styles.selectedCard,
              ]}
            >
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>📦</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.cardTitle}>{t('onboarding.templatePersonal')}</Text>
                <Text style={styles.cardDesc}>
                  {params.lang === 'en'
                    ? 'Includes common income & expense categories (Food, Housing, Utilities...)'
                    : 'Bao gồm các danh mục chi tiêu & thu nhập phổ biến (Ăn uống, Tiền nhà, Hóa đơn...)'}
                </Text>
              </View>
              {selectedTemplate === 'personal' ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : null}
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedTemplate('empty')}
            activeOpacity={0.8}
          >
            <Card
              style={[
                styles.card,
                selectedTemplate === 'empty' && styles.selectedCard,
              ]}
            >
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>📝</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.cardTitle}>{t('onboarding.templateEmpty')}</Text>
                <Text style={styles.cardDesc}>
                  {params.lang === 'en'
                    ? 'Start with zero categories and build your own from scratch.'
                    : 'Bắt đầu từ trang trắng và tự tạo các danh mục của riêng bạn.'}
                </Text>
              </View>
              {selectedTemplate === 'empty' ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : null}
            </Card>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <Button
          title={t('common.done')}
          onPress={handleFinish}
          variant="accent"
          loading={loading}
        />
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
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  templateList: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  selectedCard: {
    borderColor: Colors.accent,
    borderWidth: 2,
    backgroundColor: Colors.primaryFaded,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 16,
  },
  checkmark: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.accent,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
  footer: {
    padding: 24,
  },
});
