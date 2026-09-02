import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { getCurrencyMetadata } from '@/shared/currency-config';
import { formatMoney, toMinorUnits } from '@/shared/money';

export interface MoneyInputProps {
  label?: string;
  currency: string;
  valueMinor: number;
  onChangeMinor: (minor: number) => void;
  error?: string;
}

export function MoneyInput({ label, currency, valueMinor, onChangeMinor, error }: MoneyInputProps) {
  const meta = getCurrencyMetadata(currency);
  const [displayValue, setDisplayValue] = useState<string>(
    valueMinor === 0 ? '' : (valueMinor / Math.pow(10, meta.decimalPlaces)).toString()
  );

  const handleChangeText = (text: string) => {
    // Keep only numbers and decimal separator
    const cleanText = text.replace(/[^0-9.]/g, '');
    setDisplayValue(cleanText);

    const num = parseFloat(cleanText);
    if (!isNaN(num) && num >= 0) {
      const minor = toMinorUnits(num, currency);
      onChangeMinor(minor);
    } else {
      onChangeMinor(0);
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <TextInput
          style={styles.textInput}
          value={displayValue}
          onChangeText={handleChangeText}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={Colors.light.textSecondary}
        />
        <Text style={styles.currencyBadge}>{currency}</Text>
      </View>
      <Text style={styles.formattedPreview}>
        {formatMoney(valueMinor, currency)}
      </Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  inputRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.light.surface,
  },
  textInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
  },
  currencyBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  formattedPreview: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'right',
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
  },
});
