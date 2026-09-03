import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';

export const POPULAR_ICONS = [
  // Money & Wealth
  'payments',
  'account-balance-wallet',
  'savings',
  'attach-money',
  'credit-card',
  'currency-bitcoin',
  'paid',
  'monetization-on',
  'wallet',
  'diamond',
  'redeem',
  'card-giftcard',

  // Bills & Utilities
  'flash-on',
  'water-drop',
  'wifi',
  'phone-android',
  'receipt',
  'receipt-long',
  'router',
  'tv',

  // Living & Housing
  'home',
  'vpn-key',
  'apartment',
  'handyman',
  'chair',
  'kitchen',

  // Food & Dining
  'restaurant',
  'local-cafe',
  'local-dining',
  'fastfood',
  'local-pizza',
  'liquor',
  'bakery-dining',

  // Transportation
  'directions-car',
  'two-wheeler',
  'local-gas-station',
  'flight',
  'train',
  'directions-bus',
  'local-taxi',

  // Shopping
  'shopping-cart',
  'shopping-bag',
  'local-mall',
  'storefront',
  'checkroom',

  // Investment & Growth
  'trending-up',
  'show-chart',
  'insights',
  'analytics',
  'pie-chart',
  'bar-chart',
  'query-stats',

  // Health & Sports
  'fitness-center',
  'medical-services',
  'health-and-safety',
  'sports-soccer',
  'pool',

  // Education & Work
  'school',
  'menu-book',
  'laptop',
  'work',
  'business-center',

  // Fun & Entertainment
  'sports-esports',
  'movie',
  'music-note',
  'camera-alt',
  'flight-takeoff',

  // Debt & Safety
  'gavel',
  'shield',
  'lock',
  'flag',
  'star',
  'category',
];

interface IconPickerProps {
  label?: string;
  selectedIcon: string | null;
  selectedColor?: string;
  onSelectIcon: (icon: string) => void;
}

export function IconPicker({
  label,
  selectedIcon,
  selectedColor = Colors.primaryDark,
  onSelectIcon,
}: IconPickerProps) {
  const [search, setSearch] = useState('');

  const filteredIcons = POPULAR_ICONS.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={18} color={Colors.light.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm biểu tượng..."
          placeholderTextColor={Colors.light.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={16} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal={false}
        nestedScrollEnabled
        style={styles.scrollArea}
        contentContainerStyle={styles.grid}
      >
        {filteredIcons.map((iconName) => {
          const isSelected = selectedIcon === iconName;
          return (
            <TouchableOpacity
              key={iconName}
              style={[
                styles.iconBtn,
                isSelected && {
                  backgroundColor: selectedColor,
                  borderColor: selectedColor,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => onSelectIcon(iconName)}
            >
              <MaterialIcons
                name={iconName as any}
                size={22}
                color={isSelected ? '#FFFFFF' : Colors.light.text}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
  },
  scrollArea: {
    maxHeight: 180,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
});
