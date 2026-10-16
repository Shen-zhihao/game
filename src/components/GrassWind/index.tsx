import { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MAPS, mapSize } from '../../content/world';
import { MapId } from '../../game/model';

export function GrassWind({
  mapId,
  scale,
  paused,
}: {
  mapId: MapId;
  scale: number;
  paused: boolean;
}) {
  const [winds] = useState(() => Array.from({ length: 4 }, () => new Animated.Value(0)));
  const paths = useMemo(() => {
    const groups = ['', '', '', ''];
    MAPS[mapId].rows.forEach((row, y) =>
      [...row].forEach((tile, x) => {
        if (tile !== 'g' || (x + y) % 2) return;
        const phase = (x * 3 + y) % 4;
        for (let j = 0; j < 4; j++) {
          const xx = x * 32 + 3 + j * 7;
          const yy = y * 32 + 23 + (j % 2) * 4;
          groups[phase] += `M${xx},${yy}l-2,-9 4,5 3,-11 -1,15z `;
        }
      }),
    );
    return groups;
  }, [mapId]);
  useEffect(() => {
    if (paused) return;
    const loops = winds.map((wind, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(wind, { toValue: 1, duration: 1100 + i * 160, useNativeDriver: true }),
          Animated.timing(wind, { toValue: 0, duration: 1300 + i * 180, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [mapId, paused, winds]);
  const { width, height } = mapSize(mapId);
  return (
    <>
      {paths.map((d, i) =>
        d ? (
          <Animated.View
            key={i}
            pointerEvents="none"
            testID={`grass-wind-${i}`}
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
                      outputRange: [-1.4 * scale, 1.4 * scale],
                    }),
                  },
                ],
              },
            ]}
          >
            <Svg width={width * scale} height={height * scale} viewBox={`0 0 ${width} ${height}`}>
              <Path d={d} fill={i % 2 ? '#c0d17b' : '#78b65d'} />
            </Svg>
          </Animated.View>
        ) : null,
      )}
    </>
  );
}
