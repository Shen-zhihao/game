import { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageSourcePropType, View } from 'react-native';
import { Direction } from '../../game/model';
import { Npc } from '../../content/world';
import { NPC_ATLAS, RANGER_ATLAS, TRAVELER_ATLAS } from '../sceneAssets';
import { playerAppearance } from '../../content/appearances';
import characterFrames from '../../../docs/美术资源/角色取图区.json';
import { AtlasFrameImage } from '../AtlasFrameImage';

function CroppedCharacter({
  atlas,
  cell,
  size,
  source,
  testID,
  label,
}: {
  atlas: keyof typeof characterFrames;
  cell: number;
  size: number;
  source: ImageSourcePropType;
  testID?: string;
  label?: string;
}) {
  const data = characterFrames[atlas];
  const frames = data.frames as Record<string, number[]>;
  const [x, y, width, height] = frames[String(cell)]!;
  const clipPath = (data.clips as Record<string, string>)[String(cell)];
  // One scale per atlas prevents a walking hand or boot from changing the character's size.
  const scale = Math.min(
    (size * 0.84) / Math.max(...Object.values(frames).map((r) => r[3]!)),
    (size * 0.9) / Math.max(...Object.values(frames).map((r) => r[2]!)),
  );
  return (
    <View
      style={{
        position: 'absolute',
        left: (size - width! * scale) / 2,
        top: size * 0.94 - height! * scale,
        width: width! * scale,
        height: height! * scale,
        overflow: 'hidden',
      }}
    >
      {clipPath ? (
        <AtlasFrameImage
          frame={{
            x: x!,
            y: y!,
            width: width!,
            height: height!,
            atlasWidth: data.width,
            atlasHeight: data.height,
            clipPath,
          }}
          source={source}
          width={width! * scale}
          height={height! * scale}
        />
      ) : (
        <Image
          source={source}
          testID={testID}
          accessibilityLabel={label}
          resizeMode="stretch"
          style={{
            position: 'absolute',
            width: data.width * scale,
            height: data.height * scale,
            left: -x! * scale,
            top: -y! * scale,
          }}
        />
      )}
    </View>
  );
}

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
      {source === RANGER_ATLAS ? (
        <CroppedCharacter
          atlas="ranger"
          cell={DIRECTION_ROW[facing] * 4 + (frame % 4)}
          size={size}
          source={source}
          testID={testID ? `${testID}-image` : undefined}
          label={atlas ? undefined : `旅行者：${appearance.name}`}
        />
      ) : (
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
      )}
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
      <CroppedCharacter atlas="npcs" cell={cell} size={size} source={NPC_ATLAS} />
    </Animated.View>
  );
}
