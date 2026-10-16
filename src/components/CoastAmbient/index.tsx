import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { GameState } from '../../game/model';
import { MAPS } from '../../content/world';

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
  const coastal = ['coastRoute', 'harbor', 'tideworks', 'waterGym'].includes(game.player.map);
  useEffect(() => {
    if (paused || !coastal) return;
    const loop = Animated.loop(
      Animated.timing(flow, {
        toValue: 1,
        duration: 2600,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      flow.setValue(0);
    };
  }, [coastal, flow, paused]);
  if (!coastal) return null;
  const ripples: [number, number][] = [];
  MAPS[game.player.map].rows.forEach((row, y) => {
    for (let x = 1; x < row.length - 1; x++)
      if (row[x] === '~' && (x * 3 + y * 7) % 19 === 0) ripples.push([x, y]);
  });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {ripples.slice(0, 32).map(([x, y]) => (
        <Animated.View
          key={`${x}:${y}`}
          style={{
            position: 'absolute',
            left: (x * 32 + 9) * scale,
            top: (y * 32 + 16) * scale,
            width: 14 * scale,
            height: 2 * scale,
            backgroundColor: '#e0fff4',
            opacity: flow.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.08, 0.38, 0.08] }),
            transform: [
              {
                translateX: flow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-4 * scale, 4 * scale],
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
