import { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MAPS, mapSize } from '../../content/world';
import { MapId, WeatherId } from '../../game/model';
import { hasIllustratedMap } from '../../content/sceneArt';

export function GrassWind({
  mapId,
  scale,
  paused,
  weather,
}: {
  mapId: MapId;
  scale: number;
  paused: boolean;
  weather: WeatherId;
}) {
  const illustrated = hasIllustratedMap(mapId);
  const gust =
    weather === 'storm'
      ? 3
      : weather === 'rain' || weather === 'sand'
        ? 1.8
        : weather === 'snow'
          ? 1.3
          : 1;
  const [winds] = useState(() => Array.from({ length: 4 }, () => new Animated.Value(0)));
  const paths = useMemo(() => {
    const groups = ['', '', '', ''];
    MAPS[mapId].rows.forEach((row, y) =>
      [...row].forEach((tile, x) => {
        if ((tile !== 'g' && tile !== '^') || (x + y) % 2) return;
        if (illustrated && tile === '^') return;
        const phase = (x * 3 + y) % 4;
        if (illustrated) {
          const n = (x * 37 + y * 59) % 13;
          for (let j = 0; j < 3; j++) {
            const xx = x * 32 + 5 + j * 10;
            const yy = y * 32 + 12 + ((j + n) % 2) * 13;
            groups[phase] +=
              `M${xx},${yy}q-5,-8-5,-10 7,2 5,10 0,-11 4,-13 3,8-4,13 6,-7 9,-5-2,6-9,5z `;
          }
          return;
        }
        for (let j = 0; j < 4; j++) {
          const xx = x * 32 + 3 + j * 7;
          const yy = y * 32 + 23 + (j % 2) * 4;
          groups[phase] += `M${xx},${yy}l-2,-9 4,5 3,-11 -1,15z `;
        }
      }),
    );
    return groups;
  }, [illustrated, mapId]);
  useEffect(() => {
    if (paused) return;
    const loops = winds.map((wind, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(wind, {
            toValue: 1,
            duration: (1100 + i * 160) / gust,
            useNativeDriver: true,
          }),
          Animated.timing(wind, {
            toValue: 0,
            duration: (1300 + i * 180) / gust,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [gust, mapId, paused, winds]);
  const { width, height } = mapSize(mapId);
  return (
    <>
      {paths.map((d, i) =>
        d ? (
          <Animated.View
            key={i}
            pointerEvents="none"
            testID={`grass-wind-${weather}-${i}`}
            style={[
              StyleSheet.absoluteFill,
              {
                width: width * scale,
                height: height * scale,
                zIndex: 1,
                opacity: winds[i]!.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.42] }),
                transform: [
                  {
                    translateX: winds[i]!.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-1.4 * scale * gust, 1.4 * scale * gust],
                    }),
                  },
                ],
              },
            ]}
          >
            <Svg width={width * scale} height={height * scale} viewBox={`0 0 ${width} ${height}`}>
              <Path
                d={d}
                fill={
                  illustrated
                    ? i % 2
                      ? '#b7ca9a'
                      : '#8fa87c'
                    : weather === 'snow'
                      ? '#dce9e5'
                      : weather === 'rain' || weather === 'storm'
                        ? i % 2
                          ? '#8ba781'
                          : '#527d68'
                        : i % 2
                          ? '#c0d17b'
                          : '#78b65d'
                }
              />
            </Svg>
          </Animated.View>
        ) : null,
      )}
    </>
  );
}
