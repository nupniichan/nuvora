import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CurrencySwitchCard } from '@/components/ui/currency-switch-card';
import { Colors, MaxContentWidth } from '@/constants/theme';
import { getAppLanguage, setAppLanguage } from '@/i18n';
import { lockApp } from '@/services/security/auth-service';

export default function MoreScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const currentLang = (i18n.language?.startsWith('en') || getAppLanguage() === 'en') ? 'en' : 'vi';

  const toggleLanguage = async () => {
    const nextLang = currentLang === 'vi' ? 'en' : 'vi';
    await setAppLanguage(nextLang);
  };

  const handleLock = () => {
    lockApp();
    router.replace('/(auth)/lock');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageHeader}>
          <Text style={styles.eyebrow}>NUVORA</Text>
          <Text style={styles.title}>{t('settings.title')}</Text>
        </View>

        <Card variant="flat" style={styles.brandCard}>
          <View style={styles.brandIcon}><MaterialIcons name="spa" size={28} color={Colors.primaryStrong} /></View>
          <View style={styles.brandInfo}>
            <Text style={styles.brandTitle}>{t('settings.personalSpace')}</Text>
            <Text style={styles.brandDescription}>{t('settings.personalSpaceDescription')}</Text>
          </View>
        </Card>

        <CurrencySwitchCard />

        {}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>{t('settings.security')}</Text>
          <Button title={t('accountSecurity.changePassword')} variant="outline" onPress={() => router.push({ pathname: '/(modal)/account-security', params: { action: 'password' } })} />
          <Button title={t('accountSecurity.deleteAccount')} variant="destructive" onPress={() => router.push({ pathname: '/(modal)/account-security', params: { action: 'delete' } })} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.encryption')}</Text>
            <Text style={styles.rowValue}>
              {Platform.OS === 'web' ? 'WebCrypto AES-256-GCM' : 'SQLCipher + AES-256-GCM'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.kdf')}</Text>
            <Text style={styles.rowValue}>
              {Platform.OS === 'web' ? 'PBKDF2-SHA256' : 'Argon2id'}
            </Text>
          </View>
          <Button
            title={t('settings.lockNow')}
            icon={<MaterialIcons name="lock" size={18} color={Colors.primaryDark} />}
            onPress={handleLock}
            variant="outline"
            style={styles.lockBtn}
          />
        </Card>

        {}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>{t('settings.categoriesManagement')}</Text>
          <Text style={styles.sectionDesc}>{t('settings.categoriesDescription')}</Text>
          <Button
            title={t('settings.manageCategories')}
            icon={<MaterialIcons name="category" size={18} color={Colors.primaryDark} />}
            onPress={() => router.push('/(modal)/manage-categories' as any)}
            variant="outline"
          />
        </Card>

        {}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>{t('settings.backupRestore')}</Text>
          <Text style={styles.sectionDesc}>{t('settings.backupDescription')}</Text>
          <Button
            title={t('settings.openBackup')}
            icon={<MaterialIcons name="backup" size={18} color={Colors.primaryDark} />}
            onPress={() => router.push('/(modal)/backup-restore' as any)}
            variant="outline"
          />
        </Card>

        {}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>{t('settings.language')}</Text>
          <TouchableOpacity style={styles.row} onPress={toggleLanguage}>
            <Text style={styles.rowLabel}>{t('settings.interfaceLanguage')}</Text>
            <View style={styles.langValueContainer}>
              <MaterialIcons name="translate" size={16} color={Colors.primaryDark} />
              <Text style={styles.rowValue}>
                {currentLang === 'vi' ? 'Tiếng Việt' : 'English'}
              </Text>
            </View>
          </TouchableOpacity>
        </Card>

        {}
        <Card variant="flat" style={styles.aboutCard}>
          <Text style={styles.appTitle}>Nuvora</Text>
          <Text style={styles.appVersion}>1.0.0 · {t('settings.localFirstTagline')}</Text>
          <Text style={styles.appDesc}>{t('settings.privacyDescription')}</Text>
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
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 14,
  },
  pageHeader: {
    gap: 2,
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: Colors.primaryDark,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
  },
  sectionCard: {
    gap: 13,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryStrong,
    paddingBottom: 2,
  },
  sectionDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  rowLabel: {
    fontSize: 14,
    color: Colors.light.text,
  },
  rowValue: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryStrong,
    textAlign: 'right',
  },
  langValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockBtn: {
    marginTop: 6,
  },
  aboutCard: {
    alignItems: 'center',
    padding: 20,
    gap: 6,
    backgroundColor: Colors.primaryLight,
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
  brandCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.primaryLight, padding: 20 },
  brandIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: '#FFFFFF66', alignItems: 'center', justifyContent: 'center' },
  brandInfo: { flex: 1, gap: 4 },
  brandTitle: { fontSize: 17, fontWeight: '800', color: Colors.light.text },
  brandDescription: { fontSize: 12, lineHeight: 18, color: Colors.primaryStrong },
});
