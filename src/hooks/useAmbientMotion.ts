import { useEffect, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { useAppActivity } from './useAppActivity';
import { useReducedMotion } from './usePresentationMotion';

/** Native clocks wrap continuously; pause and backgrounding preserve each clock's phase. */
export function useAmbientMotion(durations: readonly number[], paused: boolean) {
  const [clocks] = useState(() => Array.from({ length: 6 }, () => new Animated.Value(0)));
  const active = useAppActivity();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (paused || !active || reduced) return;
    let cancelled = false;
    const animations: Animated.CompositeAnimation[] = [];
    clocks.forEach((clock, index) => {
      clock.stopAnimation((progress) => {
        if (cancelled) return;
        const duration = durations[index % durations.length]!;
        const timing = (ms: number) =>
          Animated.timing(clock, {
            toValue: 1,
            duration: Math.max(1, ms),
            easing: Easing.linear,
            // RN Web's loop checks this flag before its timing fallback; a native loop stalls there.
            useNativeDriver: Platform.OS !== 'web',
            isInteraction: false,
          });
        const animation = Animated.sequence([
          timing(duration * (1 - progress)),
          Animated.loop(timing(duration)),
        ]);
        animations.push(animation);
        animation.start();
      });
    });
    return () => {
      cancelled = true;
      animations.forEach((animation) => animation.stop());
    };
  }, [active, clocks, durations, paused, reduced]);
  return { clocks, reduced };
}
