import { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import { Direction } from '../../game/model';
import { Npc } from '../../content/world';
import { NPC_ATLAS, RANGER_ATLAS, TRAVELER_ATLAS } from '../sceneAssets';
import { playerAppearance } from '../../content/appearances';

const DIRECTION_ROW: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 };
export function TravelerSprite({
  facing,
  steps,
  paused,
  size,
  atlas,
  avatar = 0,
  testID,
  stepDuration = 190,
}: {
  atlas?: ImageSourcePropType;
  avatar?: number;
  testID?: string;
  stepDuration?: number;
  facing: Direction;
  steps: number;
  paused: boolean;
  size: number;
}) {
  const [frame, setFrame] = useState(0);
  const lastSteps = useRef(steps);
  const lastMove = useRef(0);
  useEffect(() => {
    if (steps !== lastSteps.current) {
      lastSteps.current = steps;
      lastMove.current = Date.now();
    }
    if (paused) lastMove.current = 0;
  }, [steps, paused]);
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(
        !paused && Date.now() - lastMove.current < stepDuration
          ? Math.floor(Date.now() / 80) % 4
          : 0,
      );
    }, 45);
    return () => clearInterval(timer);
  }, [paused, stepDuration]);
  const appearance = playerAppearance(avatar);
  const source = atlas ?? (appearance.atlas === 'ranger' ? RANGER_ATLAS : TRAVELER_ATLAS);
  return (
    <View testID={testID} style={{ width: size, height: size, overflow: 'hidden' }}>
      <Image
        source={source}
        testID={testID ? `${testID}-image` : undefined}
        accessibilityLabel={atlas ? undefined : `旅行者：${appearance.name}`}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          width: size * 4,
          height: size * 4,
          top: -DIRECTION_ROW[facing] * size,
          left: -(frame % 4) * size,
        }}
      />
    </View>
  );
}
export function npcCell(npc: Npc): number {
  if (npc.role === 'professor' || npc.role === 'distressedProfessor') return 0;
  if (npc.role === 'home') return 4;
  if (npc.role === 'rival' || npc.id === 'catchGuide') return 1;
  if (npc.role === 'healer') return 2;
  if (npc.role === 'shop') return 3;
  if (npc.id === 'researcher') return 4;
  if (npc.id === 'forestGuard' || npc.id === 'mineGuard') return 6;
  if (npc.role === 'leader') return 7;
  return 5;
}

export function NpcSprite({
  npc,
  size,
  paused = false,
}: {
  npc: Npc;
  size: number;
  paused?: boolean;
}) {
  const cell = npcCell(npc);
  const [distress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (paused || npc.patrol) return;
    const motion = Animated.loop(
      Animated.sequence([
        Animated.timing(distress, {
          toValue: npc.role === 'distressedProfessor' ? -size * 0.05 : -size * 0.012,
          duration: npc.role === 'distressedProfessor' ? 280 : 1600 + cell * 80,
          useNativeDriver: true,
        }),
        Animated.timing(distress, {
          toValue: npc.role === 'distressedProfessor' ? size * 0.05 : size * 0.012,
          duration: npc.role === 'distressedProfessor' ? 280 : 1700 + cell * 80,
          useNativeDriver: true,
        }),
      ]),
    );
    motion.start();
    return () => {
      motion.stop();
      distress.setValue(0);
    };
  }, [cell, distress, npc.patrol, npc.role, paused, size]);
  if (npc.patrol)
    return (
      <TravelerSprite
        atlas={RANGER_ATLAS}
        facing={npc.facing ?? 'down'}
        steps={npc.steps ?? 0}
        paused={paused}
        size={size}
        stepDuration={620}
      />
    );
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
        transform:
          npc.role === 'distressedProfessor'
            ? [{ translateX: distress }]
            : [{ translateY: distress }],
      }}
    >
      <Image
        source={NPC_ATLAS}
        resizeMode="stretch"
        style={[
          StyleSheet.absoluteFill,
          {
            width: size * 4,
            height: size * 2,
            left: -(cell % 4) * size,
            top: -Math.floor(cell / 4) * size,
          },
        ]}
      />
    </Animated.View>
  );
}
