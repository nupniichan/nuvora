import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

  useEffect(() => {
    async function checkBio() {
      const avail = (await isBiometricsAvailable()) && (await isBiometricsEnabled());
      setCanBiometric(avail);
      if (avail) {
        handleBiometric();
      }
    }
    checkBio();
  }, []);

  const handlePasswordUnlock = async () => {
    setLoading(true);
    setError(null);
    const success = await unlockWithPassword(password);
    setLoading(false);
    if (success) {
      router.replace('/(main)');
    } else {
      setError(t('onboarding.passwordMismatch'));
    }
  };

  const handleBiometric = async () => {
    const success = await unlockWithBiometrics();
    if (success) {
      router.replace('/(main)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.iconBadge}>
            <Text style={styles.badgeText}>🔒</Text>
          </View>
          <Text style={styles.title}>Nuvora</Text>
          <Text style={styles.subtitle}>Nhập mật khẩu để mở khóa dữ liệu</Text>
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
            title="Mở khóa bằng Sinh trắc học 👆"
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
