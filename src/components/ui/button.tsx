import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'destructive' | 'outline';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  icon,
  disabled,
  style,
  textStyle,
  ...props
}: ButtonProps & { textStyle?: any }) {
  const getBackgroundColor = () => {
    if (disabled) return Colors.light.backgroundSelected;
    switch (variant) {
      case 'primary':
        return Colors.primary;
      case 'accent':
        return Colors.accent;
      case 'secondary':
        return Colors.light.backgroundElement;
      case 'destructive':
        return Colors.expense;
      case 'outline':
        return 'transparent';
      default:
        return Colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return Colors.light.textSecondary;
    switch (variant) {
      case 'primary':
        return '#1A1C2E';
      case 'accent':
        return '#FFFFFF';
      case 'secondary':
        return Colors.light.text;
      case 'destructive':
        return '#FFFFFF';
      case 'outline':
        return Colors.primaryDark;
      default:
        return '#1A1C2E';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === 'outline' && styles.outlineBorder,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.contentRow}>
          {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
          <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineBorder: {
    borderWidth: 1.5,
    borderColor: Colors.primaryDark,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

