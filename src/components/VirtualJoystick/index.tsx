import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Platform,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import type { WalkDirection } from '../../game/model';
import { walkDirection } from '../../game/movement';
import { haptic } from '../../platform/haptics';
import { palette } from '../ui';

export function VirtualJoystick({
  size,
  disabled = false,
  opacity = 1,
  onDirection,
  onRelease,
}: {
  size: number;
  disabled?: boolean;
  opacity?: number;
  onDirection?: (direction: WalkDirection) => void;
  onRelease?: () => void;
}) {
  const [knob] = useState(() => new Animated.ValueXY());
  const [engagement] = useState(() => new Animated.Value(0));
  const gesture = useRef<{ id: string; x: number; y: number } | null>(null);
  const direction = useRef<WalkDirection | null>(null);
  const callbacks = useRef({ onDirection, onRelease });
  useLayoutEffect(() => {
    callbacks.current = { onDirection, onRelease };
  }, [onDirection, onRelease]);
  const radius = size * 0.29;
  const release = useCallback(() => {
    const engaged = gesture.current !== null || direction.current !== null;
    gesture.current = null;
    direction.current = null;
    engagement.setValue(0);
    knob.stopAnimation();
    Animated.spring(knob, {
      toValue: { x: 0, y: 0 },
      speed: 24,
      bounciness: 5,
      useNativeDriver: true,
    }).start();
    if (engaged) callbacks.current.onRelease?.();
  }, [engagement, knob]);
  useEffect(() => {
    if (disabled) release();
  }, [disabled, release]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', release);
    if (Platform.OS === 'web') window.addEventListener('blur', release);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('blur', release);
      knob.stopAnimation();
      if (gesture.current || direction.current) callbacks.current.onRelease?.();
    };
  }, [knob, release]);
  const update = (event: GestureResponderEvent) => {
    if (disabled || !gesture.current) return;
    const touch = event.nativeEvent.touches.find((t) => t.identifier === gesture.current!.id);
    if (!touch) return;
    const x = touch.pageX - gesture.current.x;
    const y = touch.pageY - gesture.current.y;
    const distance = Math.hypot(x, y);
    const ratio = distance > radius ? radius / distance : 1;
    knob.setValue({ x: x * ratio, y: y * ratio });
    // Hysteresis at the centre lets a resting thumb stop without tiny accidental steps.
    const deadZone = size * (direction.current ? 0.085 : 0.13);
    if (distance < deadZone) {
      if (direction.current) callbacks.current.onRelease?.();
      direction.current = null;
      return;
    }
    const next = walkDirection(x, y, direction.current);
    if (next !== direction.current) {
      direction.current = next;
      callbacks.current.onDirection?.(next);
    }
  };
  return (
    <Animated.View
      testID="movement-joystick"
      accessible
      accessibilityRole="image"
      accessibilityLabel="移动摇杆"
      accessibilityHint="拖动摇杆可向八个方向移动，松手停止"
      accessibilityState={{ disabled }}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderGrant={(event) => {
        if (disabled) return;
        const touch = event.nativeEvent;
        knob.stopAnimation();
        gesture.current = {
          id: touch.identifier,
          x: touch.pageX - event.nativeEvent.locationX + size / 2,
          y: touch.pageY - event.nativeEvent.locationY + size / 2,
        };
        engagement.setValue(1);
        haptic('selection');
        update(event);
      }}
      onResponderMove={update}
      onResponderRelease={release}
      onResponderEnd={(event) => {
        if (!event.nativeEvent.touches.some((t) => t.identifier === gesture.current?.id)) release();
      }}
      onResponderTerminate={release}
      onResponderTerminationRequest={() => false}
      style={[
        s.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: opacity * (disabled ? 0.35 : 1),
        },
        {
          backgroundColor: engagement.interpolate({
            inputRange: [0, 1],
            outputRange: [`${palette.panel}c7`, `${palette.panel}e8`],
          }),
          borderColor: engagement.interpolate({
            inputRange: [0, 1],
            outputRange: [`${palette.ink}66`, '#b99042'],
          }),
        },
      ]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[s.track, { inset: size * 0.13, borderRadius: size / 2 }]} />
        {(['▴', '▸', '▾', '◂'] as const).map((mark, index) => (
          <Text
            key={mark}
            style={[
              s.mark,
              {
                fontSize: size * 0.12,
                lineHeight: size * 0.16,
                width: size * 0.16,
                height: size * 0.16,
                left: size * [0.42, 0.8, 0.42, 0.04][index]!,
                top: size * [0.015, 0.42, 0.81, 0.42][index]!,
              },
            ]}
          >
            {mark}
          </Text>
        ))}
        <Animated.View
          testID="joystick-knob"
          style={[
            s.knob,
            {
              left: size * 0.29,
              top: size * 0.29,
              width: size * 0.42,
              height: size * 0.42,
              borderRadius: size / 2,
              transform: knob.getTranslateTransform(),
            },
            {
              backgroundColor: engagement.interpolate({
                inputRange: [0, 1],
                outputRange: [palette.tint, palette.amber],
              }),
            },
          ]}
        >
          <View
            style={[
              s.knobInset,
              { width: size * 0.23, height: size * 0.23, borderRadius: size / 2 },
            ]}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}
const s = StyleSheet.create({
  base: {
    backgroundColor: `${palette.panel}c7`,
    borderWidth: 2,
    borderColor: `${palette.ink}66`,
    ...(Platform.OS === 'web' ? { touchAction: 'none' } : {}),
    userSelect: 'none',
  },
  track: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: `${palette.ink}22`,
    backgroundColor: `${palette.panel2}88`,
  },
  mark: { position: 'absolute', color: `${palette.ink}66`, textAlign: 'center' },
  knob: {
    position: 'absolute',
    backgroundColor: palette.tint,
    borderWidth: 2,
    borderColor: '#b99042',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 3px 0px #362f2626',
  },
  knobInset: { borderWidth: 1, borderColor: '#b9904266', backgroundColor: `${palette.panel}44` },
});
