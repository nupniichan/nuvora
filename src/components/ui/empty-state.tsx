import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors } from '@/constants/theme';

interface EmptyStateProps {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.illustration} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.orbit} />
        <View style={styles.spark}><MaterialIcons name="auto-awesome" size={16} color={Colors.accentDark} /></View>
        <View style={styles.icon}><MaterialIcons name={icon} size={32} color={Colors.primaryStrong} /></View>
        <View style={styles.dot} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Button title={actionLabel} onPress={onAction} style={styles.button} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', padding: 24, gap: 8 },
  illustration: { width: 112, height: 88, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  orbit: { position: 'absolute', width: 106, height: 76, borderRadius: 50, borderWidth: 1, borderColor: Colors.primaryLight, transform: [{ rotate: '-20deg' }] },
  icon: { width: 64, height: 64, borderRadius: 22, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  spark: { position: 'absolute', right: 0, top: 0, backgroundColor: Colors.accent, padding: 6, borderRadius: 12 },
  dot: { position: 'absolute', left: 4, bottom: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.primaryDark },
  title: { fontSize: 16, fontWeight: '700', color: Colors.light.text, textAlign: 'center' },
  description: { maxWidth: 320, fontSize: 13, lineHeight: 20, color: Colors.light.textSecondary, textAlign: 'center' },
  button: { marginTop: 8, minHeight: 44, paddingVertical: 10 },
});
