import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors } from '@/constants/theme';
import { useSafeBack } from '@/hooks/use-safe-back';
import {
  BackupReminderFrequency,
  getBackupReminderConfig,
  setBackupReminderConfig,
} from '@/services/backup/backup-reminder';
import {
  RestoreResult,
  createEncryptedBackup,
  restoreFromEncryptedBackup,
} from '@/services/backup/backup-service';
import {
  WriteBackupResult,
  pickBackupFile,
  pickStorageFolder,
  writeBackupToFile,
} from '@/services/backup/backup-storage';
import { verifyMasterPassword } from '@/services/security/auth-service';
import { formatDateDisplay } from '@/shared/date-utils';
import { confirmAction } from '@/shared/dialog';

export default function BackupRestoreModal() {
  const { t, i18n } = useTranslation();
  const closeModal = useSafeBack('/(main)/more');

  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [backupPassword, setBackupPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [backupOutput, setBackupOutput] = useState('');
  const [restoreInput, setRestoreInput] = useState('');

  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderFrequency, setReminderFrequency] = useState<BackupReminderFrequency>('weekly');
  const [customDays, setCustomDays] = useState<number>(7);
  const [customDaysInput, setCustomDaysInput] = useState<string>('7');
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);

  const [targetFolderName, setTargetFolderName] = useState<string | null>(null);
  const [targetUri, setTargetUri] = useState<string | null>(null);
  const [autoSaveToFolder, setAutoSaveToFolder] = useState<boolean>(false);

  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);
  const [showManualJson, setShowManualJson] = useState(false);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restoreStats, setRestoreStats] = useState<RestoreResult | null>(null);

  const getBackupNoticeMessage = (res: WriteBackupResult): string => {
    switch (res.destination) {
      case 'folder':
        return t('backup.fileSavedToFolder', { folder: res.folderName || '', name: res.filename });
      case 'picker':
        return t('backup.fileSavedLocationPicker', { name: res.filename });
      case 'download':
        return t('backup.fileSavedLocationWeb', { name: res.filename });
      default:
        return t('backup.fileSavedLocationDefault', { name: res.filename });
    }
  };

  const loadReminderConfig = async () => {
    try {
      const cfg = await getBackupReminderConfig();
      setReminderEnabled(cfg.enabled);
      setReminderFrequency(cfg.frequency);
      if (cfg.customDays) {
        setCustomDays(cfg.customDays);
        setCustomDaysInput(String(cfg.customDays));
      }
      setLastBackupAt(cfg.lastBackupAt);
      setTargetFolderName(cfg.targetFolderName || null);
      setTargetUri(cfg.targetUri || null);
      setAutoSaveToFolder(!!cfg.autoSaveToFolder);
    } catch {
    }
  };

  useEffect(() => {
    loadReminderConfig();
  }, []);

  const handleToggleReminder = async (val: boolean) => {
    setReminderEnabled(val);
    await setBackupReminderConfig({ enabled: val });
  };

  const handleChangeFrequency = async (freq: BackupReminderFrequency) => {
    setReminderFrequency(freq);
    await setBackupReminderConfig({
      frequency: freq,
      customDays: freq === 'custom' ? customDays : undefined,
    });
  };

  const handleCustomDaysChange = async (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    setCustomDaysInput(clean);
    const parsed = parseInt(clean, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setCustomDays(parsed);
      await setBackupReminderConfig({ frequency: 'custom', customDays: parsed });
    }
  };

  const handleChooseFolder = async () => {
    try {
      const folder = await pickStorageFolder();
      if (!folder) return;

      setTargetFolderName(folder.folderName);
      setTargetUri(folder.uri || null);

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const allow = window.confirm(
          `${t('backup.autoSavePromptTitle')}\n\n${t('backup.autoSavePromptDesc', { folder: folder.folderName })}`
        );
        setAutoSaveToFolder(allow);
        await setBackupReminderConfig({
          targetFolderName: folder.folderName,
          targetUri: folder.uri || null,
          autoSaveToFolder: allow,
        });
        return;
      }

      Alert.alert(
        t('backup.autoSavePromptTitle'),
        t('backup.autoSavePromptDesc', { folder: folder.folderName }),
        [
          {
            text: t('backup.dontAllowAutoSave'),
            style: 'cancel',
            onPress: async () => {
              setAutoSaveToFolder(false);
              await setBackupReminderConfig({
                targetFolderName: folder.folderName,
                targetUri: folder.uri || null,
                autoSaveToFolder: false,
              });
            },
          },
          {
            text: t('backup.allowAutoSave'),
            onPress: async () => {
              setAutoSaveToFolder(true);
              await setBackupReminderConfig({
                targetFolderName: folder.folderName,
                targetUri: folder.uri || null,
                autoSaveToFolder: true,
              });
            },
          },
        ]
      );
    } catch (err: any) {
      setErrorMessage(err.message || t('backup.createError'));
    }
  };

  const handleToggleAutoSave = async (val: boolean) => {
    setAutoSaveToFolder(val);
    await setBackupReminderConfig({ autoSaveToFolder: val });
  };

  const handleCreateBackup = async () => {
    if (!backupPassword.trim()) {
      setErrorMessage(t('backup.passwordRequired'));
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setSavedNotice(null);

    const isMatch = await verifyMasterPassword(backupPassword.trim());
    if (!isMatch) {
      setLoading(false);
      setErrorMessage(t('backup.passwordMismatch'));
      return;
    }

    try {
      const encryptedData = await createEncryptedBackup(backupPassword);
      setBackupOutput(encryptedData);
      setStatusMessage(t('backup.created'));
      await loadReminderConfig();

      if (autoSaveToFolder && targetFolderName) {
        const filename = `nuvora_backup_${new Date().toISOString().slice(0, 10)}.json`;
        const res = await writeBackupToFile(encryptedData, filename, {
          folderName: targetFolderName,
          uri: targetUri,
        });
        if (res.success) {
          setSavedNotice(getBackupNoticeMessage(res));
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message || t('backup.createError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async () => {
    if (!backupOutput) return;

    const filename = `nuvora_backup_${new Date().toISOString().slice(0, 10)}.json`;
    const res = await writeBackupToFile(backupOutput, filename, {
      folderName: targetFolderName,
      uri: targetUri,
    });
    if (res.success) {
      setSavedNotice(getBackupNoticeMessage(res));
    }
  };

  const handlePickRestoreFile = async () => {
    try {
      const file = await pickBackupFile();
      if (!file) return;

      setSelectedFileName(file.name);
      setSelectedFileSize(file.size);
      setRestoreInput(file.content);
      setErrorMessage(null);
    } catch {
      setErrorMessage(t('backup.fileReadError'));
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

    confirmAction(
      t('backup.confirmTitle'),
      t('backup.confirmDescription'),
      async () => {
        setLoading(true);
        setErrorMessage(null);
        setStatusMessage(null);
        try {
          const res = await restoreFromEncryptedBackup(restoreInput.trim(), restorePassword);
          setRestoreStats(res);
          setStatusMessage(t('backup.restored'));
          await loadReminderConfig();
        } catch (e: any) {
          setErrorMessage(e.message || t('backup.restoreError'));
        } finally {
          setLoading(false);
        }
      },
      t('backup.restoreNow'),
      t('common.cancel')
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.backupRestore')}</Text>
        <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
          <MaterialIcons name="close" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

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

            <Card style={styles.reminderCard}>
              <View style={styles.reminderHeader}>
                <View style={styles.reminderHeaderLeft}>
                  <MaterialIcons name="alarm" size={20} color={Colors.primaryStrong} />
                  <Text style={styles.reminderTitle}>{t('backup.reminderTitle')}</Text>
                </View>
                <Switch
                  value={reminderEnabled}
                  onValueChange={handleToggleReminder}
                  trackColor={{ false: Colors.light.border, true: Colors.primary }}
                  thumbColor={reminderEnabled ? Colors.primaryDark : '#f4f3f4'}
                />
              </View>

              <Text style={styles.reminderDesc}>{t('backup.reminderDesc')}</Text>

              {reminderEnabled && (
                <View style={styles.frequencyGroup}>
                  <Text style={styles.frequencyLabel}>{t('backup.frequency')}</Text>
                  <View style={styles.frequencyPills}>
                    {(
                      [
                        { key: 'weekly', label: t('backup.freqWeekly') },
                        { key: 'biweekly', label: t('backup.freqBiweekly') },
                        { key: 'monthly', label: t('backup.freqMonthly') },
                        { key: 'custom', label: t('backup.freqCustom') },
                      ] as const
                    ).map((item) => {
                      const active = reminderFrequency === item.key;
                      return (
                        <TouchableOpacity
                          key={item.key}
                          style={[styles.freqPill, active && styles.freqPillActive]}
                          onPress={() => handleChangeFrequency(item.key)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.freqPillText, active && styles.freqPillTextActive]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {reminderFrequency === 'custom' && (
                    <View style={styles.customDaysContainer}>
                      <Text style={styles.customDaysLabel}>{t('backup.customDays')}</Text>
                      <TextInput
                        style={styles.customDaysInput}
                        placeholder={t('backup.customDaysPlaceholder')}
                        placeholderTextColor={Colors.light.textSecondary}
                        keyboardType="number-pad"
                        value={customDaysInput}
                        onChangeText={handleCustomDaysChange}
                      />
                    </View>
                  )}
                </View>
              )}

              <View style={styles.lastBackupRow}>
                <Text style={styles.lastBackupLabel}>{t('backup.lastBackupTime')}:</Text>
                <Text style={styles.lastBackupValue}>
                  {lastBackupAt
                    ? formatDateDisplay(lastBackupAt, i18n.language)
                    : t('backup.neverBackedUp')}
                </Text>
              </View>
            </Card>

            <Card style={styles.folderCard}>
              <View style={styles.folderHeader}>
                <View style={styles.folderHeaderLeft}>
                  <MaterialIcons name="folder-special" size={20} color={Colors.primaryDark} />
                  <Text style={styles.folderTitle}>
                    {targetFolderName
                      ? t('backup.folderSelected', { folder: targetFolderName })
                      : t('backup.chooseFolder')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeFolderBtn}
                  onPress={handleChooseFolder}
                  activeOpacity={0.7}
                >
                  <Text style={styles.changeFolderText}>
                    {targetFolderName ? t('backup.changeFolder') : t('backup.chooseFolder')}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.folderDesc}>
                {targetFolderName
                  ? t('backup.folderSelectedDesc')
                  : t('backup.reminderDesc')}
              </Text>

              {targetFolderName && (
                <View style={styles.autoSaveRow}>
                  <Text style={styles.autoSaveText}>{t('backup.autoSaveToggle')}</Text>
                  <Switch
                    value={autoSaveToFolder}
                    onValueChange={handleToggleAutoSave}
                    trackColor={{ false: Colors.light.border, true: Colors.primary }}
                    thumbColor={autoSaveToFolder ? Colors.primaryDark : '#f4f3f4'}
                  />
                </View>
              )}
            </Card>

            <View style={styles.passwordContainer}>
              <Input
                label={t('backup.backupPassword')}
                placeholder={t('backup.passwordPlaceholder')}
                secureTextEntry
                value={backupPassword}
                onChangeText={setBackupPassword}
              />
              <Text style={styles.passwordHint}>{t('backup.passwordMustMatch')}</Text>
            </View>

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

                {savedNotice && (
                  <Card style={styles.savedNoticeCard}>
                    <View style={styles.savedNoticeHeader}>
                      <MaterialIcons name="folder-special" size={20} color="#2E7D32" />
                      <Text style={styles.savedNoticeTitle}>{t('backup.fileSavedLocationTitle')}</Text>
                    </View>
                    <Text style={styles.savedNoticeText}>{savedNotice}</Text>
                  </Card>
                )}

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

            <Button
              title={t('backup.filePickButton')}
              variant="outline"
              icon={<MaterialIcons name="folder-open" size={20} color={Colors.primaryDark} />}
              onPress={handlePickRestoreFile}
            />

            {selectedFileName && (
              <View style={styles.selectedFileBadge}>
                <MaterialIcons name="insert-drive-file" size={18} color="#2E7D32" />
                <Text style={styles.selectedFileText}>
                  {t('backup.fileSelectedInfo', { name: selectedFileName, size: selectedFileSize })}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.toggleManualJsonBtn}
              onPress={() => setShowManualJson(!showManualJson)}
            >
              <Text style={styles.toggleManualJsonText}>
                {showManualJson ? '▲ ' : '▼ '}
                {t('backup.orPasteJson')}
              </Text>
            </TouchableOpacity>

            {(showManualJson || !selectedFileName) && (
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
            )}

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
// Gotta refactor it soon
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
  reminderCard: {
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 16,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  reminderDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  frequencyGroup: {
    gap: 8,
    marginTop: 4,
  },
  frequencyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  frequencyPills: {
    flexDirection: 'row',
    gap: 8,
  },
  freqPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  freqPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryStrong,
  },
  freqPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  freqPillTextActive: {
    color: '#1A1C2E',
    fontWeight: '700',
  },
  lastBackupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  lastBackupLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  lastBackupValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  customDaysContainer: {
    gap: 6,
    marginTop: 6,
  },
  customDaysLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  customDaysInput: {
    height: 42,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: '#FFFFFF',
  },
  folderCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  folderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  folderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  folderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
  },
  folderDesc: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 17,
  },
  changeFolderBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  changeFolderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  autoSaveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  autoSaveText: {
    fontSize: 13,
    color: Colors.light.text,
    flex: 1,
    paddingRight: 8,
  },
  passwordContainer: {
    gap: 6,
  },
  passwordHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 16,
    marginTop: -2,
  },
  savedNoticeCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
    borderWidth: 1,
    padding: 12,
    gap: 6,
    borderRadius: 12,
  },
  savedNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
  },
  savedNoticeText: {
    fontSize: 12,
    color: '#1B5E20',
    lineHeight: 17,
  },
  selectedFileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  selectedFileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
    flex: 1,
  },
  toggleManualJsonBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  toggleManualJsonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
});
