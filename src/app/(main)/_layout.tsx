import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SessionGuard } from '@/components/ui/session-guard';

export default function MainLayout() {
  const { t } = useTranslation();

  return (
    <SessionGuard><Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
      <Tabs.Screen name="index" options={{ title: t('dashboard.title') }} />
      <Tabs.Screen name="transactions" options={{ title: t('transactions.title') }} />
      <Tabs.Screen name="budgets" options={{ title: t('navigation.plans') }} />
      <Tabs.Screen name="more" options={{ title: t('settings.title') }} />
    </Tabs></SessionGuard>
  );
}
