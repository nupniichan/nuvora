import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  const theme = useTheme();
  const getBackgroundColor = () => {
    if (disabled) return theme.backgroundSelected;
    switch (variant) {
      case 'primary':
        return Colors.primaryStrong;
      case 'accent':
        return Colors.accent;
      case 'secondary':
        return theme.backgroundElement;
      case 'destructive':
        return Colors.expense;
      case 'outline':
        return 'transparent';
      default:
        return Colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.textSecondary;
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'accent':
        return '#542515';
      case 'secondary':
        return theme.text;
      case 'destructive':
        return '#FFFFFF';
      case 'outline':
        return Colors.primaryStrong;
      default:
        return '#FFFFFF';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === 'outline' && [styles.outlineBorder, { borderColor: Colors.primaryDark }],
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
    minHeight: 52,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: Radius.medium,
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
    borderWidth: 1,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
