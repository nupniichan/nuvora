import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LockHeroScenery, LockStatus } from '@/components/scenery';
import { Colors } from '@/constants/theme';
import {
  isBiometricsAvailable,
  isBiometricsEnabled,
  lockApp,
  unlockWithBiometrics,
  unlockWithPassword,
} from '@/services/security/auth-service';

export default function LockScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [canBiometric, setCanBiometric] = useState(false);
  const [lockStatus, setLockStatus] = useState<LockStatus>('locked');

  const handleUnlockComplete = useCallback(() => {
    router.replace('/(main)');
  }, [router]);

  const handleBiometric = useCallback(async () => {
    const success = await unlockWithBiometrics();
    if (success) {
      setLockStatus('unlocked');
    }
  }, []);

  useEffect(() => {
    lockApp();
    async function checkBiometrics() {
      const isAvailable = (await isBiometricsAvailable()) && (await isBiometricsEnabled());
      setCanBiometric(isAvailable);
      if (isAvailable) {
        handleBiometric();
      }
    }
    void checkBiometrics();
  }, [handleBiometric]);

  const handlePasswordUnlock = async () => {
    setLoading(true);
    setError(null);
    const success = await unlockWithPassword(password);
    setLoading(false);
    if (success) {
      setLockStatus('unlocked');
    } else {
      setError(t('onboarding.passwordMismatch'));
      setLockStatus('error');
      setTimeout(() => {
        setLockStatus('locked');
      }, 650);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <LockHeroScenery
            status={lockStatus}
            onUnlockComplete={handleUnlockComplete}
          />
          <Text style={styles.title}>Nuvora</Text>
          <Text style={styles.subtitle}>{t('onboarding.lockSubtitle')}</Text>
        </View>

        <Card style={styles.card}>
          <Input
            placeholder={t('onboarding.passwordPlaceholder')}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={error ?? undefined}
          />
          <Button
            title={t('common.confirm')}
            onPress={handlePasswordUnlock}
            variant="primary"
            loading={loading}
          />
        </Card>

        {canBiometric ? (
          <Button
            title={t('onboarding.unlockBiometric')}
            icon={<MaterialIcons name="fingerprint" size={20} color={Colors.primaryDark} />}
            onPress={handleBiometric}
            variant="outline"
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'center',
    gap: 32,
  },
  heroSection: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  card: {
    gap: 16,
  },
});
