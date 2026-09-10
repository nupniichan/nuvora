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

const isNative = Platform.OS !== 'web';

export function BalanceCardScenery() {
  // Dynamic layout measurement to guarantee 100% responsive precision
  const [dimensions, setDimensions] = useState({ width: 360, height: 190 });

  // Animation values initialized via useState for React 19 compiler compatibility
  const [cloudFarX] = useState(() => new Animated.Value(0));
  const [cloudNearX] = useState(() => new Animated.Value(0));
  const [chimneySmokeProgress] = useState(() => new Animated.Value(0));
  const [cottageWindowGlow] = useState(() => new Animated.Value(0.7));
  const [ambientSparklePulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Parallax drifting clouds
    const cloudFarAnimation = Animated.loop(
      Animated.timing(cloudFarX, {
        toValue: 1,
        duration: 22000,
        easing: Easing.linear,
        useNativeDriver: isNative,
      })
    );

    const cloudNearAnimation = Animated.loop(
      Animated.timing(cloudNearX, {
        toValue: 1,
        duration: 15000,
        easing: Easing.linear,
        useNativeDriver: isNative,
      })
    );

    // Chimney smoke cycle
    const smokeAnimation = Animated.loop(
      Animated.timing(chimneySmokeProgress, {
        toValue: 1,
        duration: 3200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: isNative,
      })
    );

    // Warm cottage window pulse
    const windowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cottageWindowGlow, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
        Animated.timing(cottageWindowGlow, {
          toValue: 0.65,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
      ])
    );

    // Ambient floating light particles
    const sparkleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientSparklePulse, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
        Animated.timing(ambientSparklePulse, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: isNative,
        }),
      ])
    );

    cloudFarAnimation.start();
    cloudNearAnimation.start();
    smokeAnimation.start();
    windowAnimation.start();
    sparkleAnimation.start();

    return () => {
      cloudFarAnimation.stop();
      cloudNearAnimation.stop();
      smokeAnimation.stop();
      windowAnimation.stop();
      sparkleAnimation.stop();
    };
  }, [
    cloudFarX,
    cloudNearX,
    chimneySmokeProgress,
    cottageWindowGlow,
    ambientSparklePulse,
  ]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setDimensions({ width, height });
    }
  };

  const { width, height } = dimensions;

  // Interpolated transforms
  const cloudFarTranslateX = cloudFarX.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, width + 40],
  });

  const cloudNearTranslateX = cloudNearX.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, width + 20],
  });

  const smokeTranslateY1 = chimneySmokeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -26],
  });
  const smokeTranslateX1 = chimneySmokeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });
  const smokeScale1 = chimneySmokeProgress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.3, 0.8, 1.4],
  });
  const smokeOpacity1 = chimneySmokeProgress.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.75, 0.4, 0],
  });

  const smokeTranslateY2 = chimneySmokeProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-13, -26, 0],
  });
  const smokeScale2 = chimneySmokeProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.9, 1.5, 0.3],
  });
  const smokeOpacity2 = chimneySmokeProgress.interpolate({
    inputRange: [0, 0.4, 0.7, 1],
    outputRange: [0.5, 0.2, 0, 0.6],
  });

  const sparkleOpacity = ambientSparklePulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.85, 0.2],
  });
  const sparkleTranslateY = ambientSparklePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  // Palette aligned with Nuvora periwinkle theme
  const skyTop = '#EFF1FE';
  const skyBottom = '#DDE2FB';
  const distantHill = '#CBD1F7';
  const midHill = '#B7BEF0';
  const foreHill = '#A5ADE8';
  const houseWall = '#FFFFFF';
  const houseRoof = '#6360A0';
  const houseChimney = '#504C88';
  const treeColorFar = '#667C99';
  const treeColorNear = '#536884';
  const cloudFill = 'rgba(255, 255, 255, 0.75)';
  const cloudShadow = 'rgba(215, 220, 250, 0.6)';
  const windowLight = '#FFE58F';
  const smokeColor = 'rgba(255, 255, 255, 0.85)';

  // Cottage placed on the open upper-right slope above footer buttons
  const cottageX = Math.max(160, width - 112);
  const cottageY = Math.round(height * 0.46);
  const chimneyX = cottageX + 22;
  const chimneyY = cottageY - 11;

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Svg
        viewBox={`0 0 ${width} ${height}`}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="balanceSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={skyTop} />
            <Stop offset="100%" stopColor={skyBottom} />
          </LinearGradient>

          <LinearGradient id="balanceSunbeamGradient" x1="100%" y1="0%" x2="30%" y2="100%">
            <Stop offset="0%" stopColor="rgba(255, 250, 230, 0.4)" />
            <Stop offset="60%" stopColor="rgba(255, 255, 255, 0.08)" />
            <Stop offset="100%" stopColor="transparent" />
          </LinearGradient>

          <LinearGradient id="balanceHillGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={distantHill} />
            <Stop offset="100%" stopColor={skyBottom} />
          </LinearGradient>

          <LinearGradient id="balanceHillGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={midHill} />
            <Stop offset="100%" stopColor={distantHill} />
          </LinearGradient>

          <LinearGradient id="balanceHillGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={foreHill} />
            <Stop offset="100%" stopColor={midHill} />
          </LinearGradient>
        </Defs>

        {/* Sky Background */}
        <Rect x="0" y="0" width={width} height={height} fill="url(#balanceSkyGradient)" />

        {/* Subtle Sunbeam */}
        <Path d={`M${width},0 L${width * 0.65},0 L${width * 0.35},${height} L${width},${height} Z`} fill="url(#balanceSunbeamGradient)" />

        {/* Layer 1: Distant Mountain Ridge (Smooth full-width curve from 0 to width) */}
        <Path
          d={`M0,${height * 0.62} C${width * 0.3},${height * 0.52} ${width * 0.52},${height * 0.34} ${width * 0.72},${height * 0.4} C${width * 0.86},${height * 0.44} ${width * 0.94},${height * 0.52} ${width},${height * 0.56} L${width},${height} L0,${height} Z`}
          fill="url(#balanceHillGradient1)"
          opacity={0.7}
        />

        {/* Layer 2: Midground Rolling Hill (Seamless full-width curve from 0 to width) */}
        <Path
          d={`M0,${height * 0.72} C${width * 0.25},${height * 0.68} ${width * 0.48},${height * 0.54} ${width * 0.7},${height * 0.52} C${width * 0.84},${height * 0.5} ${width * 0.94},${height * 0.6} ${width},${height * 0.64} L${width},${height} L0,${height} Z`}
          fill="url(#balanceHillGradient2)"
        />

        {/* Pine Trees on the ridge */}
        <Path d={`M${cottageX - 38},${cottageY + 2} L${cottageX - 33},${cottageY - 11} L${cottageX - 28},${cottageY + 2} Z`} fill={treeColorFar} />
        <Path d={`M${cottageX - 30},${cottageY + 5} L${cottageX - 25},${cottageY - 8} L${cottageX - 20},${cottageY + 5} Z`} fill={treeColorNear} />
        <Path d={`M${cottageX + 40},${cottageY + 4} L${cottageX + 46},${cottageY - 11} L${cottageX + 52},${cottageY + 4} Z`} fill={treeColorFar} />
        <Path d={`M${cottageX + 48},${cottageY + 6} L${cottageX + 54},${cottageY - 7} L${cottageX + 60},${cottageY + 6} Z`} fill={treeColorNear} />

        {/* Cottage Chimney */}
        <Rect x={chimneyX} y={chimneyY} width="5" height="12" fill={houseChimney} rx="1" />
        <Rect x={chimneyX - 1} y={chimneyY - 1} width="7" height="2" fill={houseRoof} rx="0.5" />

        {/* Cottage Main Wall */}
        <Rect x={cottageX} y={cottageY} width="32" height="24" fill={houseWall} rx="3" />
        {/* Cottage Gabled Roof */}
        <Path d={`M${cottageX - 5},${cottageY + 1} L${cottageX + 16},${cottageY - 16} L${cottageX + 37},${cottageY + 1} Z`} fill={houseRoof} />
        <Circle cx={cottageX + 16} cy={cottageY - 6} r="2.5" fill={houseWall} />

        {/* Layer 3: Foreground Meadow Slope (Seamless full-width curve from 0 to width) */}
        <Path
          d={`M0,${height * 0.84} C${width * 0.28},${height * 0.82} ${width * 0.58},${height * 0.74} ${width * 0.8},${height * 0.72} C${width * 0.9},${height * 0.72} ${width * 0.98},${height * 0.76} ${width},${height * 0.78} L${width},${height} L0,${height} Z`}
          fill="url(#balanceHillGradient3)"
        />

        {/* Wildflower Dots along the foreground meadow */}
        <Circle cx={Math.max(120, width * 0.35)} cy={height * 0.86} r="1.5" fill="#FFFFFF" opacity={0.8} />
        <Circle cx={Math.max(160, width * 0.48)} cy={height * 0.89} r="1.8" fill="#FFF0A0" opacity={0.9} />
        <Circle cx={cottageX - 12} cy={height * 0.84} r="1.5" fill="#FFFFFF" opacity={0.8} />
        <Circle cx={cottageX + 26} cy={height * 0.88} r="1.6" fill="#FFD0D8" opacity={0.85} />
      </Svg>

      {/* Far Cloud Layer */}
      <Animated.View
        style={[
          styles.cloudWrapper,
          {
            top: 10,
            transform: [{ translateX: cloudFarTranslateX }],
            opacity: 0.85,
          },
        ]}
      >
        <Svg width="110" height="38" viewBox="0 0 110 38">
          <Path
            d="M15,32 Q25,32 32,26 Q42,12 58,16 Q72,8 86,18 Q98,18 102,26 Q106,32 95,32 Z"
            fill={cloudShadow}
          />
          <Path
            d="M12,30 Q22,30 28,24 Q38,10 55,14 Q68,6 82,16 Q94,16 98,24 Q102,30 90,30 Z"
            fill={cloudFill}
          />
        </Svg>
      </Animated.View>

      {/* Near Cloud Layer */}
      <Animated.View
        style={[
          styles.cloudWrapper,
          {
            top: 32,
            transform: [{ translateX: cloudNearTranslateX }],
            opacity: 0.92,
          },
        ]}
      >
        <Svg width="85" height="30" viewBox="0 0 85 30">
          <Path
            d="M10,25 Q18,25 24,20 Q32,10 46,13 Q57,7 68,15 Q78,15 81,21 Q84,25 74,25 Z"
            fill={cloudFill}
          />
        </Svg>
      </Animated.View>

      {/* Animated Chimney Smoke (Locked directly above chimney) */}
      <View
        style={[
          styles.smokeOrigin,
          {
            left: chimneyX - 3,
            top: chimneyY - 14,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.smokeParticle,
            {
              backgroundColor: smokeColor,
              transform: [
                { translateY: smokeTranslateY1 },
                { translateX: smokeTranslateX1 },
                { scale: smokeScale1 },
              ],
              opacity: smokeOpacity1,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.smokeParticle,
            {
              backgroundColor: smokeColor,
              transform: [
                { translateY: smokeTranslateY2 },
                { translateX: smokeTranslateX1 },
                { scale: smokeScale2 },
              ],
              opacity: smokeOpacity2,
            },
          ]}
        />
      </View>

      {/* Glowing Window (Locked directly inside the cottage wall) */}
      <Animated.View
        style={[
          styles.windowLightElement,
          {
            left: cottageX + 11,
            top: cottageY + 8,
            backgroundColor: windowLight,
            opacity: cottageWindowGlow,
          },
        ]}
      />

      {/* Ambient Floating Sparkles */}
      <Animated.View
        style={[
          styles.sparkleArea,
          {
            opacity: sparkleOpacity,
            transform: [{ translateY: sparkleTranslateY }],
          },
        ]}
      >
        <View style={[styles.sparklePoint, { top: 40, right: 90, width: 4, height: 4 }]} />
        <View style={[styles.sparklePoint, { top: 65, right: 140, width: 3, height: 3 }]} />
        <View style={[styles.sparklePoint, { top: 25, right: 170, width: 5, height: 5 }]} />
      </Animated.View>

      {/* Soft Scrim to guarantee high contrast for balance text */}
      <View style={styles.contrastScrim} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRadius: 28,
    pointerEvents: 'none',
  },
  cloudWrapper: {
    position: 'absolute',
    left: 0,
  },
  smokeOrigin: {
    position: 'absolute',
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smokeParticle: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  windowLightElement: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 2,
    ...Platform.select({
      web: { boxShadow: '0 0 6px rgba(255, 212, 112, 0.8)' },
      default: {
        shadowColor: '#FFD470',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
    }),
  },
  sparkleArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%',
  },
  sparklePoint: {
    position: 'absolute',
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0 0 5px rgba(255, 255, 255, 0.9)' },
      default: {
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 3,
      },
    }),
  },
  contrastScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
});
