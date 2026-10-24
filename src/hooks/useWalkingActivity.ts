import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { GameState } from '../game/model';
import { travelProfile } from '../game/environment';
import { forcedTravelDuration } from '../game/movement';
import { useAppActivity } from './useAppActivity';

/** Track real tile travel, not held input: pushing against a wall must not dim the HUD. */
export function useWalkingActivity(game: GameState, blocked: boolean): boolean {
  const active = useAppActivity();
  const [walking, setWalking] = useState(false);
  const previous = useRef(game.player);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setWalking(false);
  }, []);
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = game.player;
    if (blocked || !active || before.map !== game.player.map) {
      stop();
      return;
    }
    const dx = Math.abs(before.x - game.player.x);
    const dy = Math.abs(before.y - game.player.y);
    if (!dx && !dy) return;
    const forced = forcedTravelDuration({ player: before }, game);
    if (!forced && Math.max(dx, dy) !== 1) {
      stop();
      return;
    }
    if (timer.current !== null) clearTimeout(timer.current);
    setWalking(true);
    const profile = travelProfile(game);
    // Bridge the small gap between sprite interpolation and the next walking step.
    // A bounded timer also restores readability after release or a blocked next step.
    timer.current = setTimeout(
      stop,
      (forced || Math.max(profile.duration, profile.interval) * Math.hypot(dx, dy)) + 40,
    );
  }, [active, blocked, game, stop]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', stop);
    if (Platform.OS === 'web') window.addEventListener('blur', stop);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('blur', stop);
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [stop]);
  return walking && !blocked && active;
}
