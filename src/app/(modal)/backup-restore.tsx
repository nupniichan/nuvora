import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors } from '@/constants/theme';
import {
  RestoreResult,
  createEncryptedBackup,
  restoreFromEncryptedBackup,
} from '@/services/backup/backup-service';

export default function BackupRestoreModal() {
  const { t } = useTranslation();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [backupPassword, setBackupPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [backupOutput, setBackupOutput] = useState('');
  const [restoreInput, setRestoreInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restoreStats, setRestoreStats] = useState<RestoreResult | null>(null);

  const handleCreateBackup = async () => {
    if (!backupPassword.trim()) {
      setErrorMessage(t('backup.passwordRequired'));
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const encryptedData = await createEncryptedBackup(backupPassword);
      setBackupOutput(encryptedData);
      setStatusMessage(t('backup.created'));
    } catch (e: any) {
      setErrorMessage(e.message || t('backup.createError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = () => {
    if (!backupOutput) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([backupOutput], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nuvora_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      Alert.alert(t('backup.copyTitle'), t('backup.copyDescription'));
    }
  };

  const handlePerformRestore = async () => {
    if (!restoreInput.trim()) {
      setErrorMessage(t('backup.contentRequired'));
      return;
    }
    if (!restorePassword.trim()) {
      setErrorMessage(t('backup.restorePasswordRequired'));
      return;
    }

    Alert.alert(
      t('backup.confirmTitle'),
      t('backup.confirmDescription'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('backup.restoreNow'),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            setErrorMessage(null);
            setStatusMessage(null);
            try {
              const res = await restoreFromEncryptedBackup(restoreInput.trim(), restorePassword);
              setRestoreStats(res);
              setStatusMessage(t('backup.restored'));
            } catch (e: any) {
              setErrorMessage(e.message || t('backup.restoreError'));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.backupRestore')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      {/* Mode Segment */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'backup' && styles.activeTabBtn]}
          onPress={() => {
            setActiveTab('backup');
            setErrorMessage(null);
            setStatusMessage(null);
          }}
        >
          <MaterialIcons
            name="cloud-upload"
            size={18}
            color={activeTab === 'backup' ? '#1A1C2E' : Colors.light.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'backup' && styles.activeTabText]}>
            {t('settings.backup')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'restore' && styles.activeTabBtn]}
          onPress={() => {
            setActiveTab('restore');
            setErrorMessage(null);
            setStatusMessage(null);
          }}
        >
          <MaterialIcons
            name="settings-backup-restore"
            size={18}
            color={activeTab === 'restore' ? '#1A1C2E' : Colors.light.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'restore' && styles.activeTabText]}>
            {t('settings.restore')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {errorMessage && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </Card>
        )}

        {statusMessage && (
          <Card style={styles.successCard}>
            <Text style={styles.successText}>{statusMessage}</Text>
          </Card>
        )}

        {activeTab === 'backup' ? (
          <>
            <Card variant="flat" style={styles.infoBox}>
              <MaterialIcons name="security" size={24} color={Colors.primaryDark} />
              <Text style={styles.infoText}>{t('backup.backupInfo')}</Text>
            </Card>

            <Input
              label={t('backup.backupPassword')}
              placeholder={t('backup.passwordPlaceholder')}
              secureTextEntry
              value={backupPassword}
              onChangeText={setBackupPassword}
            />

            <Button
              title={t('backup.createEncrypted')}
              onPress={handleCreateBackup}
              loading={loading}
              variant="primary"
            />

            {backupOutput ? (
              <View style={styles.outputSection}>
                <View style={styles.outputHeader}>
                  <Text style={styles.outputLabel}>{t('backup.encryptedJson')}</Text>
                  <Button
                    title={t('backup.download')}
                    variant="outline"
                    onPress={handleDownloadFile}
                    icon={<MaterialIcons name="download" size={16} color={Colors.primaryDark} />}
                  />
                </View>

                <TextInput
                  style={styles.codeBox}
                  multiline
                  editable={false}
                  value={backupOutput}
                />
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Card variant="flat" style={styles.infoBox}>
              <MaterialIcons name="phonelink" size={24} color={Colors.primaryDark} />
              <Text style={styles.infoText}>{t('backup.restoreInfo')}</Text>
            </Card>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>{t('backup.encryptedContent')}</Text>
              <TextInput
                style={[styles.codeBox, styles.inputCodeBox]}
                multiline
                placeholder={t('backup.contentPlaceholder')}
                placeholderTextColor={Colors.light.textSecondary}
                value={restoreInput}
                onChangeText={setRestoreInput}
              />
            </View>

            <Input
              label={t('backup.restorePassword')}
              placeholder={t('backup.restorePasswordPlaceholder')}
              secureTextEntry
              value={restorePassword}
              onChangeText={setRestorePassword}
            />

            <Button
              title={t('backup.restoreData')}
              onPress={handlePerformRestore}
              loading={loading}
              variant="primary"
              style={styles.restoreBtn}
            />

            {restoreStats && (
              <Card style={styles.statsCard}>
                <Text style={styles.statsTitle}>{t('backup.result')}</Text>
                <Text style={styles.statLine}>
                  • {t('backup.accounts', { count: restoreStats.accountsRestored })}
                </Text>
                <Text style={styles.statLine}>
                  • {t('backup.transactions', { count: restoreStats.transactionsRestored })}
                </Text>
                <Text style={styles.statLine}>
                  • {t('backup.budgets', { count: restoreStats.budgetsRestored })}
                </Text>
                <Text style={styles.statLine}>
                  • {t('backup.recurring', { count: restoreStats.recurringRulesRestored })}
                </Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
  },
  closeBtn: {
    padding: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundElement,
  },
  activeTabBtn: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeTabText: {
    color: '#1A1C2E',
    fontWeight: '700',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
  },
  errorText: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '600',
  },
  successCard: {
    backgroundColor: '#E8F5E9',
  },
  successText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    backgroundColor: Colors.light.backgroundElement,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  outputSection: {
    gap: 8,
    marginTop: 8,
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  codeBox: {
    height: 140,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: 12,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: Colors.light.text,
    textAlignVertical: 'top',
  },
  inputGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  inputCodeBox: {
    height: 120,
  },
  restoreBtn: {
    marginTop: 6,
  },
  statsCard: {
    padding: 14,
    gap: 6,
    backgroundColor: '#F1F8E9',
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2E7D32',
  },
  statLine: {
    fontSize: 13,
    color: Colors.light.text,
  },
});
