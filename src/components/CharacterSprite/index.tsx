import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Direction } from '../../game/model';
import { Npc } from '../../content/world';
import { NPC_ATLAS, RANGER_ATLAS, TRAVELER_ATLAS } from '../sceneAssets';

const DIRECTION_ROW: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 };
export function TravelerSprite({
  facing,
  steps,
  paused,
  size,
  atlas = TRAVELER_ATLAS,
  stepDuration = 190,
}: {
  atlas?: ImageSourcePropType;
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
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Image
        source={atlas}
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

export function FieldBagSprite({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x="7" y="27" width="20" height="3" fill="#284530" opacity="0.4" />
      <Rect x="12" y="2" width="10" height="3" fill="#503d27" />
      <Rect x="10" y="4" width="14" height="4" fill="#796044" />
      <Rect x="5" y="8" width="23" height="19" fill="#493b2a" />
      <Rect x="7" y="8" width="19" height="17" fill="#b18c5b" />
      <Rect x="7" y="8" width="19" height="7" fill="#dbc38a" />
      <Rect x="9" y="16" width="15" height="7" fill="#806f46" />
      <Rect x="11" y="17" width="11" height="5" fill="#a4a36a" />
      <Rect x="15" y="12" width="4" height="6" fill="#594c30" />
      <Rect x="16" y="14" width="2" height="2" fill="#ecd492" />
      <Rect x="4" y="12" width="3" height="11" fill="#8e7049" />
      <Rect x="26" y="12" width="3" height="11" fill="#8e7049" />
      <Rect x="8" y="9" width="17" height="1" fill="#f1db9c" />
      <Rect x="9" y="24" width="15" height="1" fill="#d0ad72" />
    </Svg>
  );
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

const PROP_ATLAS = require('../../../assets/characters/props.png');
export function PropSprite({ cell, size }: { cell: number; size: number }) {
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Image
        source={PROP_ATLAS}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          width: size * 4,
          height: size * 2,
          left: -(cell % 4) * size,
          top: -Math.floor(cell / 4) * size,
        }}
      />
    </View>
  );
}
