import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 18,
    gap: 12,
    ...Platform.select({
      web: { boxShadow: '0 8px 30px rgba(0,0,0,0.18)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
    marginTop: -4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    padding: 0,
  },
  systemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 12,
  },
  systemTextContainer: {
    flex: 1,
    gap: 2,
  },
  systemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryStrong,
  },
  systemDesc: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 2,
  },
  listContent: {
    paddingBottom: 10,
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  itemRowSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    backgroundColor: Colors.light.backgroundElement,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  badgeSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.text,
  },
  badgeTextSelected: {
    color: Colors.primaryStrong,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
});
