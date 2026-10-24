import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import {
  AppState,
  Platform,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import type { Direction } from '../../game/model';
import { haptic } from '../../platform/haptics';
import { palette } from '../ui';

const BUTTONS = [
  { direction: 'up', label: '上', mark: '↑', x: 1, y: 0 },
  { direction: 'left', label: '左', mark: '←', x: 0, y: 1 },
  { direction: 'right', label: '右', mark: '→', x: 2, y: 1 },
  { direction: 'down', label: '下', mark: '↓', x: 1, y: 2 },
] as const;

type Gesture = {
  direction: Direction;
  id: string;
  left: number;
  top: number;
};

export function DirectionPad({
  size,
  disabled = false,
  opacity = 1,
  onDirection,
  onRelease,
}: {
  size: number;
  disabled?: boolean;
  opacity?: number;
  onDirection?: (direction: Direction) => void;
  onRelease?: () => void;
}) {
  const [pressed, setPressed] = useState<Direction | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const held = useRef<Direction | null>(null);
  const callbacks = useRef({ onDirection, onRelease });
  useLayoutEffect(() => {
    callbacks.current = { onDirection, onRelease };
  }, [onDirection, onRelease]);
  const stop = useCallback(() => {
    if (!held.current) return;
    held.current = null;
    setPressed(null);
    callbacks.current.onRelease?.();
  }, []);
  const release = useCallback(() => {
    gesture.current = null;
    stop();
  }, [stop]);
  const begin = (direction: Direction) => {
    if (disabled || held.current === direction) return;
    held.current = direction;
    setPressed(direction);
    callbacks.current.onDirection?.(direction);
  };
  useLayoutEffect(() => {
    if (disabled) release();
  }, [disabled, release]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', release);
    if (Platform.OS === 'web') window.addEventListener('blur', release);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('blur', release);
      gesture.current = null;
      if (held.current) callbacks.current.onRelease?.();
      held.current = null;
    };
  }, [release]);

  const gap = size * 0.035;
  const buttonSize = (size - gap * 2) / 3;
  const activate = (direction: Direction) => {
    if (disabled || gesture.current || held.current) return;
    haptic('selection');
    begin(direction);
    stop();
  };
  const update = (direction: Direction, event: GestureResponderEvent) => {
    const active = gesture.current;
    if (disabled || active?.direction !== direction) return;
    const touch = event.nativeEvent.touches.find((value) => value.identifier === active.id);
    if (!touch) {
      release();
      return;
    }
    if (
      touch.pageX >= active.left &&
      touch.pageX <= active.left + buttonSize &&
      touch.pageY >= active.top &&
      touch.pageY <= active.top + buttonSize
    ) {
      begin(direction);
    } else {
      // Leaving a key stops immediately, without Pressable's delayed press-out.
      stop();
    }
  };
  return (
    <View
      testID="movement-dpad"
      pointerEvents="box-none"
      style={{ width: size, height: size, opacity: opacity * (disabled ? 0.35 : 1) }}
    >
      {BUTTONS.map(({ direction, label, mark, x, y }) => (
        <View
          key={direction}
          testID={`movement-${direction}`}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`向${label}移动`}
          accessibilityHint="按住持续移动，松手停止"
          accessibilityState={{ disabled }}
          accessibilityActions={[{ name: 'activate', label: '移动一步' }]}
          onAccessibilityTap={() => activate(direction)}
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === 'activate') activate(direction);
          }}
          onStartShouldSetResponder={() => !disabled}
          onResponderGrant={({ nativeEvent }) => {
            if (disabled) return;
            gesture.current = {
              direction,
              id: nativeEvent.identifier,
              left: nativeEvent.pageX - nativeEvent.locationX,
              top: nativeEvent.pageY - nativeEvent.locationY,
            };
            haptic('selection');
            begin(direction);
          }}
          onResponderMove={(event) => update(direction, event)}
          onResponderEnd={(event) => {
            if (
              gesture.current?.direction === direction &&
              !event.nativeEvent.touches.some((touch) => touch.identifier === gesture.current?.id)
            )
              release();
          }}
          onResponderRelease={() => {
            if (gesture.current?.direction === direction) release();
          }}
          onResponderTerminate={() => {
            if (gesture.current?.direction === direction) release();
          }}
          onResponderTerminationRequest={() => true}
          {...(Platform.OS === 'web'
            ? {
                tabIndex: disabled ? -1 : 0,
                onKeyDown: (event: KeyboardEvent) => {
                  if (!['Enter', ' '].includes(event.key)) return;
                  event.preventDefault();
                  event.stopPropagation();
                  if (!disabled && !event.repeat) {
                    haptic('selection');
                    begin(direction);
                  }
                },
                onKeyUp: (event: KeyboardEvent) => {
                  if (!['Enter', ' '].includes(event.key)) return;
                  event.preventDefault();
                  event.stopPropagation();
                  if (held.current === direction) release();
                },
                onBlur: () => {
                  if (held.current === direction) release();
                },
                onClick: (event: MouseEvent) => {
                  if (event.detail === 0) activate(direction);
                },
              }
            : {})}
          style={[
            s.button,
            {
              width: buttonSize,
              height: buttonSize,
              left: x * (buttonSize + gap),
              top: y * (buttonSize + gap),
              borderRadius: size * 0.07,
            },
            pressed === direction && s.pressed,
          ]}
        >
          <Text pointerEvents="none" style={[s.arrow, { fontSize: size * 0.19 }]}>
            {mark}
          </Text>
        </View>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  button: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${palette.panel}ed`,
    borderColor: `${palette.ink}99`,
    borderWidth: 2,
    userSelect: 'none',
    ...(Platform.OS === 'web' ? { touchAction: 'none', cursor: 'pointer' } : {}),
  },
  pressed: { backgroundColor: palette.amber, borderColor: '#b99042' },
  arrow: { color: palette.ink, fontWeight: '800' },
});
