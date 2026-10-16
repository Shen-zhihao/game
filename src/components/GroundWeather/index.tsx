import { memo, useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { MAPS } from '../../content/world';
import type { MapId, WeatherId } from '../../game/model';
import { isRain, rainSplashSites } from '../../game/weatherVisuals';
import { useAmbientMotion } from '../../hooks/useAmbientMotion';

const TIMINGS = [870, 1030, 1140, 1270, 1390, 1580];
export const GroundWeather = memo(function GroundWeather({
  map,
  weather,
  focusX,
  focusY,
  scale,
  width,
  height,
  paused,
}: {
  map: MapId;
  weather: WeatherId;
  focusX: number;
  focusY: number;
  scale: number;
  width: number;
  height: number;
  paused: boolean;
}) {
  const raining = isRain(weather) && !MAPS[map].interior;
  const { clocks, reduced } = useAmbientMotion(TIMINGS, paused || !raining);
  const cx = Math.floor(focusX / 3) * 3,
    cy = Math.floor(focusY / 3) * 3;
  const sites = useMemo(
    () =>
      rainSplashSites(
        MAPS[map].rows,
        cx,
        cy,
        Math.ceil(width / scale / 64) + 4,
        Math.ceil(height / scale / 64) + 4,
      ),
    [cx, cy, height, map, scale, width],
  );
  if (!raining || reduced) return null;
  return (
    <View pointerEvents="none" testID="rain-ground-splashes" style={StyleSheet.absoluteFill}>
      {sites.map((site, i) => {
        const phase = Animated.modulo(Animated.add(clocks[i % 6]!, site.phase), 1);
        const size = (site.water ? 17 : 10) * scale;
        return (
          <Animated.View
            key={`${site.x}-${site.y}`}
            testID={site.water ? 'rain-water-ripple' : 'rain-ground-splash'}
            style={{
              position: 'absolute',
              left: site.x * 32 * scale - size / 2,
              top: site.y * 32 * scale,
              width: size,
              height: size * 0.36,
              borderWidth: Math.max(0.5, 0.55 * scale),
              borderColor: site.water ? '#f8f4da' : '#a8b4ac',
              borderRadius: size,
              opacity: phase.interpolate({
                inputRange: [0, 0.13, 0.65, 1],
                outputRange: [0, site.water ? 0.34 : 0.23, 0.1, 0],
              }),
              transform: [
                { scale: phase.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.55] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
});
