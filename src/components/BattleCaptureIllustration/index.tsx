import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { ITEMS } from '../../content/catalog';
import { sceneInk } from '../../content/sceneArt';
import type { BattleCaptureEvent } from '../../game/model';
import { captureAnimationTiming } from '../../game/battleVisuals';
import { haptic } from '../../platform/haptics';
import { CreatureSprite } from '../CreatureSprite';
import { ItemIcon } from '../ItemIcon';

/** Plays an already resolved capture. Pausing or replaying never consumes another ball. */
export function BattleCaptureIllustration({
  event,
  playerAnchor,
  enemyAnchor,
  size,
  eventKey,
  paused,
  completed,
  reduced,
  onFinished,
}: {
  event: BattleCaptureEvent;
  playerAnchor: { x: number; y: number };
  enemyAnchor: { x: number; y: number };
  size: number;
  eventKey: string;
  paused: boolean;
  completed: boolean;
  reduced: boolean;
  onFinished: (key: string) => void;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const notified = useRef(false);
  const { shakes, releaseAt, endAt, duration: normalDuration } = captureAnimationTiming(event);
  const duration = reduced ? 420 : normalDuration;
  useEffect(() => {
    if (completed) {
      progress.setValue(1);
      return;
    }
    if (paused) return;
    let cancelled = false;
    let animation: Animated.CompositeAnimation | undefined;
    progress.stopAnimation((value) => {
      if (cancelled) return;
      animation = Animated.timing(progress, {
        toValue: 1,
        duration: Math.max(1, duration * (1 - value)),
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animation.start(({ finished }) => {
        if (!finished || cancelled || notified.current) return;
        notified.current = true;
        if (event.caught) haptic('success');
        onFinished(eventKey);
      });
    });
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [completed, duration, event.caught, eventKey, onFinished, paused, progress]);

  const playhead = progress.interpolate({ inputRange: [0, 1], outputRange: [0, endAt] });
  const value = (inputRange: number[], outputRange: number[]) =>
    playhead.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });
  const ballSize = Math.max(40, Math.min(56, size * 0.3));
  const ballTop = enemyAnchor.y - ballSize * 0.88;
  const ballCenterY = ballTop + ballSize * 0.52;
  const startX = playerAnchor.x - enemyAnchor.x;
  const startY = playerAnchor.y - size * 0.65 - ballCenterY;
  const hitY = enemyAnchor.y - size * 0.47 - ballCenterY;
  const wobbleTimes = [0, 0.22, 0.35, 0.52];
  const wobbleX = [startX, 0, 0, 0];
  const wobbleAngles = ['-80deg', '360deg', '0deg', '0deg'];
  for (let i = 0; i < shakes; i++) {
    wobbleTimes.push((54 + i * 10) / 100, (57 + i * 10) / 100, (60 + i * 10) / 100);
    wobbleX.push(-4, 4, 0);
    wobbleAngles.push('-20deg', '20deg', '0deg');
  }
  wobbleTimes.push(endAt);
  wobbleX.push(0);
  wobbleAngles.push('0deg');
  const targetOpacity = value(
    [0, 0.24, 0.35, releaseAt, releaseAt + 0.11, endAt],
    [1, 1, 0, 0, event.caught ? 0 : 1, event.caught ? 0 : 1],
  );
  return (
    <View
      testID="battle-capture-animation"
      accessibilityLabel={`${ITEMS[event.ballId]!.name}捕捉动画`}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: enemyAnchor.x - size * 0.3,
          top: enemyAnchor.y - 4,
          width: size * 0.6,
          height: size * 0.1,
          borderRadius: size,
          backgroundColor: '#65554135',
          opacity: targetOpacity,
        }}
      />
      <Animated.View
        testID="battle-capture-target"
        style={{
          position: 'absolute',
          left: enemyAnchor.x - size / 2,
          top: enemyAnchor.y - size * 0.92,
          opacity: targetOpacity,
          transform: reduced
            ? []
            : [
                {
                  scale: value(
                    [0, 0.23, 0.35, releaseAt, releaseAt + 0.1, endAt],
                    [1, 1, 0.02, 0.02, event.caught ? 0.02 : 1.08, event.caught ? 0.02 : 1],
                  ),
                },
                {
                  translateY: value(
                    [0, 0.24, 0.35, releaseAt, endAt],
                    [0, 0, -size * 0.15, -size * 0.15, 0],
                  ),
                },
              ],
        }}
      >
        <CreatureSprite speciesId={event.scene.enemy.speciesId} size={size} animate={false} />
      </Animated.View>
      {!reduced && (
        <Animated.View
          style={{
            position: 'absolute',
            left: enemyAnchor.x - size * 0.6,
            top: enemyAnchor.y - size * 1.05,
            width: size * 1.2,
            height: size * 1.2,
            opacity: value(
              [0, 0.21, 0.25, 0.36, releaseAt - 0.02, releaseAt + 0.03, releaseAt + 0.14, endAt],
              [0, 0, 0.9, 0, 0, event.caught ? 0 : 0.9, 0, 0],
            ),
            transform: [
              {
                scale: value(
                  [0, 0.21, 0.36, releaseAt - 0.02, releaseAt + 0.14, endAt],
                  [0.3, 0.3, 1.2, 0.3, 1.2, 1.2],
                ),
              },
            ],
          }}
        >
          <Svg width="100%" height="100%" viewBox="0 0 160 160" aria-hidden>
            <Circle cx={80} cy={80} r={40} fill={sceneInk.paper} fillOpacity={0.65} />
            <Circle cx={80} cy={80} r={53} fill="none" stroke={sceneInk.gold} strokeWidth={3} />
            <Circle cx={80} cy={80} r={65} fill="none" stroke={sceneInk.paper} strokeWidth={2} />
          </Svg>
        </Animated.View>
      )}
      <Animated.View
        testID="battle-capture-ball"
        style={{
          position: 'absolute',
          left: enemyAnchor.x - ballSize / 2,
          top: ballTop,
          width: ballSize,
          height: ballSize,
          opacity: event.caught ? 1 : value([0, releaseAt, releaseAt + 0.08, endAt], [1, 1, 0, 0]),
          transform: reduced
            ? []
            : [
                {
                  translateX: value(wobbleTimes, wobbleX),
                },
                {
                  translateY: value(
                    [0, 0.11, 0.22, 0.35, 0.44, 0.48, 0.52, endAt],
                    [startY, (startY + hitY) / 2 - size * 0.55, hitY, hitY, 0, -10, 0, 0],
                  ),
                },
                {
                  rotate: playhead.interpolate({
                    inputRange: wobbleTimes,
                    outputRange: wobbleAngles,
                    extrapolate: 'clamp',
                  }),
                },
              ],
        }}
      >
        <ItemIcon itemId={event.ballId} size={ballSize} />
        {event.caught && (
          <Animated.View
            style={{
              position: 'absolute',
              left: ballSize * 0.43,
              top: ballSize * 0.45,
              width: ballSize * 0.14,
              height: ballSize * 0.14,
              borderRadius: ballSize,
              backgroundColor: sceneInk.gold,
              opacity: value([0, 0.82, 0.87, 1], [0, 0, 1, 1]),
            }}
          />
        )}
      </Animated.View>
      {event.caught && !reduced && (
        <Animated.View
          testID="battle-capture-stars"
          style={{
            position: 'absolute',
            left: enemyAnchor.x - 70,
            top: enemyAnchor.y - 100,
            width: 140,
            height: 100,
            opacity: value([0, 0.82, 0.88, 0.95, 1], [0, 0, 1, 1, 0]),
            transform: [
              { translateY: value([0, 0.82, 1], [10, 10, -12]) },
              { scale: value([0, 0.82, 0.92, 1], [0.4, 0.4, 1, 1.15]) },
            ],
          }}
        >
          <Svg width="100%" height="100%" viewBox="0 0 140 100" aria-hidden>
            {[
              [-39, 15],
              [0, 0],
              [39, 15],
            ].map(([x, y], i) => (
              <G key={i} x={x} y={y}>
                <Path
                  d="m70 18 4 10 11 4-11 4-4 11-4-11-11-4 11-4Z"
                  fill={sceneInk.gold}
                  stroke={sceneInk.outline}
                  strokeWidth={1.4}
                />
                <Circle cx={81} cy={57} r={2} fill={sceneInk.gold} />
              </G>
            ))}
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}
