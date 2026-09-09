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
      web: { boxShadow: '0 2px 8px rgba(39, 40, 51, 0.025)' },
      default: {
        shadowColor: '#272833',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
      },
    }),
  },
  outlined: {
    borderWidth: 1,
  },
  flat: {},
});
