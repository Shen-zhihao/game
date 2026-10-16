import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useAppActivity } from './useAppActivity';
import { useReducedMotion } from './usePresentationMotion';

/** Animate a resolved UI value; interruption resumes from the displayed native value. */
export function useAnimatedScalar(target: number, duration = 420, paused = false) {
  const [value] = useState(() => new Animated.Value(target));
  const active = useAppActivity();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (paused || !active) return;
    const animation = Animated.timing(value, {
      toValue: target,
      duration: reduced ? 1 : duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, duration, paused, reduced, target, value]);
  return value;
}
