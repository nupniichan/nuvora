import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { Colors } from '@/constants/theme';

export interface AppLogoProps {
  size?: number;
  borderRadius?: number;
  withGlow?: boolean;
  withBorder?: boolean;
  showText?: boolean;
  showTagline?: boolean;
  taglineText?: string;
  theme?: 'dark' | 'light';
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export const NUVORA_LOGO_SOURCE: ImageSourcePropType = require('../../../assets/logo/nuvora_logo.png');

export const APP_TAGLINE = 'Your money, your privacy, your data';

export function AppLogo({
  size = 48,
  borderRadius,
  withGlow = false,
  withBorder = true,
  showText = false,
  showTagline = false,
  taglineText = APP_TAGLINE,
  theme = 'light',
  style,
  imageStyle,
}: AppLogoProps) {
  const computedRadius = borderRadius ?? Math.round(size * 0.24);
  const isDark = theme === 'dark';

  return (
    <View style={[styles.container, showText && styles.rowContainer, style]}>
      <View
        style={[
          styles.logoWrapper,
          {
            width: size,
            height: size,
            borderRadius: computedRadius,
          },
          withBorder && {
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(204, 204, 255, 0.25)' : 'rgba(100, 100, 168, 0.2)',
          },
          withGlow && {
            ...Platform.select({
              web: {
                boxShadow: isDark
                  ? '0 8px 24px rgba(204, 204, 255, 0.22)'
                  : '0 8px 20px rgba(69, 69, 128, 0.18)',
              },
              default: {
                shadowColor: isDark ? '#CCCCFF' : '#454580',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.22,
                shadowRadius: 12,
                elevation: 6,
              },
            }),
          },
        ]}
      >
        <Image
          source={NUVORA_LOGO_SOURCE}
          style={[
            styles.logoImage,
            {
              width: size,
              height: size,
              borderRadius: computedRadius,
            },
            imageStyle,
          ]}
          resizeMode="cover"
        />
      </View>

      {showText && (
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.brandName,
              {
                fontSize: Math.max(16, Math.round(size * 0.38)),
                color: isDark ? '#CCCCFF' : Colors.light.text,
              },
            ]}
          >
            Nuvora
          </Text>
          {showTagline && (
            <Text
              style={[
                styles.tagline,
                {
                  fontSize: Math.max(11, Math.round(size * 0.16)),
                  color: isDark ? '#CCCCFF' : Colors.light.textSecondary,
                },
              ]}
              numberOfLines={2}
            >
              {taglineText}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrapper: {
    overflow: 'hidden',
    backgroundColor: '#282744',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    overflow: 'hidden',
  },
  textContainer: {
    justifyContent: 'center',
    gap: 2,
  },
  brandName: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    fontWeight: '500',
    lineHeight: 16,
  },
});
