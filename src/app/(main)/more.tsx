import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import i18n from '@/i18n';
import { lockApp } from '@/services/security/auth-service';

export default function MoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const toggleLanguage = () => {
    const nextLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(nextLang);
    setCurrentLang(nextLang);
  };

  const handleLock = () => {
    lockApp();
    router.replace('/(auth)/lock');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('settings.title')}</Text>

        {/* Security Info Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>{t('settings.security')}</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Mã hóa dữ liệu</Text>
            <Text style={styles.rowValue}>SQLCipher + AES-256</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Khóa mật khẩu (KDF)</Text>
            <Text style={styles.rowValue}>Argon2id</Text>
          </View>
          <Button
            title="🔒 Khóa ứng dụng ngay"
            onPress={handleLock}
            variant="outline"
            style={styles.lockBtn}
          />
        </Card>

        {/* Preferences Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>{t('settings.language')}</Text>
          <TouchableOpacity style={styles.row} onPress={toggleLanguage}>
            <Text style={styles.rowLabel}>Ngôn ngữ giao diện</Text>
            <Text style={styles.rowValue}>
              {currentLang === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English'}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* About App */}
        <Card variant="flat" style={styles.aboutCard}>
          <Text style={styles.appTitle}>Nuvora</Text>
          <Text style={styles.appVersion}>Version 1.0.0 — Local-First Personal Finance</Text>
          <Text style={styles.appDesc}>
            Dữ liệu tài chính được lưu trữ và bảo mật trực tiếp trên thiết bị của bạn.
          </Text>
        </Card>
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
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
  },
  sectionCard: {
    gap: 14,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundElement,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowLabel: {
    fontSize: 14,
    color: Colors.light.text,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  lockBtn: {
    marginTop: 6,
  },
  aboutCard: {
    alignItems: 'center',
    padding: 20,
    gap: 6,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  appVersion: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  appDesc: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
