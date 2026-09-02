import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="setup-password" />
      <Stack.Screen name="setup-biometric" />
      <Stack.Screen name="setup-currency" />
      <Stack.Screen name="setup-categories" />
      <Stack.Screen name="lock" />
    </Stack>
  );
}
