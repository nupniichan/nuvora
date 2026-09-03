import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: 'modal' }}>
      <Stack.Screen name="add-transaction" />
      <Stack.Screen name="manage-budget" />
      <Stack.Screen name="manage-categories" />
      <Stack.Screen name="manage-goals" />
      <Stack.Screen name="manage-recurring" />
      <Stack.Screen name="backup-restore" />
    </Stack>
  );
}
