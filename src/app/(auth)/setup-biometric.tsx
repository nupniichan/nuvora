import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { completeOnboarding } from '@/features/onboarding/onboarding-service';
import { isBiometricsAvailable } from '@/services/security/auth-service';

export default function SetupBiometricScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    lang: string;
    currency: string;
    password: string;
    template: 'personal' | 'empty';
  }>();

  const [available, setAvailable] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function checkBiometricsSupport() {
      const isSupported = await isBiometricsAvailable();
      setAvailable(isSupported);
    }
    void checkBiometricsSupport();
  }, []);

  const handleChoice = async (enable: boolean) => {
    setLoading(true);
    try {
      await completeOnboarding({
        masterPassword: params.password,
        enableBiometrics: enable,
        currency: params.currency || 'VND',
        language: (params.lang as 'vi' | 'en') || 'vi',
        templateOption: params.template || 'personal',
      });

      router.replace('/(main)');
    } catch (error) {
      console.error('Failed onboarding completion', error);
      setLoading(false);
    }
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
            <MaterialIcons name="fingerprint" size={36} color={Colors.primaryDark} />
          </View>
          <Text style={styles.infoText}>
            {t(available ? 'onboarding.biometricAvailable' : 'onboarding.biometricUnavailable')}
          </Text>
        </Card>
      </View>

      <View style={styles.footer}>
        {available ? (
          <Button
            title={t('onboarding.enableBiometrics')}
            onPress={() => handleChoice(true)}
            variant="primary"
            loading={loading}
          />
        ) : null}
        <Button
          title={t('onboarding.skipForNow')}
          onPress={() => handleChoice(false)}
          variant="outline"
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
