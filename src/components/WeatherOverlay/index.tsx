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
            : weather === 'storm'
              ? '#172d4d45'
              : '#30587b38';
  const particles =
    weather === 'sun'
      ? 6
      : weather === 'fog'
        ? 10
        : weather === 'storm'
          ? 64
          : weather === 'rain'
            ? 40
            : 32;
  return (
    <View
      testID={`weather-effect-${weather}`}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: tint }]}
    >
      {Array.from({ length: particles }, (_, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: `${(i * 31 + 7) % 101}%`,
            top: `${(i * 17 + 3) % 94}%`,
            width: rain
              ? 1
              : weather === 'fog'
                ? 140
                : weather === 'sand'
                  ? 12
                  : weather === 'snow'
                    ? 4
                    : 3,
            height: rain ? 20 : weather === 'fog' ? 22 : weather === 'snow' ? 4 : 3,
            borderRadius: rain ? 0 : 30,
            backgroundColor: weather === 'sand' ? '#ead6a7' : '#ecfaff',
            opacity:
              weather === 'fog' ? 0.12 : weather === 'sun' ? 0.2 : weather === 'snow' ? 0.65 : 0.5,
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
