import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
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
  const [dimensions, setDimensions] = useState({ width: 340, height: 180 });

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemTimeOfDay(getTimeOfDay());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const currentTimeOfDay = forceTimeOfDay ?? systemTimeOfDay;
  const isNight = currentTimeOfDay === 'night';

  const [sunGlow] = useState(() => new Animated.Value(0.8));
  const [starTwinkleFast] = useState(() => new Animated.Value(0.3));
  const [starTwinkleSlow] = useState(() => new Animated.Value(0.9));
  const [meteorStreak] = useState(() => new Animated.Value(0));
  const [windowLightPulse] = useState(() => new Animated.Value(0.8));
  const [cloudDrift] = useState(() => new Animated.Value(0));

  const [windmillRotation] = useState(() => new Animated.Value(0));
  const [petalMotion] = useState(() => new Animated.Value(0));

  const [shakeTranslateX] = useState(() => new Animated.Value(0));
  const [unlockBadgeScale] = useState(() => new Animated.Value(1));
  const [burstScale] = useState(() => new Animated.Value(0.9));
  const [burstOpacity] = useState(() => new Animated.Value(0));

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

  useEffect(() => {
    if (status === 'unlocked') {
      Animated.parallel([
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
    const activeAnimations: Animated.CompositeAnimation[] = [];
    let isCancelled = false;
    let meteorComposite: Animated.CompositeAnimation | null = null;

    if (isNight) {
      const starFastAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(starTwinkleFast, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
            isInteraction: false,
          }),
          Animated.timing(starTwinkleFast, {
            toValue: 0.2,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
            isInteraction: false,
          }),
        ])
      );

      const starSlowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(starTwinkleSlow, {
            toValue: 0.15,
            duration: 1700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
            isInteraction: false,
          }),
          Animated.timing(starTwinkleSlow, {
            toValue: 1,
            duration: 1700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
            isInteraction: false,
          }),
        ])
      );

      // Auto-looping shooting star that resets value and repeats reliably
      const runMeteor = () => {
        if (isCancelled) return;
        meteorStreak.setValue(0);
        meteorComposite = Animated.sequence([
          Animated.delay(1800),
          Animated.timing(meteorStreak, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
            isInteraction: false,
          }),
          Animated.delay(4200),
        ]);
        meteorComposite.start(({ finished }) => {
          if (finished && !isCancelled) {
            runMeteor();
          }
        });
      };

      runMeteor();

      const windowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(windowLightPulse, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
            isInteraction: false,
          }),
          Animated.timing(windowLightPulse, {
            toValue: 0.7,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
            isInteraction: false,
          }),
        ])
      );

      activeAnimations.push(
        starFastAnimation,
        starSlowAnimation,
        windowAnimation
      );
    } else {
      const sunAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(sunGlow, {
            toValue: 1,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
            isInteraction: false,
          }),
          Animated.timing(sunGlow, {
            toValue: 0.7,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
            isInteraction: false,
          }),
        ])
      );

      const cloudAnimation = Animated.loop(
        Animated.timing(cloudDrift, {
          toValue: 1,
          duration: 38000,
          easing: Easing.linear,
          useNativeDriver: false,
          isInteraction: false,
        })
      );

      const windmillAnimation = Animated.loop(
        Animated.timing(windmillRotation, {
          toValue: 1,
          duration: 9000,
          easing: Easing.linear,
          useNativeDriver: false,
          isInteraction: false,
        })
      );

      const petalAnimation = Animated.loop(
        Animated.timing(petalMotion, {
          toValue: 1,
          duration: 4500,
          easing: Easing.linear,
          useNativeDriver: false,
          isInteraction: false,
        })
      );

      const windowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(windowLightPulse, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
            isInteraction: false,
          }),
          Animated.timing(windowLightPulse, {
            toValue: 0.7,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
            isInteraction: false,
          }),
        ])
      );

      activeAnimations.push(
        sunAnimation,
        cloudAnimation,
        windmillAnimation,
        petalAnimation,
        windowAnimation
      );
    }

    activeAnimations.forEach((animation) => animation.start());

    return () => {
      isCancelled = true;
      meteorComposite?.stop();
      activeAnimations.forEach((animation) => animation.stop());
    };
  }, [
    isNight,
    sunGlow,
    starTwinkleFast,
    starTwinkleSlow,
    meteorStreak,
    windowLightPulse,
    cloudDrift,
    windmillRotation,
    petalMotion,
  ]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width: layoutWidth, height: layoutHeight } = event.nativeEvent.layout;
    if (layoutWidth > 0 && layoutHeight > 0) {
      setDimensions({ width: layoutWidth, height: layoutHeight });
    }
  };

  const { width, height } = dimensions;

  const meteorStartX = -30;
  const meteorEndX = Math.min(220, width * 0.65);
  const meteorDistanceX = meteorEndX - meteorStartX;
  const meteorStartY = 14;
  const meteorEndY = meteorStartY + meteorDistanceX * 0.364;

  const meteorTranslateX = meteorStreak.interpolate({
    inputRange: [0, 1],
    outputRange: [meteorStartX, meteorEndX],
  });
  const meteorTranslateY = meteorStreak.interpolate({
    inputRange: [0, 1],
    outputRange: [meteorStartY, meteorEndY],
  });
  const meteorOpacity = meteorStreak.interpolate({
    inputRange: [0, 0.15, 0.75, 1],
    outputRange: [0, 1, 0.9, 0],
  });

  const cloudTranslateX = cloudDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, width + 40],
  });

  const houseLeft = 46;
  const houseBottom = 28;

  const windmillSpin = windmillRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const petalTranslateX = petalMotion.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, width * 0.18, width * 0.24, width * 0.43, width * 0.55],
  });
  const petalTranslateY = petalMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [-24, height + 24],
  });
  const petalRotation = petalMotion.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '240deg'],
  });

  const windmillTowerX = Math.max(180, width - 85);
  const windmillBaseY = height - 42;
  const windmillTopY = windmillBaseY - 40;

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

  const dayMountainColor = '#9EA7E5';
  const dayMidHill = '#8FA4D4';
  const dayFrontHill = '#7991CA';

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Svg
        viewBox={`0 0 ${width} ${height}`}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          {isNight ? (
            <LinearGradient id="lockSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#111224" />
              <Stop offset="50%" stopColor="#1F2044" />
              <Stop offset="100%" stopColor="#323363" />
            </LinearGradient>
          ) : (
            <LinearGradient id="lockSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#9EB5FF" />
              <Stop offset="55%" stopColor="#C7CAFC" />
              <Stop offset="100%" stopColor="#FFE8D6" />
            </LinearGradient>
          )}

          <RadialGradient
            id="lockSunHalo"
            cx="50%"
            cy="50%"
            rx="50%"
            ry="50%"
            fx="50%"
            fy="50%"
          >
            <Stop offset="0%" stopColor="#FFFEE8" stopOpacity="0.85" />
            <Stop offset="45%" stopColor="#FFF5CC" stopOpacity="0.4" />
            <Stop offset="80%" stopColor="#FFEAA8" stopOpacity="0.1" />
            <Stop offset="100%" stopColor="#FFEAA8" stopOpacity="0" />
          </RadialGradient>

          {!isNight && (
            <LinearGradient id="lockSunbeam" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFF8DC" stopOpacity="0.25" />
              <Stop offset="35%" stopColor="#FFF2CC" stopOpacity="0.10" />
              <Stop offset="70%" stopColor="#FFEBB0" stopOpacity="0.03" />
              <Stop offset="100%" stopColor="#FFEBB0" stopOpacity="0" />
            </LinearGradient>
          )}

          {!isNight && (
            <LinearGradient id="lockMountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={dayMountainColor} />
              <Stop offset="100%" stopColor={dayMidHill} />
            </LinearGradient>
          )}

          {isNight && (
            <>
              <LinearGradient id="lockHillBack" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#222340" />
                <Stop offset="100%" stopColor="#18192E" />
              </LinearGradient>
              <LinearGradient id="lockHillFront" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#1C1D33" />
                <Stop offset="100%" stopColor="#131424" />
              </LinearGradient>
            </>
          )}
        </Defs>

        <Rect x="0" y="0" width={width} height={height} fill="url(#lockSkyGradient)" />

        {isNight ? (
          <>
            <Path
              d={`M${width - 51},24 A 14 14 0 1 0 ${width - 42},46 A 11 11 0 1 1 ${width - 51},24 Z`}
              fill="#FFF9E6"
            />
            <Path
              d={`M0,${height * 0.72} Q${width * 0.25},${height * 0.48} ${width * 0.5},${height * 0.65} T${width},${height * 0.6} L${width},${height} L0,${height} Z`}
              fill="url(#lockHillBack)"
              opacity={0.85}
            />
            <Path
              d={`M0,${height * 0.82} Q${width * 0.35},${height * 0.68} ${width * 0.65},${height * 0.8} T${width},${height * 0.74} L${width},${height} L0,${height} Z`}
              fill="url(#lockHillFront)"
            />
            <Rect x={houseLeft} y={height - houseBottom - 20} width="28" height="20" fill="#2A2B45" rx="2" />
            <Path
              d={`M${houseLeft - 4},${height - houseBottom - 20} L${houseLeft + 14},${height - houseBottom - 35} L${houseLeft + 32},${height - houseBottom - 20} Z`}
              fill="#3D3B5C"
            />
            <Rect x={houseLeft + 20} y={height - houseBottom - 31} width="4" height="10" fill="#33314D" rx="1" />
            <Rect x={houseLeft + 38} y={height - houseBottom - 16} width="2" height="16" fill="#4B4B6E" />
            <Circle cx={houseLeft + 39} cy={height - houseBottom - 16} r="3.5" fill="#FFEAA7" opacity={0.9} />
          </>
        ) : (
          <>
            <Path
              d={`M0,0 L${width * 0.28},0 L${width * 0.58},${height} L0,${height} Z`}
              fill="url(#lockSunbeam)"
              opacity={0.45}
            />
            <Path
              d={`M${width * 0.12},0 L${width * 0.38},0 L${width * 0.76},${height} L${width * 0.32},${height} Z`}
              fill="url(#lockSunbeam)"
              opacity={0.22}
            />
            <Path
              d={`M0,${height * 0.72} Q${width * 0.2},${height * 0.42} ${width * 0.42},${height * 0.58} T${width * 0.82},${height * 0.52} Q${width * 0.92},${height * 0.55} ${width},${height * 0.64} L${width},${height} L0,${height} Z`}
              fill="url(#lockMountainGrad)"
              opacity={0.7}
            />
            <Path
              d={`M0,${height * 0.8} Q${width * 0.3},${height * 0.62} ${width * 0.6},${height * 0.75} T${width},${height * 0.7} L${width},${height} L0,${height} Z`}
              fill={dayMidHill}
            />
            <Path
              d={`M${windmillTowerX - 9},${windmillBaseY} L${windmillTowerX - 5},${windmillTopY} L${windmillTowerX + 5},${windmillTopY} L${windmillTowerX + 9},${windmillBaseY} Z`}
              fill="#F5F5FC"
            />
            <Path
              d={`M${windmillTowerX - 7},${windmillTopY} Q${windmillTowerX},${windmillTopY - 10} ${windmillTowerX + 7},${windmillTopY} Z`}
              fill="#6A68A5"
            />
            <Rect x={windmillTowerX - 2} y={windmillBaseY - 12} width="4" height="8" fill="#454580" rx="1" />
            <Path
              d={`M0,${height * 0.9} Q${width * 0.35},${height * 0.78} ${width * 0.7},${height * 0.88} T${width},${height * 0.84} L${width},${height} L0,${height} Z`}
              fill={dayFrontHill}
            />
            <Rect x="48" y={height - 40} width="26" height="18" fill="#FFFFFF" rx="2" />
            <Path d={`M45,${height - 40} L61,${height - 55} L77,${height - 40} Z`} fill="#7873B8" />
            <Rect x="58" y={height - 35} width="6" height="6" fill="#FFEAA7" rx="1" />
            <Circle cx="45" cy="38" r="28" fill="url(#lockSunHalo)" />
            <Circle cx="45" cy="38" r="14" fill="#FFFFF0" opacity={0.92} />
          </>
        )}
      </Svg>

      {isNight && (
        <>
          <Animated.View style={[styles.absoluteFillStyle, { opacity: starTwinkleFast }]}>
            <View style={[styles.starDot, { top: 22, left: Math.max(30, width * 0.1) }]} />
            <View style={[styles.starDot, { top: 58, left: Math.max(70, width * 0.22) }]} />
            <View style={[styles.starDot, { top: 32, left: width * 0.48 }]} />
            <View style={[styles.starDot, { top: 68, left: width * 0.65 }]} />
            <View style={[styles.starDot, { top: 38, right: 85 }]} />
          </Animated.View>

          <Animated.View style={[styles.absoluteFillStyle, { opacity: starTwinkleSlow }]}>
            <View style={[styles.starDot, { top: 42, left: width * 0.32 }]} />
            <View style={[styles.starDot, { top: 18, left: width * 0.62 }]} />
            <View style={[styles.starDot, { top: 52, right: 120 }]} />
            <View style={[styles.starDot, { top: 80, left: width * 0.4 }]} />
          </Animated.View>

          <Animated.View
            style={[
              styles.meteorBox,
              {
                transform: [
                  { translateX: meteorTranslateX },
                  { translateY: meteorTranslateY },
                  { rotate: '20deg' },
                ],
                opacity: meteorOpacity,
              },
            ]}
          >
            <Svg width="56" height="12" viewBox="0 0 56 12">
              <Defs>
                <LinearGradient id="meteorTailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                  <Stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.35" />
                  <Stop offset="90%" stopColor="#FFFFFF" stopOpacity="0.8" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Path d="M0,6 L48,4.5 L48,7.5 Z" fill="url(#meteorTailGrad)" />
              <Circle cx="48" cy="6" r="4.5" fill="#FFFFFF" opacity={0.35} />
              <Circle cx="48" cy="6" r="2.2" fill="#FFFFFF" />
            </Svg>
          </Animated.View>

          <Animated.View
            style={[
              styles.cottageWindow,
              {
                left: houseLeft + 10,
                bottom: houseBottom + 7,
                backgroundColor: '#FFD166',
                opacity: windowLightPulse,
              },
            ]}
          />
        </>
      )}

      {!isNight && (
        <Animated.View
          style={[
            styles.dayCloud,
            {
              top: 20,
              transform: [{ translateX: cloudTranslateX }],
            },
          ]}
        >
          <Svg width="90" height="32" viewBox="0 0 90 32">
            <Path
              d="M10,24 Q18,24 24,18 Q32,8 48,12 Q60,6 72,14 Q82,14 85,20 Q88,24 76,24 Z"
              fill="rgba(255, 255, 255, 0.85)"
            />
          </Svg>
        </Animated.View>
      )}

      {!isNight && (
        <View
          style={[
            styles.windmillAxis,
            {
              left: windmillTowerX - 28,
              top: windmillTopY - 28,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.bladesGroup,
              { transform: [{ rotate: windmillSpin }] },
            ]}
          >
            <Svg width="56" height="56" viewBox="0 0 56 56">
              <G transform="translate(28, 28)">
                <Circle cx="0" cy="0" r="2.5" fill="#454580" />
                <Path d="M-1.5,0 L-3,-22 L3,-22 L1.5,0 Z" fill="#FFFFFF" opacity={0.92} />
                <Path d="M-1.5,0 L-3,22 L3,22 L1.5,0 Z" fill="#FFFFFF" opacity={0.92} />
                <Path d="M0,-1.5 L-22,-3 L-22,3 L0,1.5 Z" fill="#FFFFFF" opacity={0.92} />
                <Path d="M0,-1.5 L22,-3 L22,3 L0,1.5 Z" fill="#FFFFFF" opacity={0.92} />
              </G>
            </Svg>
          </Animated.View>
        </View>
      )}

      {!isNight && (
        <Animated.View
          style={[
            styles.petalWrapper,
            {
              top: 0,
              transform: [
                { translateX: petalTranslateX },
                { translateY: petalTranslateY },
                { rotate: petalRotation },
              ],
            },
          ]}
        >
          <View style={styles.petalGraphic} />
        </Animated.View>
      )}

      {!isNight && (
        <Animated.View
          style={[
            styles.cottageWindow,
            {
              left: 68,
              bottom: 13,
              backgroundColor: '#FFEAA7',
              opacity: windowLightPulse,
            },
          ]}
        />
      )}

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

        <View
          style={[
            styles.badgeAura,
            {
              backgroundColor: auraColor,
            },
          ]}
        />

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
  },
  dayCloud: {
    position: 'absolute',
    left: 0,
  },
  windmillAxis: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bladesGroup: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    transformOrigin: 'center',
  },
  petalWrapper: {
    position: 'absolute',
    left: 30,
  },
  petalGraphic: {
    width: 6,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD4E2',
    opacity: 0.85,
    transform: [{ rotate: '45deg' }],
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
