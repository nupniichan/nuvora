import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { isBiometricsAvailable } from '@/services/security/auth-service';

export default function SetupBiometricScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string; password?: string }>();

  const [available, setAvailable] = useState<boolean>(false);

  useEffect(() => {
    async function checkBio() {
      const isAvail = await isBiometricsAvailable();
      setAvailable(isAvail);
    }
    checkBio();
  }, []);

  const handleChoice = (enable: boolean) => {
    router.push({
      pathname: '/(auth)/setup-currency',
      params: {
        lang: params.lang || 'vi',
        password: params.password,
        enableBiometrics: enable ? 'true' : 'false',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('onboarding.biometricTitle')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.biometricSubtitle')}</Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>👆</Text>
          </View>
          <Text style={styles.infoText}>
            {available
              ? params.lang === 'en'
                ? 'Biometrics detected on your device. Enable for fast unlocking.'
                : 'Thiết bị của bạn hỗ trợ sinh trắc học. Bật để mở khóa nhanh chóng.'
              : params.lang === 'en'
              ? 'Biometrics is not available or not enrolled on this device.'
              : 'Thiết bị chưa cài đặt hoặc không hỗ trợ sinh trắc học.'}
          </Text>
        </Card>
      </View>

      <View style={styles.footer}>
        {available ? (
          <Button
            title={t('onboarding.enableBiometrics')}
            onPress={() => handleChoice(true)}
            variant="accent"
          />
        ) : null}
        <Button
          title={t('onboarding.skipForNow')}
          onPress={() => handleChoice(false)}
          variant="outline"
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
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 40,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  footer: {
    padding: 24,
    gap: 12,
  },
});
