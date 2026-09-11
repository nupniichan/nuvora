import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors, MaxContentWidth } from '@/constants/theme';
import { changePassword, deleteAccount, lockApp } from '@/services/security/auth-service';
import { confirmAction, alertMessage } from '@/shared/dialog';
import { validatePassword } from '@/shared/validators';

export default function AccountSecurityScreen() {
  const { action } = useLocalSearchParams<{ action?: string }>();
  const deleting = action === 'delete';
  const { t } = useTranslation();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  if (action !== 'delete' && action !== 'password') return <Redirect href="/(main)/more" />;

  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      if (deleting) await deleteAccount(currentPassword);
      else await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      if (!deleting) {
        lockApp();
        alertMessage(t('accountSecurity.changePassword'), t('accountSecurity.passwordChanged'));
      }
      router.replace(deleting ? '/(auth)/welcome' : '/(auth)/lock');
    } catch (cause) {
      const key = cause instanceof Error ? cause.message : '';
      setError(t(key.startsWith('accountSecurity.') || key.startsWith('onboarding.') ? key : 'accountSecurity.failed'));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const handleSubmit = () => {
    setError('');
    if (!currentPassword) { setError(t('accountSecurity.passwordRequired')); return; }
    if (deleting) {
      confirmAction(t('accountSecurity.deleteAccount'), t('accountSecurity.deleteWarning'), submit, t('accountSecurity.deleteAccount'), t('common.cancel'));
      return;
    }
    const validation = validatePassword(newPassword);
    if (!validation.isValid) { setError(t(validation.errorKey!)); return; }
    if (newPassword !== confirmation) { setError(t('onboarding.passwordMismatch')); return; }
    void submit();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t(deleting ? 'accountSecurity.deleteAccount' : 'accountSecurity.changePassword')}</Text>
        <Card style={styles.card}>
          <Text style={styles.description}>{t(deleting ? 'accountSecurity.deleteWarning' : 'accountSecurity.changeDescription')}</Text>
          <Input label={t('accountSecurity.currentPassword')} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="password" value={currentPassword} onChangeText={setCurrentPassword} editable={!busy} />
          {!deleting && <>
            <Input label={t('accountSecurity.newPassword')} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" value={newPassword} onChangeText={setNewPassword} editable={!busy} />
            <Input label={t('accountSecurity.confirmPassword')} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" value={confirmation} onChangeText={setConfirmation} editable={!busy} />
          </>}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Button title={t(deleting ? 'accountSecurity.deleteAccount' : 'accountSecurity.changePassword')} variant={deleting ? 'destructive' : 'primary'} loading={busy} disabled={busy} onPress={handleSubmit} />
          <Button title={t('common.cancel')} variant="outline" disabled={busy} onPress={() => router.replace('/(main)/more')} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 24, gap: 24 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.light.text },
  card: { gap: 16 },
  description: { fontSize: 14, lineHeight: 22, color: Colors.light.textSecondary },
  error: { color: Colors.error, fontSize: 14 },
});
