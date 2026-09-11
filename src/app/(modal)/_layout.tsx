import { Stack } from 'expo-router';
import { SessionGuard } from '@/components/ui/session-guard';

export default function ModalLayout() {
  return (
    <SessionGuard><Stack screenOptions={{ headerShown: false, presentation: 'card' }}>
      <Stack.Screen name="account-security" />
      <Stack.Screen name="add-transaction" />
      <Stack.Screen name="manage-budget" />
      <Stack.Screen name="manage-categories" />
      <Stack.Screen name="manage-goals" />
      <Stack.Screen name="manage-recurring" />
      <Stack.Screen name="backup-restore" />
    </Stack></SessionGuard>
  );
}
