import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LockHeroScenery, LockStatus } from '@/components/scenery';
import { Colors } from '@/constants/theme';
import {
  isBiometricsAvailable,
  isBiometricsEnabled,
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
    async function checkBio() {
      const avail = (await isBiometricsAvailable()) && (await isBiometricsEnabled());
      setCanBiometric(avail);
      if (avail) {
        handleBiometric();
      }
    }
    checkBio();
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
      <View style={styles.content}>
        <View style={styles.hero}>
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
  hero: {
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  card: {
    gap: 16,
  },
});
