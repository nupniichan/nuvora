import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { BackupReminderStatus } from '@/services/backup/backup-reminder';

export interface BackupReminderCardProps {
  status: BackupReminderStatus;
  onBackupPress: () => void;
  onDismissPress: () => void;
}

export function BackupReminderCard({
  status,
  onBackupPress,
  onDismissPress,
}: BackupReminderCardProps) {
  const { t } = useTranslation();

  if (!status.isDue) return null;

  const isNever = status.reason === 'never_backed_up';
  const desc = isNever
    ? t('backup.bannerNeverDesc')
    : t('backup.bannerDueDesc', { days: status.daysSinceLastBackup ?? 7 });

  return (
    <Card variant="flat" style={styles.container}>
      <View style={styles.contentRow}>
        <View style={styles.iconBox}>
          <MaterialIcons name="cloud-upload" size={22} color={Colors.primaryStrong} />
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.title}>{t('backup.bannerTitle')}</Text>
          <Text style={styles.desc}>{desc}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={onDismissPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('backup.remindLater')}
        >
          <Text style={styles.dismissText}>{t('backup.remindLater')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onBackupPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('backup.backupNow')}
        >
          <MaterialIcons name="backup" size={16} color="#1A1C2E" />
          <Text style={styles.actionText}>{t('backup.backupNow')}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryStrong,
  },
  desc: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  dismissButton: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 9,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1C2E',
  },
});
