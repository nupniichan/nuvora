import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/theme';

export default function MainLayout() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primaryDark,
          tabBarInactiveTintColor: Colors.light.textSecondary,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('dashboard.title'),
            tabBarIcon: ({ color }) => <MaterialIcons name="dashboard" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: t('transactions.title'),
            tabBarIcon: ({ color }) => <MaterialIcons name="receipt-long" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="budgets"
          options={{
            title: t('budgets.title'),
            tabBarIcon: ({ color }) => <MaterialIcons name="pie-chart" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: t('settings.title'),
            tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={color} />,
          }}
        />
      </Tabs>

      {/* Floating Action Button (FAB) for Quick Expense Entry */}
      <TouchableOpacity
        style={styles.fabButton}
        activeOpacity={0.85}
        onPress={() => router.push('/(modal)/add-transaction')}
      >
        <MaterialIcons name="add" size={28} color="#1A1C2E" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    height: 64,
    backgroundColor: Colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  icon: {
    fontSize: 20,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  fabText: {
    fontSize: 24,
  },
});
