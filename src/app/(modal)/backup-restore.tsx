import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
    Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors } from '@/constants/theme';
import { useSafeBack } from '@/hooks/use-safe-back';
import { useTheme } from '@/hooks/use-theme';
import { createBackupRestoreStyles } from './backup-restore.styles';
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
  const theme = useTheme();
  const styles = createBackupRestoreStyles(theme);
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
    let active = true;
    void getBackupReminderConfig().then((cfg) => {
      if (!active) return;
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
    }).catch(() => {});
    return () => { active = false; };
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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

      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
