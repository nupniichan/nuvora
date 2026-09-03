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
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(32, 32, 51, 0.07)' },
      default: {
        shadowColor: '#000',
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
