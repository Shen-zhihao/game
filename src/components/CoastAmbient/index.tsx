import { useMemo } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { GameState } from '../../game/model';
import { MAPS } from '../../content/world';
import { isIndoor, weatherAt } from '../../game/environment';
import { useAmbientMotion } from '../../hooks/useAmbientMotion';
import { weatherNoise } from '../../game/weatherVisuals';

export function CoastAmbient({
  game,
  scale,
  paused,
}: {
  game: GameState;
  scale: number;
  paused: boolean;
}) {
  const coastal =
    (!isIndoor(game.player.map) || game.player.map === 'waterGym') &&
    MAPS[game.player.map].rows.some((row) => row.includes('~'));
  const weather = weatherAt(game);
  const roughness = weather === 'storm' ? 2.4 : weather === 'rain' ? 1.5 : 1;
  const durations = useMemo(
    () => [5100, 5700, 6300, 4900, 6100, 5300].map((n) => n / Math.sqrt(roughness)),
    [roughness],
  );
  const { clocks, reduced } = useAmbientMotion(durations, paused || !coastal);
  const flow = clocks[0]!;
  if (!coastal) return null;
  const ripples: [number, number][] = [];
  MAPS[game.player.map].rows.forEach((row, y) => {
    for (let x = 1; x < row.length - 1; x++)
      if (
        row[x] === '~' &&
        weatherNoise(x + y * row.length, 2) < 0.18 &&
        Math.abs(x - game.player.x) < 17 &&
        Math.abs(y - game.player.y) < 12
      )
        ripples.push([x, y]);
  });
  return (
    <View
      testID={`water-ambient-${weather}`}
      pointerEvents="none"
      style={{ position: 'absolute', inset: 0 }}
    >
      {!reduced &&
        ripples.slice(0, weather === 'storm' ? 32 : 24).map(([x, y], i) => {
          const phase = Animated.modulo(
            Animated.add(clocks[i % 6]!, weatherNoise(x + y * 113, 7)),
            1,
          );
          return (
            <Animated.View
              key={`${x}:${y}`}
              style={{
                position: 'absolute',
                left: (x * 32 + 9) * scale,
                top: (y * 32 + 16) * scale,
                width: 19 * scale * Math.sqrt(roughness),
                height: 6 * scale,
                opacity: phase.interpolate({
                  inputRange: [0, 0.25, 0.7, 1],
                  outputRange: [0, Math.min(0.4, 0.22 * roughness), 0.14, 0],
                }),
                transform: [
                  {
                    translateX: phase.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-3 * scale * roughness, 5 * scale * roughness],
                    }),
                  },
                ],
              }}
            >
              <Svg width="100%" height="100%" viewBox="0 0 24 8">
                <Path
                  d="M1 3q5 3 10 0m3 3q5 2 9-1"
                  fill="none"
                  stroke="#f6f3de"
                  strokeWidth={1}
                  strokeLinecap="round"
                />
              </Svg>
            </Animated.View>
          );
        })}
      {game.player.map === 'tideworks' && game.progress.flags.lighthouseRepaired && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 4 * 32 * scale,
            top: 1 * 32 * scale,
            width: 2 * 32 * scale,
            height: 2 * 32 * scale,
            borderRadius: 32 * scale,
            backgroundColor: '#ffe9a0',
            opacity: flow.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.08, 0.3, 0.08] }),
          }}
        />
      )}
    </View>
  );
}
