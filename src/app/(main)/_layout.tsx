import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function MainLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primaryStrong,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: [styles.tabBar, { backgroundColor: theme.surface, borderTopColor: theme.border }],
          tabBarLabelStyle: styles.tabLabel,
          tabBarHideOnKeyboard: true,
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
            title: t('navigation.plans'),
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
  );
}

const styles = StyleSheet.create({
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
});
