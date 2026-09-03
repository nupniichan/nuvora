import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';
import i18n from '@/i18n';
import { lockApp } from '@/services/security/auth-service';

export default function MoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const toggleLanguage = () => {
    const nextLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(nextLang);
    setCurrentLang(nextLang);
  };

  const handleLock = () => {
    lockApp();
    router.replace('/(auth)/lock');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('settings.title')}</Text>

        {/* Security Info Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>{t('settings.security')}</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Mã hóa dữ liệu</Text>
            <Text style={styles.rowValue}>SQLCipher + AES-256</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Khóa mật khẩu (KDF)</Text>
            <Text style={styles.rowValue}>Argon2id</Text>
          </View>
          <Button
            title="Khóa ứng dụng ngay"
            icon={<MaterialIcons name="lock" size={18} color={Colors.primaryDark} />}
            onPress={handleLock}
            variant="outline"
            style={styles.lockBtn}
          />
        </Card>

        {/* Customization & Finance Management Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Quản lý & Tùy chỉnh Tài chính</Text>
          <Text style={styles.sectionDesc}>
            Tự do tùy biến danh mục, màu sắc, biểu tượng, hạn mức và theo dõi mục tiêu cá nhân.
          </Text>
          <Button
            title="Quản lý Danh mục thu / chi"
            icon={<MaterialIcons name="category" size={18} color={Colors.primaryDark} />}
            onPress={() => router.push('/(modal)/manage-categories' as any)}
            variant="outline"
          />
          <Button
            title="Mục tiêu tài chính & Quỹ"
            icon={<MaterialIcons name="flag" size={18} color={Colors.primaryDark} />}
            onPress={() => router.push('/(modal)/manage-goals' as any)}
            variant="outline"
          />
          <Button
            title="Cài đặt hạn mức chi tiêu"
            icon={<MaterialIcons name="tune" size={18} color={Colors.primaryDark} />}
            onPress={() => router.push('/(modal)/manage-budget' as any)}
            variant="outline"
          />
        </Card>

        {/* Backup & Restore Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>{t('settings.backupRestore')}</Text>
          <Text style={styles.sectionDesc}>
            Sao lưu dữ liệu mã hóa di động bảo vệ bằng mật khẩu gốc và khôi phục trên thiết bị mới.
          </Text>
          <Button
            title="Mở sao lưu & Khôi phục"
            icon={<MaterialIcons name="backup" size={18} color={Colors.primaryDark} />}
            onPress={() => router.push('/(modal)/backup-restore' as any)}
            variant="outline"
          />
        </Card>

        {/* Recurring Rules Management */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>{t('recurring.title')}</Text>
          <Text style={styles.sectionDesc}>
            Thiết lập các khoản thu nhập (lương) hoặc hóa đơn lặp lại định kỳ tự động.
          </Text>
          <Button
            title={t('recurring.addRule')}
            icon={<MaterialIcons name="event-repeat" size={18} color={Colors.primaryDark} />}
            onPress={() => router.push('/(modal)/manage-recurring' as any)}
            variant="outline"
          />
        </Card>

        {/* Preferences Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>{t('settings.language')}</Text>
          <TouchableOpacity style={styles.row} onPress={toggleLanguage}>
            <Text style={styles.rowLabel}>Ngôn ngữ giao diện</Text>
            <View style={styles.langValueContainer}>
              <MaterialIcons name="translate" size={16} color={Colors.primaryDark} />
              <Text style={styles.rowValue}>
                {currentLang === 'vi' ? 'Tiếng Việt' : 'English'}
              </Text>
            </View>
          </TouchableOpacity>
        </Card>

        {/* About App */}
        <Card variant="flat" style={styles.aboutCard}>
          <Text style={styles.appTitle}>Nuvora</Text>
          <Text style={styles.appVersion}>Version 1.0.0 — Local-First Personal Finance</Text>
          <Text style={styles.appDesc}>
            Dữ liệu tài chính được lưu trữ và bảo mật trực tiếp trên thiết bị của bạn.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
  },
  sectionCard: {
    gap: 14,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundElement,
    paddingBottom: 8,
  },
  sectionDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowLabel: {
    fontSize: 14,
    color: Colors.light.text,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  langValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockBtn: {
    marginTop: 6,
  },
  aboutCard: {
    alignItems: 'center',
    padding: 20,
    gap: 6,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  appVersion: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  appDesc: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
