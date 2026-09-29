import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

export interface AnimatedSplashScreenProps {
  onAnimationComplete?: () => void;
  autoHideDuration?: number;
}

const NUVORA_LOGO_SOURCE: ImageSourcePropType = require('../../../assets/logo/nuvora_logo.png');

export function AnimatedSplashScreen({
  onAnimationComplete,
  autoHideDuration = 2400,
}: AnimatedSplashScreenProps) {
  const { t } = useTranslation();
  const isNative = Platform.OS !== 'web';

  const [logoScale] = useState(() => new Animated.Value(0.85));
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [shiftX] = useState(() => new Animated.Value(108));
  const [textOpacity] = useState(() => new Animated.Value(0));
  const [textTranslateX] = useState(() => new Animated.Value(-16));
  const [subtitleOpacity] = useState(() => new Animated.Value(0));
  const [subtitleTranslateX] = useState(() => new Animated.Value(-10));
  const [glowScale] = useState(() => new Animated.Value(0.8));
  const [glowOpacity] = useState(() => new Animated.Value(0));
  const [screenOpacity] = useState(() => new Animated.Value(1));

  const [hasFinished, setHasFinished] = useState(false);

  useEffect(() => {
    const enterAnimation = Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: isNative,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: isNative,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0.6,
        duration: 500,
        useNativeDriver: isNative,
      }),
      Animated.timing(glowScale, {
        toValue: 1.2,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: isNative,
      }),
    ]);

    const slideAndRevealAnimation = Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(shiftX, {
          toValue: 0,
          duration: 650,
          easing: Easing.bezier(0.2, 0.85, 0.25, 1),
          useNativeDriver: isNative,
        }),
        Animated.sequence([
          Animated.delay(120),
          Animated.parallel([
            Animated.timing(textOpacity, {
              toValue: 1,
              duration: 420,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: isNative,
            }),
            Animated.timing(textTranslateX, {
              toValue: 0,
              duration: 420,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: isNative,
            }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(220),
          Animated.parallel([
            Animated.timing(subtitleOpacity, {
              toValue: 1,
              duration: 450,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: isNative,
            }),
            Animated.timing(subtitleTranslateX, {
              toValue: 0,
              duration: 450,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: isNative,
            }),
          ]),
        ]),
      ]),
    ]);

    const fullSequence = Animated.sequence([
      enterAnimation,
      slideAndRevealAnimation,
      Animated.delay(Math.max(600, autoHideDuration - 1800)),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 380,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: isNative,
      }),
    ]);

    fullSequence.start(() => {
      setHasFinished(true);
      onAnimationComplete?.();
    });

    return () => {
      fullSequence.stop();
    };
  }, [
    autoHideDuration,
    glowOpacity,
    glowScale,
    isNative,
    logoOpacity,
    logoScale,
    onAnimationComplete,
    screenOpacity,
    shiftX,
    subtitleOpacity,
    subtitleTranslateX,
    textOpacity,
    textTranslateX,
  ]);

  const handleSkip = () => {
    if (hasFinished) return;
    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: isNative,
    }).start(() => {
      setHasFinished(true);
      onAnimationComplete?.();
    });
  };

  if (hasFinished) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.container, { opacity: screenOpacity }]}
      pointerEvents={hasFinished ? 'none' : 'auto'}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleSkip}
        style={styles.touchableArea}
      >
        <Animated.View
          style={[
            styles.ambientGlow,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.brandRow,
            {
              transform: [{ translateX: shiftX }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={NUVORA_LOGO_SOURCE}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </Animated.View>

          <View style={styles.textColumn}>
            <Animated.Text
              style={[
                styles.appNameText,
                {
                  opacity: textOpacity,
                  transform: [{ translateX: textTranslateX }],
                },
              ]}
            >
              Nuvora
            </Animated.Text>

            <Animated.Text
              style={[
                styles.taglineText,
                {
                  opacity: subtitleOpacity,
                  transform: [{ translateX: subtitleTranslateX }],
                },
              ]}
              numberOfLines={2}
            >
              {t('splash.tagline', 'Your money, your privacy, your data')}
            </Animated.Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const LOGO_SIZE = 80;
const LOGO_RADIUS = 22;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 999999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchableArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#EEEEFF',
    ...Platform.select({
      web: {
        filter: 'blur(60px)',
      },
      default: {
        shadowColor: '#CCCCFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 40,
      },
    }),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    maxWidth: 360,
  },
  logoWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_RADIUS,
    backgroundColor: '#282744',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(70, 70, 120, 0.12)',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 32px rgba(40, 39, 68, 0.16)',
      },
      default: {
        shadowColor: '#282744',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
        elevation: 8,
      },
    }),
  },
  logoImage: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_RADIUS,
  },
  textColumn: {
    justifyContent: 'center',
    maxWidth: 220,
  },
  appNameText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1E1F2E',
    letterSpacing: 0.6,
    lineHeight: 34,
  },
  taglineText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#5C5E7A',
    letterSpacing: 0.2,
    lineHeight: 18,
    marginTop: 3,
  },
});
