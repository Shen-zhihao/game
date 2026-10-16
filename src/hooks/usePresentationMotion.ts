import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import { useAppActivity } from './useAppActivity';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduced(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

/** One presentation per mounted key. Native progress survives pauses and backgrounding. */
export function usePresentationMotion(duration: number, paused: boolean, onFinished: () => void) {
  const [progress] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();
  const active = useAppActivity();
  const finish = useRef(onFinished);
  useLayoutEffect(() => {
    finish.current = onFinished;
  }, [onFinished]);
  const notified = useRef(false);
  useEffect(() => {
    if (paused || !active || notified.current) return;
    let cancelled = false;
    let animation: Animated.CompositeAnimation | undefined;
    progress.stopAnimation((value) => {
      if (cancelled) return;
      animation = Animated.timing(progress, {
        toValue: 1,
        duration: Math.max(1, (reduced ? Math.min(300, duration) : duration) * (1 - value)),
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animation.start(({ finished }) => {
        if (!finished || cancelled || notified.current) return;
        notified.current = true;
        finish.current();
      });
    });
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [active, duration, paused, progress, reduced]);
  return { progress, reduced, active };
}
