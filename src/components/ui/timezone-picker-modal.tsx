import { useTheme } from '@/hooks/use-theme';
import { createTimezonePickerModalStyles } from './timezone-picker-modal.styles';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import {
  SYSTEM_TIMEZONE_VALUE,
  TIMEZONE_OPTIONS,
  TimezoneOption,
  getSystemGmtString,
} from '@/services/timezone/timezone-service';

export interface TimezonePickerModalProps {
  visible: boolean;
  currentGmt: string;
  onSelect: (gmt: string) => void;
  onClose: () => void;
}

export function TimezonePickerModal({
  visible,
  currentGmt,
  onSelect,
  onClose,
}: TimezonePickerModalProps) {
  const theme = useTheme();
  const styles = createTimezonePickerModalStyles(theme);
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const isVi = (i18n.language || 'vi').startsWith('vi');

  const systemGmt = useMemo(() => getSystemGmtString(), []);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return TIMEZONE_OPTIONS;

    return TIMEZONE_OPTIONS.filter((opt) => {
      const matchBadge = opt.gmtBadge.toLowerCase().includes(q);
      const matchKey = opt.key.toLowerCase().includes(q);
      const matchVi = opt.nameVi.toLowerCase().includes(q);
      const matchEn = opt.nameEn.toLowerCase().includes(q);
      return matchBadge || matchKey || matchVi || matchEn;
    });
  }, [searchQuery]);

  const isSystemSelected = currentGmt === SYSTEM_TIMEZONE_VALUE || !currentGmt;

  const handleSelect = (key: string) => {
    onSelect(key);
    onClose();
  };

  const renderOption = ({ item }: { item: TimezoneOption }) => {
    const selected = currentGmt === item.key;
    const name = isVi ? item.nameVi : item.nameEn;

    return (
      <TouchableOpacity
        style={[styles.itemRow, selected && styles.itemRowSelected]}
        onPress={() => handleSelect(item.key)}
        activeOpacity={0.7}
      >
        <View style={styles.itemInfo}>
          <View style={[styles.badge, selected && styles.badgeSelected]}>
            <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>
              {item.gmtBadge}
            </Text>
          </View>
          <Text style={styles.itemName} numberOfLines={2}>
            {name}
          </Text>
        </View>
        <MaterialIcons
          name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
          size={20}
          color={selected ? Colors.primaryStrong : Colors.light.border}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <MaterialIcons name="schedule" size={22} color={Colors.primaryStrong} />
              <Text style={styles.title}>{t('settings.selectTimezone')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>{t('settings.timezoneDescription')}</Text>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={Colors.light.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('settings.searchTimezone')}
              placeholderTextColor={Colors.light.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="cancel" size={18} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* System Default Pinned Card */}
          <TouchableOpacity
            style={[styles.systemCard, isSystemSelected && styles.itemRowSelected]}
            onPress={() => handleSelect(SYSTEM_TIMEZONE_VALUE)}
            activeOpacity={0.7}
          >
            <View style={styles.itemInfo}>
              <View style={[styles.badge, isSystemSelected && styles.badgeSelected]}>
                <Text style={[styles.badgeText, isSystemSelected && styles.badgeTextSelected]}>
                  {systemGmt}
                </Text>
              </View>
              <View style={styles.systemTextContainer}>
                <Text style={styles.systemTitle}>{t('settings.systemDefaultTimezone')}</Text>
                <Text style={styles.systemDesc}>
                  {t('settings.systemTimezoneHint', { gmt: systemGmt })}
                </Text>
              </View>
            </View>
            <MaterialIcons
              name={isSystemSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={20}
              color={isSystemSelected ? Colors.primaryStrong : Colors.light.border}
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Timezones List */}
          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item.key}
            renderItem={renderOption}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialIcons name="search-off" size={36} color={Colors.light.textSecondary} />
                <Text style={styles.emptyText}>
                  {isVi ? 'Không tìm thấy múi giờ phù hợp' : 'No matching timezone found'}
                </Text>
              </View>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
