import { Animated, View } from 'react-native';
import { BattleFaintVisual } from '../../game/battleVisuals';
import { usePresentationMotion } from '../../hooks/usePresentationMotion';
import { CreatureSprite } from '../CreatureSprite';

export function BattleFaintIllustration({
  visual,
  anchor,
  size,
  paused,
  completed,
  onFinished,
}: {
  visual: BattleFaintVisual;
  anchor: { x: number; y: number };
  size: number;
  paused: boolean;
  completed: boolean;
  onFinished: () => void;
}) {
  const { progress, reduced } = usePresentationMotion(560, paused || completed, onFinished);
  const player = visual.side === 'player';
  const spriteSize = size * (player ? 1.2 : 1);
  return (
    <View
      testID={`battle-faint-${visual.side}`}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: anchor.x - spriteSize / 2,
        top: anchor.y - size * (player ? 1.1 : 0.92),
        width: spriteSize,
        height: spriteSize,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          opacity: completed
            ? 0
            : progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [1, 0.8, 0] }),
          transform: reduced
            ? []
            : [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, size * 0.65],
                  }),
                },
                { scaleY: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] }) },
              ],
        }}
      >
        <CreatureSprite
          speciesId={visual.figure.speciesId}
          size={spriteSize}
          view={player ? 'back' : 'front'}
        />
      </Animated.View>
    </View>
  );
}
