import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Direction } from '../game/model';
import { Npc } from '../content/world';
import { NPC_ATLAS, TRAVELER_ATLAS } from './sceneAssets';

const DIRECTION_ROW: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 };
export function TravelerSprite({
  facing,
  steps,
  paused,
  size,
}: {
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
        !paused && Date.now() - lastMove.current < 190 ? Math.floor(Date.now() / 80) % 4 : 0,
      );
    }, 45);
    return () => clearInterval(timer);
  }, [paused]);
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Image
        source={TRAVELER_ATLAS}
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
  if (npc.role === 'professor') return 0;
  if (npc.role === 'rival' || npc.id === 'catchGuide') return 1;
  if (npc.role === 'healer') return 2;
  if (npc.role === 'shop') return 3;
  if (npc.id === 'researcher') return 4;
  if (npc.id === 'forestGuard') return 6;
  if (npc.role === 'leader') return 7;
  return 5;
}
export function NpcSprite({ npc, size }: { npc: Npc; size: number }) {
  const cell = npcCell(npc);
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
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
    </View>
  );
}

const PROP_ATLAS = require('../../assets/characters/props.png');
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
