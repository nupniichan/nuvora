import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors } from '@/constants/theme';
import { validatePassword } from '@/shared/validators';

export default function SetupPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    setError(null);
    const valid = validatePassword(password);
    if (!valid.isValid) {
      setError(t(valid.errorKey!));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('onboarding.passwordMismatch'));
      return;
    }

    router.push({
      pathname: '/(auth)/setup-biometric',
      params: {
        lang: params.lang || 'vi',
        password,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('onboarding.createPasswordTitle')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.createPasswordSubtitle')}</Text>
        </View>

        <Card style={styles.card}>
          <Input
            label={t('onboarding.createPasswordTitle')}
            placeholder={t('onboarding.passwordPlaceholder')}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Input
            label={t('common.confirm')}
            placeholder={t('onboarding.confirmPasswordPlaceholder')}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={error ?? undefined}
          />
        </Card>

        <Card variant="flat" style={styles.noticeCard}>
          <MaterialIcons name="lightbulb-outline" size={24} color={Colors.primary} />
          <Text style={styles.noticeText}>
            {params.lang === 'en'
              ? 'Keep this password safe. It is required to restore your encrypted backup on a new device.'
              : 'Lưu giữ mật khẩu này cẩn thận. Mật khẩu này là bắt buộc để khôi phục bản sao lưu mã hóa trên thiết bị mới.'}
          </Text>
        </Card>
      </View>

      <View style={styles.footer}>
        <Button title={t('common.next')} onPress={handleNext} variant="primary" />
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
    justifyContent: 'center',
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
  card: {
    gap: 16,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: Colors.primaryFaded,
    borderRadius: 12,
  },
  noticeIcon: {
    fontSize: 20,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 18,
  },
  footer: {
    padding: 24,
  },
});
