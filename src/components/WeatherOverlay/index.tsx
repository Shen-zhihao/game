import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { WeatherId } from '../../game/model';

/** Screen-space particles keep outdoor effects consistent across native and web. */
export function WeatherOverlay({
  weather,
  paused = false,
}: {
  weather: WeatherId;
  paused?: boolean;
}) {
  const [drift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (paused || weather === 'clear') return;
    const loop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: weather === 'storm' ? 650 : weather === 'rain' ? 950 : 3800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      drift.setValue(0);
    };
  }, [drift, paused, weather]);
  if (weather === 'clear') return null;
  const rain = weather === 'rain' || weather === 'storm';
  const tint =
    weather === 'sun'
      ? '#f6c46112'
      : weather === 'fog'
        ? '#d8e9e632'
        : weather === 'sand'
          ? '#d3ae6625'
          : weather === 'snow'
            ? '#c6e5ff18'
            : '#30587b22';
  return (
    <View
      testID={`weather-effect-${weather}`}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: tint }]}
    >
      {Array.from({ length: weather === 'sun' ? 6 : 24 }, (_, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: `${(i * 31 + 7) % 101}%`,
            top: `${(i * 17 + 3) % 94}%`,
            width: rain ? 1 : weather === 'fog' ? 140 : weather === 'sand' ? 12 : 3,
            height: rain ? 20 : weather === 'fog' ? 22 : 3,
            borderRadius: rain ? 0 : 30,
            backgroundColor: weather === 'sand' ? '#ead6a7' : '#ecfaff',
            opacity: weather === 'fog' ? 0.08 : weather === 'sun' ? 0.2 : 0.32,
            transform: [
              {
                translateY: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [rain ? -30 : -12, rain ? 90 : 18],
                }),
              },
              {
                translateX: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, rain ? -30 : -45],
                }),
              },
              { rotate: rain ? '18deg' : '0deg' },
            ],
          }}
        />
      ))}
    </View>
  );
}
