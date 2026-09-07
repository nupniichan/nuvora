import React from 'react';
import { Platform, StyleSheet, View, ViewProps } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'flat';
}

export function Card({ style, variant = 'elevated', children, ...props }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: variant === 'flat' ? theme.backgroundElement : theme.surface },
        styles[variant],
        variant === 'elevated' && { borderColor: theme.elevatedBorder },
        variant === 'outlined' && { borderColor: theme.border },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    padding: 18,
  },
  elevated: {
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(69, 69, 128, 0.04)' },
      default: {
        shadowColor: '#454580',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 16,
        elevation: 2,
      },
    }),
  },
  outlined: {
    borderWidth: 1,
  },
  flat: {},
});
