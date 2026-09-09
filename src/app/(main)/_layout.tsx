import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ColorValue, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function MainLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);

  const tabIcon = (name: React.ComponentProps<typeof MaterialIcons>['name'], color: ColorValue, focused: boolean) => (
    <View style={[styles.tabIcon, focused && styles.activeTabIcon]}>
      <MaterialIcons name={name} size={22} color={color} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primaryStrong,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: [styles.tabBar, { backgroundColor: theme.surface, borderTopColor: theme.border, height: 64 + bottomInset, paddingBottom: bottomInset }],
          tabBarLabelStyle: styles.tabLabel,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('dashboard.title'),
            tabBarIcon: ({ color, focused }) => tabIcon('dashboard', color, focused),
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: t('transactions.title'),
            tabBarIcon: ({ color, focused }) => tabIcon('receipt-long', color, focused),
            tabBarItemStyle: styles.leftOfFabTab,
          }}
        />
        <Tabs.Screen
          name="budgets"
          options={{
            title: t('navigation.plans'),
            tabBarIcon: ({ color, focused }) => tabIcon('pie-chart', color, focused),
            tabBarItemStyle: styles.rightOfFabTab,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: t('settings.title'),
            tabBarIcon: ({ color, focused }) => tabIcon('settings', color, focused),
          }}
        />
      </Tabs>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('transactions.addTransaction')}
        activeOpacity={0.85}
        style={[styles.fabButton, { borderColor: theme.surface, bottom: bottomInset + 20 }]}
        onPress={() => router.push('/(modal)/add-transaction')}
      >
        <MaterialIcons name="add" size={30} color={Colors.primaryStrong} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    height: 72,
    borderTopWidth: 1,
    paddingBottom: 10,
    paddingTop: 9,
    elevation: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabIcon: { width: 48, height: 30, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  activeTabIcon: { backgroundColor: Colors.primaryLight },
  leftOfFabTab: {
    marginRight: 18,
  },
  rightOfFabTab: {
    marginLeft: 18,
  },
  fabButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 5,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 3px 10px rgba(69, 69, 128, 0.14)',
      },
      default: {
        shadowColor: Colors.primaryDark,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.14,
        shadowRadius: 9,
        elevation: 8,
      },
    }),
    zIndex: 10,
  },
});
