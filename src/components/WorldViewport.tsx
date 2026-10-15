import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { MAPS, npcVisible } from '../content/world';
import { GameState } from '../game/model';
import { TravelerSprite, NpcSprite, PropSprite } from './CharacterSprite';
import { CreatureSprite } from './CreatureSprite';
import { MapCanvas } from './MapCanvas';

export const STEP_DURATION_MS = 140;
const HUMAN_ROLES = new Set(['professor', 'rival', 'healer', 'shop', 'quest', 'trainer', 'leader']);
export function WorldViewport({
  game,
  width,
  height,
  paused,
}: {
  game: GameState;
  width: number;
  height: number;
  paused: boolean;
}) {
  const scale = height / 320;
  const [position] = useState(
    () => new Animated.ValueXY({ x: game.player.x * 32, y: game.player.y * 32 }),
  );
  const [opacity] = useState(() => new Animated.Value(1));
  const last = useRef({ map: game.player.map, x: game.player.x, y: game.player.y });
  useEffect(() => {
    const previous = last.current;
    const changedMap = previous.map !== game.player.map;
    const distance = Math.abs(previous.x - game.player.x) + Math.abs(previous.y - game.player.y);
    last.current = { map: game.player.map, x: game.player.x, y: game.player.y };
    const target = { x: game.player.x * 32, y: game.player.y * 32 };
    position.stopAnimation();
    if (changedMap || distance !== 1 || paused) {
      if (distance || changedMap || paused) position.setValue(target);
      if (changedMap) {
        opacity.setValue(0.35);
        Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }).start();
      }
      return;
    }
    Animated.timing(position, {
      toValue: target,
      duration: STEP_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
    return () => position.stopAnimation();
  }, [game.player.map, game.player.x, game.player.y, opacity, paused, position]);
  const camera = useMemo(() => {
    const xHalf = width / scale / 2;
    const yHalf = height / scale / 2;
    const x = position.x.interpolate({
      inputRange: [xHalf - 16, 768 - xHalf - 16],
      outputRange: [0, width - 768 * scale],
      extrapolate: 'clamp',
    });
    const y = position.y.interpolate({
      inputRange: [yHalf - 16, 512 - yHalf - 16],
      outputRange: [0, height - 512 * scale],
      extrapolate: 'clamp',
    });
    return { x, y };
  }, [height, position, scale, width]);
  const nearby = MAPS[game.player.map].npcs.find(
    (n) =>
      npcVisible(game, n) && Math.abs(n.x - game.player.x) + Math.abs(n.y - game.player.y) === 1,
  );
  return (
    <View
      testID="world-viewport"
      style={{ width, height, overflow: 'hidden', backgroundColor: '#4e7950' }}
    >
      <Animated.View
        style={{
          width: 768 * scale,
          height: 512 * scale,
          opacity,
          transform: [{ translateX: camera.x }, { translateY: camera.y }],
        }}
      >
        <MapCanvas state={game} width={768 * scale} height={512 * scale} />
        {MAPS[game.player.map].npcs
          .filter((n) => !HUMAN_ROLES.has(n.role) && npcVisible(game, n))
          .map((n) => {
            const size = n.role === 'log' ? 58 : n.role === 'gate' ? 50 : 42;
            const cell =
              n.role === 'clue'
                ? 1
                : n.role === 'switch'
                  ? 2
                  : n.role === 'chest'
                    ? 3
                    : n.role === 'log'
                      ? 4
                      : n.role === 'gate'
                        ? 5
                        : 0;
            return (
              <View
                pointerEvents="none"
                key={n.id}
                style={{
                  position: 'absolute',
                  left: (n.x * 32 + 16 - size / 2) * scale,
                  top: (n.y * 32 + 31 - size) * scale,
                  zIndex: n.y * 10,
                  width: size * scale,
                  height: size * scale,
                  opacity: n.role === 'clue' && game.progress.flags[n.id] ? 0.55 : 1,
                }}
              >
                {n.role === 'rescue' ? (
                  <CreatureSprite speciesId="creature_016" size={size * scale} animate />
                ) : (
                  <PropSprite cell={cell} size={size * scale} />
                )}
              </View>
            );
          })}
        {game.player.map === 'gym' &&
          (
            [
              [11, 'gymSwitchOne'],
              [6, 'gymSwitchTwo'],
            ] as const
          )
            .filter(([, flag]) => !game.progress.flags[flag])
            .map(([y, flag]) => (
              <View
                key={flag}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: (11 * 32 - 8) * scale,
                  top: (y * 32 - 14) * scale,
                  zIndex: y * 10,
                  width: 48 * scale,
                  height: 48 * scale,
                }}
              >
                <PropSprite cell={6} size={48 * scale} />
              </View>
            ))}
        {(game.player.map === 'forest' || game.player.map === 'gym') && (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: 10.9 * 32 * scale, top: -20 * scale, zIndex: 1 }}
          >
            <PropSprite cell={5} size={84 * scale} />
          </View>
        )}
        {MAPS[game.player.map].npcs
          .filter((n) => HUMAN_ROLES.has(n.role) && npcVisible(game, n))
          .map((n) => (
            <View
              pointerEvents="none"
              key={n.id}
              style={{
                position: 'absolute',
                left: (n.x * 32 - 12) * scale,
                top: (n.y * 32 - 29) * scale,
                zIndex: n.y * 10,
                width: 56 * scale,
                height: 56 * scale,
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  width: 23 * scale,
                  height: 7 * scale,
                  borderRadius: 15 * scale,
                  backgroundColor: '#173f3480',
                  bottom: 1 * scale,
                  left: 17 * scale,
                }}
              />
              <NpcSprite npc={n} size={56 * scale} />
            </View>
          ))}
        <Animated.View
          pointerEvents="none"
          testID="traveler"
          style={{
            position: 'absolute',
            left: -12 * scale,
            top: -19 * scale,
            zIndex: game.player.y * 10 + 1,
            transform: [
              { translateX: Animated.multiply(position.x, scale) },
              { translateY: Animated.multiply(position.y, scale) },
            ],
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: 21 * scale,
              height: 6 * scale,
              borderRadius: 16 * scale,
              backgroundColor: '#183f3470',
              bottom: 7 * scale,
              left: 18 * scale,
            }}
          />
          <TravelerSprite
            facing={game.player.facing}
            steps={game.steps}
            paused={paused}
            size={56 * scale}
          />
        </Animated.View>
      </Animated.View>
      <View pointerEvents="none" style={s.vignette} />
      {nearby && !game.dialogue && (
        <View pointerEvents="none" style={s.hint}>
          <Text style={s.hintText}>A　{nearby.name}</Text>
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  vignette: { ...StyleSheet.absoluteFill, borderWidth: 1, borderColor: '#253c3477' },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 12,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: '#15382aeb',
    borderWidth: 1,
    borderColor: '#d5c889',
  },
  hintText: { color: '#f3e6b9', fontSize: 12, letterSpacing: 1 },
});
