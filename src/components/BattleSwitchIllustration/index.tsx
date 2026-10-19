import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { SPECIES } from '../../content/catalog';
import { sceneInk } from '../../content/sceneArt';
import type { BattleSwitchVisual } from '../../game/battleVisuals';
import { CreatureSprite } from '../CreatureSprite';
import { palette } from '../ui';

export const SWITCH_DURATION = {
  recall: 480,
  send: 900,
  reveal: 720,
  reducedRecall: 140,
  reducedSend: 220,
};

/** A paper-and-amber effect driven only by presentation; it never changes battle state. */
export function BattleSwitchIllustration({
  visual,
  anchor,
  size,
  eventKey,
  paused,
  completed,
  reduced,
  ended,
  onFinished,
}: {
  visual: BattleSwitchVisual;
  anchor: { x: number; y: number };
  size: number;
  eventKey: string;
  paused: boolean;
  completed: boolean;
  reduced: boolean;
  ended: boolean;
  onFinished: (key: string) => void;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const revealing = visual.phase === 'reveal';
  const sending = visual.phase !== 'recall';
  const duration = reduced
    ? revealing
      ? 180
      : sending
        ? SWITCH_DURATION.reducedSend
        : SWITCH_DURATION.reducedRecall
    : SWITCH_DURATION[visual.phase];
  useEffect(() => {
    if (completed) {
      progress.setValue(1);
      return;
    }
    if (paused) return;
    let cancelled = false;
    let animation: Animated.CompositeAnimation | undefined;
    // Read the current native progress when resuming; do not replay a paused throw.
    progress.stopAnimation((value) => {
      if (cancelled) return;
      animation = Animated.timing(progress, {
        toValue: 1,
        duration: Math.max(1, duration * (1 - value)),
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animation.start(({ finished }) => {
        if (finished && !cancelled) onFinished(eventKey);
      });
    });
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [completed, duration, eventKey, onFinished, paused, progress]);

  const value = (inputRange: number[], outputRange: number[]) =>
    progress.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });
  const player = visual.side === 'player';
  const spriteSize = size * (player ? 1.2 : 1);
  const direction = player ? 1 : -1;
  const opacity = sending
    ? value([0, 0.32, 0.48, 1], [0, 0, 1, 1])
    : value([0, 0.15, 0.7, 1], [1, 1, 0, 0]);
  const name = visual.figure.nickname || SPECIES[visual.figure.speciesId]!.name;
  return (
    <View
      testID={`battle-switch-${visual.side}-${visual.phase}`}
      accessibilityLabel={sending ? `${name}正在上场` : `正在收回${name}`}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: anchor.x - size * (player ? 0.4 : 0.3),
          top: anchor.y - (player ? 5 : 4),
          width: size * (player ? 0.8 : 0.6),
          height: size * (player ? 0.14 : 0.1),
          borderRadius: size,
          backgroundColor: `${palette.ink}35`,
          opacity,
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          left: anchor.x - size * 0.72,
          top: anchor.y - size * 0.2,
          width: size * 1.44,
          height: size * 0.36,
          opacity: value([0, 0.25, 0.55, 1], [0, 0.7, 0.6, 0]),
          transform: reduced ? [] : [{ scale: value([0, 0.25, 1], [0.3, 0.6, 1.3]) }],
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 200 50" aria-hidden>
          <Ellipse
            cx={100}
            cy={25}
            rx={88}
            ry={17}
            fill={palette.tint}
            fillOpacity={0.6}
            stroke={sceneInk.gold}
            strokeWidth={2}
          />
          <Ellipse
            cx={100}
            cy={25}
            rx={70}
            ry={10}
            fill="none"
            stroke={sceneInk.paper}
            strokeWidth={2}
          />
        </Svg>
      </Animated.View>
      <Animated.View
        testID={`battle-switch-${visual.side}-creature`}
        style={{
          position: 'absolute',
          left: anchor.x - spriteSize / 2,
          top: anchor.y - size * (player ? 1.1 : 0.92),
          opacity,
          transform: reduced
            ? []
            : [
                {
                  translateX: revealing ? value([0, 0.6, 1], [-direction * size * 0.35, 0, 0]) : 0,
                },
                {
                  translateY: sending
                    ? value([0, 0.34, 0.65, 0.82, 1], [10, 10, -8, 2, 0])
                    : value([0, 1], [0, -size * 0.25]),
                },
                {
                  scale: sending
                    ? value([0, 0.34, 0.63, 0.82, 1], [0.1, 0.1, 1.08, 0.97, 1])
                    : value([0, 0.2, 0.75, 1], [1, 0.94, 0.05, 0.02]),
                },
              ],
        }}
      >
        <CreatureSprite
          speciesId={visual.figure.speciesId}
          size={spriteSize}
          view={player ? 'back' : 'front'}
          animate={completed && !paused && !ended && !reduced && sending}
        />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          left: anchor.x - size * 0.7,
          top: anchor.y - size * 1.15,
          width: size * 1.4,
          height: size * 1.4,
          opacity: sending
            ? value([0, 0.3, 0.42, 0.78, 1], [0, 0, 1, 0.5, 0])
            : value([0, 0.2, 0.6, 1], [0, 0.4, 0.65, 0]),
          transform: reduced
            ? []
            : [
                {
                  scale: sending ? value([0, 0.3, 1], [0.25, 0.25, 1.1]) : value([0, 1], [1, 0.15]),
                },
              ],
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 200 200" aria-hidden>
          <Circle cx={100} cy={100} r={58} fill={sceneInk.paper} opacity={0.24} />
          <Circle cx={100} cy={100} r={58} fill="none" stroke={sceneInk.gold} strokeWidth={1.5} />
          {!reduced &&
            Array.from({ length: 6 }, (_, i) => (
              <G key={i} transform={`rotate(${i * 60} 100 100)`}>
                <Path
                  d="m100 15 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"
                  fill={i % 2 ? sceneInk.paper : sceneInk.gold}
                  stroke={sceneInk.outline}
                  strokeWidth={1}
                />
                <Circle cx={128} cy={45} r={2} fill={sceneInk.gold} />
              </G>
            ))}
        </Svg>
      </Animated.View>
      {!revealing && (
        <Animated.View
          testID={`battle-switch-${visual.side}-ball`}
          style={{
            position: 'absolute',
            left: anchor.x - 16,
            top: anchor.y - size * 0.42 - 16,
            width: 32,
            height: 32,
            opacity: sending
              ? value([0, 0.3, 0.43, 1], [1, 1, 0, 0])
              : value([0, 0.4, 0.7, 1], [0, 0.5, 1, 0]),
            transform: reduced
              ? []
              : [
                  {
                    translateX: sending ? value([0, 0.35, 1], [-size * 0.6 * direction, 0, 0]) : 0,
                  },
                  { translateY: sending ? value([0, 0.18, 0.35, 1], [10, -size * 0.3, 0, 0]) : 0 },
                  {
                    rotate: sending
                      ? progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['-110deg', '170deg'],
                        })
                      : '0deg',
                  },
                  { scale: sending ? 1 : value([0, 0.7, 1], [0.5, 1, 0.4]) },
                ],
          }}
        >
          <Svg width={32} height={32} viewBox="0 0 40 40" aria-hidden>
            <Circle
              cx={20}
              cy={20}
              r={16}
              fill={sceneInk.paper}
              stroke={sceneInk.outline}
              strokeWidth={2}
            />
            <Path
              d="M4 20a16 16 0 0 1 32 0Z"
              fill={sceneInk.gold}
              stroke={sceneInk.outline}
              strokeWidth={2}
            />
            <Circle
              cx={20}
              cy={20}
              r={5}
              fill={sceneInk.paper}
              stroke={sceneInk.outline}
              strokeWidth={1.8}
            />
            <Path
              d="M11 13q3-4 8-4"
              fill="none"
              stroke={palette.tint}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}
