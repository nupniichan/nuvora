import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { getTimeOfDay, TimeOfDay } from '@/shared/date-utils';

const isNative = Platform.OS !== 'web';

export type LockStatus = 'locked' | 'unlocked' | 'error';

interface LockHeroSceneryProps {
  forceTimeOfDay?: TimeOfDay;
  status?: LockStatus;
  onUnlockComplete?: () => void;
}

export function LockHeroScenery({
  forceTimeOfDay,
  status = 'locked',
  onUnlockComplete,
}: LockHeroSceneryProps) {
  const [systemTimeOfDay, setSystemTimeOfDay] = useState<TimeOfDay>(() => getTimeOfDay());

  // Dynamic layout measurement to guarantee 100% responsive precision
  const [dimensions, setDimensions] = useState({ width: 340, height: 180 });

  // Update clock every minute for seamless day/night transitions
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemTimeOfDay(getTimeOfDay());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const currentTimeOfDay = forceTimeOfDay ?? systemTimeOfDay;

  // Animation values initialized via useState for React 19 Compiler
  const [moonPulse] = useState(() => new Animated.Value(0.75));
  const [sunGlow] = useState(() => new Animated.Value(0.8));
  const [starTwinkleFast] = useState(() => new Animated.Value(0.3));
  const [starTwinkleSlow] = useState(() => new Animated.Value(0.9));
  const [meteorStreak] = useState(() => new Animated.Value(0));
  const [windowLightPulse] = useState(() => new Animated.Value(0.8));
  const [cloudDrift] = useState(() => new Animated.Value(0));

  // Localized badge animations: tight micro-shake on error, subtle localized burst on unlock
  const [shakeTranslateX] = useState(() => new Animated.Value(0));
  const [unlockBadgeScale] = useState(() => new Animated.Value(1));
  const [burstScale] = useState(() => new Animated.Value(0.9));
  const [burstOpacity] = useState(() => new Animated.Value(0));

  // Localized micro-shake for the lock badge on error (tight range)
  useEffect(() => {
    if (status === 'error') {
      Animated.sequence([
        Animated.timing(shakeTranslateX, { toValue: -6, duration: 35, useNativeDriver: isNative }),
        Animated.timing(shakeTranslateX, { toValue: 6, duration: 40, useNativeDriver: isNative }),
        Animated.timing(shakeTranslateX, { toValue: -4, duration: 40, useNativeDriver: isNative }),
        Animated.timing(shakeTranslateX, { toValue: 4, duration: 40, useNativeDriver: isNative }),
        Animated.timing(shakeTranslateX, { toValue: -2, duration: 35, useNativeDriver: isNative }),
        Animated.timing(shakeTranslateX, { toValue: 2, duration: 35, useNativeDriver: isNative }),
        Animated.timing(shakeTranslateX, { toValue: 0, duration: 30, useNativeDriver: isNative }),
      ]).start();
    }
  }, [status, shakeTranslateX]);

  // Localized unlock pop & subtle compact burst ring
  useEffect(() => {
    if (status === 'unlocked') {
      Animated.parallel([
        // Badge subtle spring pop (small range)
        Animated.sequence([
          Animated.timing(unlockBadgeScale, {
            toValue: 1.16,
            duration: 180,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: isNative,
          }),
          Animated.timing(unlockBadgeScale, {
            toValue: 1.0,
            duration: 150,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: isNative,
          }),
        ]),
        // Compact radiant burst ring around badge only (small range)
        Animated.sequence([
          Animated.timing(burstOpacity, { toValue: 0.75, duration: 60, useNativeDriver: isNative }),
          Animated.parallel([
            Animated.timing(burstScale, {
              toValue: 1.45,
              duration: 320,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: isNative,
            }),
            Animated.timing(burstOpacity, {
              toValue: 0,
              duration: 320,
              easing: Easing.out(Easing.quad),
              useNativeDriver: isNative,
            }),
          ]),
        ]),
      ]).start(() => {
        onUnlockComplete?.();
      });
    }
  }, [status, unlockBadgeScale, burstScale, burstOpacity, onUnlockComplete]);

  useEffect(() => {
    // Celestial pulse
    const celestialAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(moonPulse, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
        Animated.timing(moonPulse, {
          toValue: 0.65,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
      ])
    );

    const sunAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(sunGlow, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
        Animated.timing(sunGlow, {
          toValue: 0.7,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
      ])
    );

    // Staggered star twinkle
    const starFastAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(starTwinkleFast, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: isNative,
        }),
        Animated.timing(starTwinkleFast, {
          toValue: 0.2,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: isNative,
        }),
      ])
    );

    const starSlowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(starTwinkleSlow, {
          toValue: 0.15,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: isNative,
        }),
        Animated.timing(starTwinkleSlow, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: isNative,
        }),
      ])
    );

    // Shooting meteor
    const meteorAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(2500),
        Animated.timing(meteorStreak, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: isNative,
        }),
        Animated.delay(4000),
      ])
    );

    // Cottage window breathing light
    const windowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(windowLightPulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
        Animated.timing(windowLightPulse, {
          toValue: 0.7,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
      ])
    );

    // Cloud drift for day
    const cloudAnimation = Animated.loop(
      Animated.timing(cloudDrift, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: isNative,
      })
    );

    celestialAnimation.start();
    sunAnimation.start();
    starFastAnimation.start();
    starSlowAnimation.start();
    meteorAnimation.start();
    windowAnimation.start();
    cloudAnimation.start();

    return () => {
      celestialAnimation.stop();
      sunAnimation.stop();
      starFastAnimation.stop();
      starSlowAnimation.stop();
      meteorAnimation.stop();
      windowAnimation.stop();
      cloudAnimation.stop();
    };
  }, [
    moonPulse,
    sunGlow,
    starTwinkleFast,
    starTwinkleSlow,
    meteorStreak,
    windowLightPulse,
    cloudDrift,
  ]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setDimensions({ width, height });
    }
  };

  const isNight = currentTimeOfDay === 'night';
  const { width, height } = dimensions;

  // Responsive calculations
  const meteorTranslateX = meteorStreak.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, width - 40],
  });
  const meteorTranslateY = meteorStreak.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 80],
  });
  const meteorOpacity = meteorStreak.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 0.8, 0],
  });

  const cloudTranslateX = cloudDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, width + 40],
  });

  // Cottage anchored gracefully on the left hillside
  const houseLeft = 46;
  const houseBottom = 28;

  // Colors localized exclusively to the lock badge
  const isError = status === 'error';
  const isUnlocked = status === 'unlocked';

  const badgeBgColor = isUnlocked
    ? '#EAF7EE'
    : isError
      ? '#FDE8EB'
      : isNight
        ? Colors.primaryLight
        : '#FFFFFF';

  const badgeIconColor = isUnlocked
    ? '#28745B'
    : isError
      ? '#C62828'
      : Colors.primaryStrong;

  const auraColor = isUnlocked
    ? 'rgba(40, 116, 91, 0.28)'
    : isError
      ? 'rgba(198, 40, 40, 0.32)'
      : isNight
        ? 'rgba(204, 204, 255, 0.22)'
        : 'rgba(255, 255, 255, 0.35)';

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Svg
        viewBox={`0 0 ${width} ${height}`}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          {/* Day / Night Sky Gradients */}
          {isNight ? (
            <LinearGradient id="lockSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#111224" />
              <Stop offset="50%" stopColor="#1F2044" />
              <Stop offset="100%" stopColor="#323363" />
            </LinearGradient>
          ) : (
            <LinearGradient id="lockSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#9CB4FF" />
              <Stop offset="55%" stopColor="#C5C7FC" />
              <Stop offset="100%" stopColor="#FFEAD9" />
            </LinearGradient>
          )}

          {/* Shinkai Celestial Glow */}
          <LinearGradient id="lockCelestialGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={isNight ? 'rgba(235, 240, 255, 0.35)' : 'rgba(255, 245, 210, 0.5)'} />
            <Stop offset="100%" stopColor="transparent" />
          </LinearGradient>

          {/* Hill Gradients */}
          <LinearGradient id="lockHillBack" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={isNight ? '#222340' : '#8FA4D4'} />
            <Stop offset="100%" stopColor={isNight ? '#18192E' : '#7E94C5'} />
          </LinearGradient>

          <LinearGradient id="lockHillFront" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={isNight ? '#1C1D33' : '#6F84B5'} />
            <Stop offset="100%" stopColor={isNight ? '#131424' : '#5E72A2'} />
          </LinearGradient>
        </Defs>

        {/* Sky Background */}
        <Rect x="0" y="0" width={width} height={height} fill="url(#lockSkyGradient)" />

        {/* Celestial body (Crescent Moon at Night vs Radiant Sun by Day) */}
        {isNight ? (
          <>
            <Circle cx={width - 55} cy="38" r="22" fill="url(#lockCelestialGlow)" />
            <Path
              d={`M${width - 51},24 A 14 14 0 1 0 ${width - 42},46 A 11 11 0 1 1 ${width - 51},24 Z`}
              fill="#FFF9E6"
            />
          </>
        ) : (
          <>
            <Circle cx={width - 55} cy="38" r="28" fill="url(#lockCelestialGlow)" />
            <Circle cx={width - 55} cy="38" r="16" fill="#FFF8E0" />
            <Circle cx={width - 55} cy="38" r="19" fill="rgba(255, 245, 200, 0.4)" />
          </>
        )}

        {/* Distant Ridge */}
        <Path
          d={`M0,${height * 0.72} Q${width * 0.25},${height * 0.48} ${width * 0.5},${height * 0.65} T${width},${height * 0.6} L${width},${height} L0,${height} Z`}
          fill="url(#lockHillBack)"
          opacity={0.85}
        />

        {/* Foreground Hill */}
        <Path
          d={`M0,${height * 0.82} Q${width * 0.35},${height * 0.68} ${width * 0.65},${height * 0.8} T${width},${height * 0.74} L${width},${height} L0,${height} Z`}
          fill="url(#lockHillFront)"
        />

        {/* Cottage on the hill slope */}
        <Rect
          x={houseLeft}
          y={height - houseBottom - 20}
          width="28"
          height="20"
          fill={isNight ? '#2A2B45' : '#FFFFFF'}
          rx="2"
        />
        {/* Roof */}
        <Path
          d={`M${houseLeft - 4},${height - houseBottom - 20} L${houseLeft + 14},${height - houseBottom - 35} L${houseLeft + 32},${height - houseBottom - 20} Z`}
          fill={isNight ? '#3D3B5C' : '#6A68A5'}
        />
        {/* Chimney */}
        <Rect
          x={houseLeft + 20}
          y={height - houseBottom - 31}
          width="4"
          height="10"
          fill={isNight ? '#33314D' : '#57548A'}
          rx="1"
        />

        {/* Lantern Post (Night) or Flower Post (Day) */}
        <Rect
          x={houseLeft + 38}
          y={height - houseBottom - 16}
          width="2"
          height="16"
          fill={isNight ? '#4B4B6E' : '#667085'}
        />
        <Circle
          cx={houseLeft + 39}
          cy={height - houseBottom - 16}
          r="3.5"
          fill={isNight ? '#FFEAA7' : '#FFB84C'}
          opacity={0.9}
        />
      </Svg>

      {/* Night-only celestial animations */}
      {isNight && (
        <>
          {/* Twinkling Star Group 1 */}
          <Animated.View style={[styles.absoluteFillStyle, { opacity: starTwinkleFast }]}>
            <View style={[styles.starDot, { top: 22, left: Math.max(30, width * 0.1) }]} />
            <View style={[styles.starDot, { top: 58, left: Math.max(70, width * 0.22) }]} />
            <View style={[styles.starDot, { top: 32, left: width * 0.48 }]} />
            <View style={[styles.starDot, { top: 68, left: width * 0.65 }]} />
            <View style={[styles.starDot, { top: 38, right: 85 }]} />
          </Animated.View>

          {/* Twinkling Star Group 2 */}
          <Animated.View style={[styles.absoluteFillStyle, { opacity: starTwinkleSlow }]}>
            <View style={[styles.starDot, { top: 42, left: width * 0.32 }]} />
            <View style={[styles.starDot, { top: 18, left: width * 0.62 }]} />
            <View style={[styles.starDot, { top: 52, right: 120 }]} />
            <View style={[styles.starDot, { top: 80, left: width * 0.4 }]} />
          </Animated.View>

          {/* Shooting Meteor */}
          <Animated.View
            style={[
              styles.meteorBox,
              {
                transform: [
                  { translateX: meteorTranslateX },
                  { translateY: meteorTranslateY },
                  { rotate: '25deg' },
                ],
                opacity: meteorOpacity,
              },
            ]}
          >
            <View style={styles.meteorHead} />
            <View style={styles.meteorTail} />
          </Animated.View>
        </>
      )}

      {/* Day-only animated clouds */}
      {!isNight && (
        <Animated.View
          style={[
            styles.dayCloud,
            {
              top: 22,
              transform: [{ translateX: cloudTranslateX }],
            },
          ]}
        >
          <Svg width="85" height="30" viewBox="0 0 85 30">
            <Path
              d="M10,25 Q18,25 24,20 Q32,10 46,13 Q57,7 68,15 Q78,15 81,21 Q84,25 74,25 Z"
              fill="rgba(255, 255, 255, 0.88)"
            />
          </Svg>
        </Animated.View>
      )}

      {/* Cottage Glowing Window */}
      <Animated.View
        style={[
          styles.cottageWindow,
          {
            left: houseLeft + 10,
            bottom: houseBottom + 7,
            backgroundColor: isNight ? '#FFD166' : '#FFEAA7',
            opacity: windowLightPulse,
          },
        ]}
      />

      {/* Security Emblem - Positioned in Bottom Right with Localized Micro-Animations */}
      <Animated.View
        style={[
          styles.bottomRightBadgeWrapper,
          {
            transform: [
              { translateX: shakeTranslateX },
              { scale: unlockBadgeScale },
            ],
          },
        ]}
      >
        {/* Localized compact burst ring on unlock */}
        <Animated.View
          style={[
            styles.burstRing,
            {
              backgroundColor: auraColor,
              transform: [{ scale: burstScale }],
              opacity: burstOpacity,
            },
          ]}
        />

        {/* Ambient Pulsing Aura (Crimson on error, Emerald on unlock) */}
        <View
          style={[
            styles.badgeAura,
            {
              backgroundColor: auraColor,
            },
          ]}
        />

        {/* Badge Icon (Morphs from lock-outline to lock-open) */}
        <View
          style={[
            styles.securityBadge,
            {
              backgroundColor: badgeBgColor,
              borderColor: isUnlocked
                ? 'rgba(40, 116, 91, 0.5)'
                : isError
                  ? 'rgba(198, 40, 40, 0.5)'
                  : 'rgba(255, 255, 255, 0.45)',
            },
          ]}
        >
          <MaterialIcons
            name={isUnlocked ? 'lock-open' : 'lock-outline'}
            size={24}
            color={badgeIconColor}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  absoluteFillStyle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  starDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0 0 4px rgba(255, 255, 255, 0.9)' },
      default: {
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 2,
      },
    }),
  },
  meteorBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  meteorHead: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  meteorTail: {
    width: 34,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 1,
  },
  dayCloud: {
    position: 'absolute',
    left: 0,
  },
  cottageWindow: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 1.5,
    ...Platform.select({
      web: { boxShadow: '0 0 6px rgba(255, 209, 102, 0.9)' },
      default: {
        shadowColor: '#FFD369',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 4,
      },
    }),
  },
  bottomRightBadgeWrapper: {
    position: 'absolute',
    right: 18,
    bottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstRing: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  badgeAura: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  securityBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    ...Platform.select({
      web: { boxShadow: '0 3px 10px rgba(0, 0, 0, 0.16)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
    }),
  },
});
