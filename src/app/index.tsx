import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { isAppUnlocked } from '@/services/security/auth-service';
import { isKeyEnvelopeInitialized } from '@/services/security/key-manager';

export default function IndexScreen() {
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    async function checkState() {
      const isInit = await isKeyEnvelopeInitialized();
      setInitialized(isInit);
      setUnlocked(isAppUnlocked());
      setLoading(false);
    }
    checkState();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!initialized) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!unlocked) {
    return <Redirect href="/(auth)/lock" />;
  }

  return <Redirect href="/(main)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
});
