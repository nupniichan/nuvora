import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { WelcomeHeroScenery } from '@/components/scenery';
import { Colors } from '@/constants/theme';
import { AppLanguage, getAppLanguage, setAppLanguage } from '@/i18n';

export default function WelcomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState<AppLanguage>(
    (i18n.language?.startsWith('en') || getAppLanguage() === 'en') ? 'en' : 'vi'
  );

  const handleSelectLanguage = (lang: AppLanguage) => {
    setSelectedLang(lang);
    void setAppLanguage(lang);
  };

  const handleNext = () => {
    router.push({
      pathname: '/(auth)/setup-password',
      params: { lang: selectedLang },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <WelcomeHeroScenery />
          <Text style={styles.title}>{t('onboarding.welcomeTitle')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.welcomeSubtitle')}</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>{t('onboarding.selectLanguage')}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[
                styles.langOption,
                selectedLang === 'vi' && styles.selectedOption,
              ]}
              onPress={() => handleSelectLanguage('vi')}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="language"
                size={20}
                color={selectedLang === 'vi' ? Colors.primaryStrong : Colors.light.textSecondary}
              />
              <Text
                style={[
                  styles.langText,
                  selectedLang === 'vi' && styles.selectedLangText,
                ]}
              >
                Tiếng Việt
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.langOption,
                selectedLang === 'en' && styles.selectedOption,
              ]}
              onPress={() => handleSelectLanguage('en')}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="language"
                size={20}
                color={selectedLang === 'en' ? Colors.primaryStrong : Colors.light.textSecondary}
              />
              <Text
                style={[
                  styles.langText,
                  selectedLang === 'en' && styles.selectedLangText,
                ]}
              >
                English
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={t('common.next')}
          onPress={handleNext}
          variant="primary"
          style={styles.fullButton}
        />
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
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'center',
    gap: 32,
  },
  heroSection: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  card: {
    gap: 14,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  langRow: {
    flexDirection: 'row',
    gap: 12,
  },
  langOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  selectedOption: {
    borderColor: Colors.primaryStrong,
    backgroundColor: Colors.primaryFaded,
  },
  langText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  selectedLangText: {
    color: Colors.light.text,
    fontWeight: '700',
  },
  footer: {
    padding: 24,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  fullButton: {
    width: '100%',
  },
});
