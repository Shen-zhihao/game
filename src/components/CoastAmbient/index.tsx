import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { GameState } from '../../game/model';
import { MAPS } from '../../content/world';
import { isIndoor, weatherAt } from '../../game/environment';

export function CoastAmbient({
  game,
  scale,
  paused,
}: {
  game: GameState;
  scale: number;
  paused: boolean;
}) {
  const [flow] = useState(() => new Animated.Value(0));
  const coastal =
    (!isIndoor(game.player.map) || game.player.map === 'waterGym') &&
    MAPS[game.player.map].rows.some((row) => row.includes('~'));
  const weather = weatherAt(game);
  const roughness = weather === 'storm' ? 2.4 : weather === 'rain' ? 1.5 : 1;
  useEffect(() => {
    if (paused || !coastal) return;
    const loop = Animated.loop(
      Animated.timing(flow, {
        toValue: 1,
        duration: 2600 / roughness,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      flow.setValue(0);
    };
  }, [coastal, flow, paused, roughness]);
  if (!coastal) return null;
  const ripples: [number, number][] = [];
  MAPS[game.player.map].rows.forEach((row, y) => {
    for (let x = 1; x < row.length - 1; x++)
      if (row[x] === '~' && (x * 3 + y * 7) % 19 === 0) ripples.push([x, y]);
  });
  return (
    <View
      testID={`water-ambient-${weather}`}
      pointerEvents="none"
      style={{ position: 'absolute', inset: 0 }}
    >
      {ripples.slice(0, weather === 'storm' ? 48 : 32).map(([x, y]) => (
        <Animated.View
          key={`${x}:${y}`}
          style={{
            position: 'absolute',
            left: (x * 32 + 9) * scale,
            top: (y * 32 + 16) * scale,
            width: 14 * scale * roughness,
            height: (weather === 'storm' ? 3 : 2) * scale,
            backgroundColor: weather === 'snow' || weather === 'fog' ? '#d8e7f2' : '#e0fff4',
            opacity: flow.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.08, Math.min(0.65, 0.3 * roughness), 0.08],
            }),
            transform: [
              {
                translateX: flow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-4 * scale * roughness, 4 * scale * roughness],
                }),
              },
            ],
          }}
        />
      ))}
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
