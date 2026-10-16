import { useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import { calendarDetails } from '../game/calendar';
import { isIndoor } from '../game/environment';
import type { GameState } from '../game/model';
import { useDayNightEnabled } from '../platform/dayNight';

export function useNightLighting(game: GameState, coveredTransition = false) {
  const enabled = useDayNightEnabled();
  const night = enabled && !isIndoor(game.player.map) && calendarDetails(game).night;
  const [intensity] = useState(() => new Animated.Value(night ? 1 : 0));
  const previousMap = useRef(game.player.map);
  const reduced = useRef(false);
  useLayoutEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) reduced.current = value;
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      reduced.current = value;
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  useLayoutEffect(() => {
    intensity.stopAnimation();
    const changedMap = previousMap.current !== game.player.map;
    previousMap.current = game.player.map;
    // Entering a scene must begin at its final brightness beneath the existing transition.
    if (changedMap || coveredTransition || isIndoor(game.player.map)) {
      intensity.setValue(night ? 1 : 0);
      return;
    }
    const animation = Animated.timing(intensity, {
      toValue: night ? 1 : 0,
      duration: reduced.current ? 0 : enabled ? 6000 : 1200,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [coveredTransition, enabled, game.player.map, intensity, night]);
  return intensity;
}
