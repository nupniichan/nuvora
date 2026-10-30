import { useTheme } from '@/hooks/use-theme';
import { createMoreStyles } from './more.styles';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CurrencySwitchCard } from '@/components/ui/currency-switch-card';
import { TimezonePickerModal } from '@/components/ui/timezone-picker-modal';
import { Colors } from '@/constants/theme';
import { getAppLanguage, setAppLanguage } from '@/i18n';
import {
  BackupReminderConfig,
  getBackupReminderConfig,
} from '@/services/backup/backup-reminder';
import { lockApp } from '@/services/security/auth-service';
import {
  SYSTEM_TIMEZONE_VALUE,
  TIMEZONE_OPTIONS,
  getPreferredGmt,
  getSystemGmtString,
  setPreferredGmt,
} from '@/services/timezone/timezone-service';
import { formatDateDisplay } from '@/shared/date-utils';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MoreScreen() {
  const theme = useTheme();
  const styles = createMoreStyles(theme);
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const currentLang = (i18n.language?.startsWith('en') || getAppLanguage() === 'en') ? 'en' : 'vi';

  const [backupConfig, setBackupConfig] = useState<BackupReminderConfig | null>(null);
  const [preferredGmt, setPreferredGmtState] = useState<string>(SYSTEM_TIMEZONE_VALUE);
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getBackupReminderConfig()
        .then(setBackupConfig)
        .catch(() => undefined);
      getPreferredGmt()
        .then(setPreferredGmtState)
        .catch(() => undefined);
    }, [])
  );

  const handleSelectTimezone = async (gmt: string) => {
    await setPreferredGmt(gmt);
    setPreferredGmtState(gmt);
  };

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

        <CurrencySwitchCard />

        { }
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

        { }
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

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>{t('settings.backupRestore')}</Text>
          <Text style={styles.sectionDesc}>{t('settings.backupDescription')}</Text>
          {backupConfig && (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('backup.reminderTitle')}</Text>
                <Text style={styles.rowValue}>
                  {backupConfig.enabled && backupConfig.frequency !== 'off'
                    ? backupConfig.frequency === 'custom'
                      ? t('backup.customDaysSummary', { days: backupConfig.customDays || 7 })
                      : t(`backup.freq${backupConfig.frequency.charAt(0).toUpperCase() + backupConfig.frequency.slice(1)}`)
                    : t('backup.freqOff')}
                </Text>
              </View>
              {backupConfig.targetFolderName ? (
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{t('backup.chooseFolder')}</Text>
                  <Text style={styles.rowValue}>
                    {backupConfig.targetFolderName} {backupConfig.autoSaveToFolder ? `(${t('backup.autoSaveEnabled')})` : ''}
                  </Text>
                </View>
              ) : null}
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('backup.lastBackupTime')}</Text>
                <Text style={styles.rowValue}>
                  {backupConfig.lastBackupAt
                    ? formatDateDisplay(backupConfig.lastBackupAt, i18n.language)
                    : t('backup.neverBackedUp')}
                </Text>
              </View>
            </>
          )}
          <Button
            title={t('settings.openBackup')}
            icon={<MaterialIcons name="backup" size={18} color={Colors.primaryDark} />}
            onPress={() => router.push('/(modal)/backup-restore' as any)}
            variant="outline"
          />
        </Card>

        {/* Language & Timezone */}
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

          <View style={styles.cardDivider} />

          <TouchableOpacity style={styles.row} onPress={() => setShowTimezoneModal(true)}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.rowLabel}>{t('settings.timezone')}</Text>
              <Text style={styles.sectionDesc}>
                {preferredGmt === SYSTEM_TIMEZONE_VALUE
                  ? `${t('settings.systemDefaultTimezone')} (${getSystemGmtString()})`
                  : (TIMEZONE_OPTIONS.find((o) => o.key === preferredGmt)
                    ? `${preferredGmt} - ${currentLang === 'vi' ? TIMEZONE_OPTIONS.find((o) => o.key === preferredGmt)?.nameVi : TIMEZONE_OPTIONS.find((o) => o.key === preferredGmt)?.nameEn}`
                    : preferredGmt)}
              </Text>
            </View>
            <View style={styles.langValueContainer}>
              <MaterialIcons name="schedule" size={16} color={Colors.primaryDark} />
              <Text style={styles.rowValue}>
                {preferredGmt === SYSTEM_TIMEZONE_VALUE
                  ? t('settings.systemDefaultTimezone')
                  : preferredGmt}
              </Text>
              <MaterialIcons name="chevron-right" size={18} color={Colors.light.textSecondary} />
            </View>
          </TouchableOpacity>
        </Card>

        {/* About Card */}
        <Card variant="flat" style={styles.aboutCard}>
          <Text style={styles.appTitle}>Nuvora</Text>
          <Text style={styles.appVersion}>1.1.0 · {t('settings.localFirstTagline')}</Text>
          <Text style={styles.appDesc}>{t('settings.privacyDescription')}</Text>
        </Card>

        <TimezonePickerModal
          visible={showTimezoneModal}
          currentGmt={preferredGmt}
          onSelect={handleSelectTimezone}
          onClose={() => setShowTimezoneModal(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
