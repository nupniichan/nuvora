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
        <View style={styles.icon}><MaterialIcons name={icon} size={32} color={Colors.primaryStrong} /></View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Button title={actionLabel} onPress={onAction} style={styles.button} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', padding: 24, gap: 8 },
  illustration: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  icon: { width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: Colors.light.text, textAlign: 'center' },
  description: { maxWidth: 320, fontSize: 13, lineHeight: 20, color: Colors.light.textSecondary, textAlign: 'center' },
  button: { marginTop: 8, minHeight: 44, paddingVertical: 10 },
});
