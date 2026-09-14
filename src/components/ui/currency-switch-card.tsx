import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { convertCurrencyAmount, CurrencyConversionError, getCurrencySwitchState, switchCurrency, SwitchCurrency } from '@/features/currency/currency-conversion';
import { formatMoney } from '@/shared/money';
import { Button } from './button';
import { Card } from './card';
import { Input } from './input';

export function CurrencySwitchCard() {
  const { t, i18n } = useTranslation();
  const [currency, setCurrency] = useState<string>('');
  const [balance, setBalance] = useState(0);
  const [rate, setRate] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState<0 | 1 | 2>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const busy = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    getCurrencySwitchState().then(state => {
      if (!active) return;
      setCurrency(state.account.currency);
      setBalance(state.account.balance);
      setRate(state.rate);
    }).catch(() => { if (active) setError('loadError'); });
    return () => { active = false; };
  }, []));

  const supported = currency === 'VND' || currency === 'USD';
  const target = currency === 'VND' ? 'USD' : 'VND';

  const parsedRate = /^\d+(?:[.,]\d+)?$/.test(rate.trim()) ? Number(rate.trim().replace(',', '.')) : NaN;
  let preview: number | null = null;
  let previewError = '';
  if (supported) {
    try { preview = convertCurrencyAmount(balance, currency, parsedRate); } catch (err) {
      if (Number.isFinite(parsedRate) && parsedRate > 0 && err instanceof CurrencyConversionError) previewError = err.code;
    }
  }

  const save = async () => {
    if (busy.current || confirmationStep !== 2 || !supported || preview === null) return;
    busy.current = true;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await switchCurrency(currency as SwitchCurrency, parsedRate);
      setCurrency(target);
      setEditing(false);
      setConfirmationStep(0);
      setSaved(true);
      setBalance(preview);
      await getCurrencySwitchState().then(state => setBalance(state.account.balance)).catch(() => setError('loadError'));
    } catch (err) {
      setConfirmationStep(0);
      setError(err instanceof CurrencyConversionError ? err.code : 'saveError');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{t('settings.currency')}</Text>
        <Text style={styles.currency}>{currency || '—'}</Text>
      </View>
      <Text style={styles.description}>{t('currencySwitch.description')}</Text>
      {!editing ? (
        <Button
          title={t('currencySwitch.switchTo', { currency: target })}
          icon={<MaterialIcons name="currency-exchange" size={18} color={Colors.primaryDark} />}
          variant="outline"
          disabled={!supported || saving}
          onPress={() => { setEditing(true); setConfirmationStep(0); setSaved(false); setError(''); }}
        />
      ) : (
        <>
          <Text style={styles.currency}>{currency} → {target}</Text>
          <Input
            label={t('currencySwitch.rateLabel')}
            helperText={t('currencySwitch.rateHint')}
            accessibilityLabel={t('currencySwitch.rateLabel')}
            value={rate}
            onChangeText={value => { setRate(value); setError(''); }}
            keyboardType="decimal-pad"
            editable={!saving && confirmationStep === 0}
            error={rate && (!Number.isFinite(parsedRate) || parsedRate <= 0) ? t('currencySwitch.invalidRate') : undefined}
          />
          {preview !== null && <Text style={styles.description}>
            {t('currencySwitch.preview', { before: formatMoney(balance, currency, i18n.language), after: formatMoney(preview, target, i18n.language) })}
          </Text>}
          <Text style={styles.description}>{t('currencySwitch.rounding')}</Text>
          {confirmationStep > 0 && <View style={styles.confirmation} accessibilityLiveRegion="polite">
            <Text style={styles.title}>{t('currencySwitch.confirmTitle', { step: confirmationStep })}</Text>
            <Text style={styles.description}>{t('currencySwitch.confirmDetails', { from: currency, to: target, rate: parsedRate })}</Text>
            <Text style={styles.description}>{t(confirmationStep === 1 ? 'currencySwitch.confirmFirstMessage' : 'currencySwitch.confirmFinalMessage')}</Text>
          </View>}
          <Button
            title={t(confirmationStep === 0 ? 'currencySwitch.save' : confirmationStep === 1 ? 'currencySwitch.confirmFirst' : 'currencySwitch.confirmFinal')}
            variant={confirmationStep === 2 ? 'destructive' : 'primary'}
            onPress={confirmationStep === 2 ? save : () => setConfirmationStep(confirmationStep === 0 ? 1 : 2)}
            loading={saving}
            disabled={preview === null}
          />
          <Button title={t('common.cancel')} variant="outline" disabled={saving} onPress={() => { setEditing(false); setConfirmationStep(0); setError(''); }} />
        </>
      )}
      {!!currency && !supported && <Text style={styles.description}>{t('currencySwitch.unsupportedCurrency')}</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{t(`currencySwitch.${error}`)}</Text>}
      {editing && !error && !!previewError && <Text accessibilityRole="alert" style={styles.error}>{t(`currencySwitch.${previewError}`)}</Text>}
      {saved && <Text accessibilityLiveRegion="polite" style={styles.currency}>{t('currencySwitch.saved', { currency })}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 13 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.primaryStrong },
  currency: { fontSize: 14, fontWeight: '700', color: Colors.primaryStrong },
  description: { fontSize: 13, lineHeight: 19, color: Colors.light.textSecondary },
  error: { fontSize: 13, lineHeight: 19, color: Colors.error },
  confirmation: { padding: 14, gap: 8, borderRadius: 12, backgroundColor: Colors.primaryLight },
});
