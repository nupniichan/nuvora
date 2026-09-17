import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { formatMinorForInput, parseAndFormatInput } from '@/shared/money';

export interface MoneyInputProps {
  label?: string;
  currency: string;
  valueMinor: number;
  onChangeMinor: (minor: number) => void;
  error?: string;
  placeholder?: string;
}

export function MoneyInput({
  label,
  currency,
  valueMinor,
  onChangeMinor,
  error,
  placeholder = '0',
}: MoneyInputProps) {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'vi-VN';

  const [textValue, setTextValue] = useState<string>(() =>
    formatMinorForInput(valueMinor, currency, locale)
  );

  useEffect(() => {
    const currentParsed = parseAndFormatInput(textValue, currency, locale);
    if (currentParsed.minor !== valueMinor) {
      setTextValue(formatMinorForInput(valueMinor, currency, locale));
    }
  }, [valueMinor, currency, locale]);

  const handleChangeText = (text: string) => {
    const { formatted, minor } = parseAndFormatInput(text, currency, locale);
    setTextValue(formatted);
    onChangeMinor(minor);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <TextInput
          style={styles.textInput}
          value={textValue}
          onChangeText={handleChangeText}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor={Colors.light.textSecondary}
        />
        <Text style={styles.currencyBadge}>{currency}</Text>
      </View>
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
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.light.surface,
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
  },
  currencyBadge: {
    flexShrink: 0,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryStrong,
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
  },
});
