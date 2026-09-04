import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import { CURRENCIES } from '@/shared/currency-config';

export default function SetupCurrencyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    lang?: string;
    password?: string;
    enableBiometrics?: string;
  }>();

  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    params.lang === 'en' ? 'USD' : 'VND'
  );

  const handleNext = () => {
    router.push({
      pathname: '/(auth)/setup-categories',
      params: {
        lang: params.lang || 'vi',
        password: params.password,
        enableBiometrics: params.enableBiometrics,
        currency: selectedCurrency,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('onboarding.currencyTitle')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.currencySubtitle')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.currencyList}>
          {Object.values(CURRENCIES).map((curr) => {
            const isSelected = selectedCurrency === curr.code;
            return (
              <TouchableOpacity
                key={curr.code}
                onPress={() => setSelectedCurrency(curr.code)}
                activeOpacity={0.8}
              >
                <Card
                  style={[styles.card, isSelected && styles.selectedCard]}
                >
                  <View style={styles.badge}>
                    <Text style={styles.symbol}>{curr.symbol}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.code}>{curr.code}</Text>
                    <Text style={styles.name}>{curr.name}</Text>
                  </View>
                  {isSelected ? (
                    <MaterialIcons name="check" size={20} color={Colors.primaryStrong} />
                  ) : null}
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Button title={t('common.next')} onPress={handleNext} variant="primary" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 20,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  currencyList: {
    gap: 12,
    paddingBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  selectedCard: {
    borderColor: Colors.primaryStrong,
    borderWidth: 2,
    backgroundColor: Colors.primaryFaded,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C2E',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  code: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  name: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  checkmark: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primaryStrong,
  },
  footer: {
    padding: 24,
  },
});
