import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getActiveMainTab } from '@/shared/navigation';

const tabs = [
  { name: 'index', href: '/(main)', label: 'dashboard.title', icon: 'dashboard' },
  { name: 'transactions', href: '/(main)/transactions', label: 'transactions.title', icon: 'receipt-long' },
  { name: 'budgets', href: '/(main)/budgets', label: 'navigation.plans', icon: 'bar-chart' },
  { name: 'more', href: '/(main)/more', label: 'settings.title', icon: 'settings' },
] as const;

export function BottomNavigation() {
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const activeTab = getActiveMainTab(segments);
  const bottomInset = Math.max(insets.bottom, 10);

  if (!activeTab) return null;

  return (
    <View style={[styles.bar, {
      backgroundColor: theme.surface,
      borderTopColor: theme.border,
      height: 64 + bottomInset,
      paddingBottom: bottomInset,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    }]}>
      {tabs.map((tab) => {
        const focused = activeTab === tab.name;
        const color = focused ? Colors.primaryStrong : theme.textSecondary;
        return (
          <TouchableOpacity
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t(tab.label)}
            onPress={() => {
              if (segments[0] === '(modal)') {
                router.dismissTo(tab.href);
              } else {
                router.navigate(tab.href);
              }
            }}
            style={[styles.tab, tab.name === 'transactions' && styles.leftOfFab,
              tab.name === 'budgets' && styles.rightOfFab]}
          >
            <View style={[styles.icon, focused && styles.activeIcon]}>
              <MaterialIcons name={tab.icon} size={22} color={color} />
            </View>
            <Text numberOfLines={1} style={[styles.label, { color }]}>{t(tab.label)}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('transactions.addTransaction')}
        activeOpacity={0.85}
        style={[styles.fab, { borderColor: theme.surface, bottom: bottomInset + 20 }]}
        onPress={() => router.navigate('/(modal)/add-transaction')}
      >
        <MaterialIcons name="add" size={30} color={Colors.primaryStrong} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 9, flexShrink: 0 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '700' },
  icon: { width: 48, height: 30, borderRadius: 15, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  activeIcon: { backgroundColor: Colors.primaryLight, borderRadius: 15, overflow: 'hidden' },
  leftOfFab: { marginRight: 18 },
  rightOfFab: { marginLeft: 18 },
  fab: {
    position: 'absolute', left: '50%', marginLeft: -30,
    width: 60, height: 60, borderRadius: 30, borderWidth: 5,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 3px 10px rgba(69, 69, 128, 0.14)' },
      default: {
        shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.14, shadowRadius: 9, elevation: 8,
      },
    }),
    zIndex: 10,
  },
});
