import React, { useEffect, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

const isNative = Platform.OS !== 'web';

export function WelcomeHeroScenery() {
  const [dimensions, setDimensions] = useState({ width: 340, height: 180 });

  const [windmillRotation] = useState(() => new Animated.Value(0));
  const [cloudOffset] = useState(() => new Animated.Value(0));
  const [petalMotion] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const windmillAnimation = Animated.loop(
      Animated.timing(windmillRotation, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: isNative,
      })
    );

    const cloudAnimation = Animated.loop(
      Animated.timing(cloudOffset, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: isNative,
      })
    );

    const petalAnimation = Animated.loop(
      Animated.timing(petalMotion, {
        toValue: 1,
        duration: 4500,
        easing: Easing.linear,
        useNativeDriver: isNative,
        isInteraction: false,
      })
    );

    windmillAnimation.start();
    cloudAnimation.start();
    petalAnimation.start();

    return () => {
      windmillAnimation.stop();
      cloudAnimation.stop();
      petalAnimation.stop();
    };
  }, [windmillRotation, cloudOffset, petalMotion]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width: layoutWidth, height: layoutHeight } = event.nativeEvent.layout;
    if (layoutWidth > 0 && layoutHeight > 0) {
      setDimensions({ width: layoutWidth, height: layoutHeight });
    }
  };

  const { width, height } = dimensions;

  const windmillSpin = windmillRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const cloudFarX = cloudOffset.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, width + 40],
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

  const skyTop = '#9EB5FF';
  const skyMid = '#C7CAFC';
  const skyBottom = '#FFE8D6';
  const mountainColor = '#9EA7E5';
  const midHill = '#8FA4D4';
  const frontHill = '#7991CA';

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Svg
        viewBox={`0 0 ${width} ${height}`}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="welcomeDawnSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={skyTop} />
            <Stop offset="55%" stopColor={skyMid} />
            <Stop offset="100%" stopColor={skyBottom} />
          </LinearGradient>

          <LinearGradient id="welcomeSunbeam" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="rgba(255, 245, 210, 0.45)" />
            <Stop offset="60%" stopColor="rgba(255, 235, 190, 0.08)" />
            <Stop offset="100%" stopColor="transparent" />
          </LinearGradient>

          <LinearGradient id="welcomeMountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={mountainColor} />
            <Stop offset="100%" stopColor={midHill} />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width={width} height={height} fill="url(#welcomeDawnSky)" />

        <Path d={`M0,0 L${width * 0.25},0 L${width * 0.55},${height} L0,${height} Z`} fill="url(#welcomeSunbeam)" opacity={0.6} />
        <Path d={`M${width * 0.12},0 L${width * 0.42},0 L${width * 0.8},${height} L${width * 0.35},${height} Z`} fill="url(#welcomeSunbeam)" opacity={0.4} />

        <Path
          d={`M0,${height * 0.72} Q${width * 0.2},${height * 0.42} ${width * 0.42},${height * 0.58} T${width * 0.82},${height * 0.52} Q${width * 0.92},${height * 0.55} ${width},${height * 0.64} L${width},${height} L0,${height} Z`}
          fill="url(#welcomeMountainGrad)"
          opacity={0.7}
        />

        <Path
          d={`M0,${height * 0.8} Q${width * 0.3},${height * 0.62} ${width * 0.6},${height * 0.75} T${width},${height * 0.7} L${width},${height} L0,${height} Z`}
          fill={midHill}
        />

        <Path
          d={`M${windmillTowerX - 9},${windmillBaseY} L${windmillTowerX - 5},${windmillTopY} L${windmillTowerX + 5},${windmillTopY} L${windmillTowerX + 9},${windmillBaseY} Z`}
          fill="#F5F5FC"
        />
        <Path
          d={`M${windmillTowerX - 7},${windmillTopY} Q${windmillTowerX},${windmillTopY - 10} ${windmillTowerX + 7},${windmillTopY} Z`}
          fill="#6A68A5"
        />
        <Rect
          x={windmillTowerX - 2}
          y={windmillBaseY - 12}
          width="4"
          height="8"
          fill="#454580"
          rx="1"
        />

        <Path
          d={`M0,${height * 0.9} Q${width * 0.35},${height * 0.78} ${width * 0.7},${height * 0.88} T${width},${height * 0.84} L${width},${height} L0,${height} Z`}
          fill={frontHill}
        />

        <Rect x="48" y={height - 40} width="26" height="18" fill="#FFFFFF" rx="2" />
        <Path d={`M45,${height - 40} L61,${height - 55} L77,${height - 40} Z`} fill="#7873B8" />
        <Rect x="58" y={height - 35} width="6" height="6" fill="#FFEAA7" rx="1" />

        <Circle cx="45" cy="38" r="18" fill="rgba(255, 250, 230, 0.85)" />
        <Circle cx="45" cy="38" r="26" fill="rgba(255, 240, 200, 0.3)" />
      </Svg>

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
            {
              transform: [{ rotate: windmillSpin }],
            },
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

      <Animated.View
        style={[
          styles.cloudContainer,
          {
            top: 20,
            transform: [{ translateX: cloudFarX }],
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

      <View style={styles.frameBorder} />
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
    pointerEvents: 'none',
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
  },
  cloudContainer: {
    position: 'absolute',
    left: 0,
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
  frameBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
});
