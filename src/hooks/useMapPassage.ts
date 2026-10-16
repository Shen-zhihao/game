import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import type { GameState, MapId } from '../game/model';
import { buildingPassage } from '../game/buildingPassage';
import { useAppActivity } from './useAppActivity';
import { useReducedMotion } from './usePresentationMotion';

/** Cover non-door map changes until the destination asset has actually painted. */
export function useMapPassage(game: GameState, covered: boolean, paused: boolean) {
  const [view, setView] = useState<{
    observed: GameState;
    arrival: number;
    transition: { source: GameState; map: MapId } | null;
    revealed: boolean;
  }>({ observed: game, arrival: 0, transition: null, revealed: false });
  const [curtain] = useState(() => new Animated.Value(0));
  const [readyMap, setReadyMap] = useState<MapId | null>(null);
  const active = useAppActivity();
  const reduced = useReducedMotion();
  const lastTransition = useRef<typeof view.transition>(null);
  if (view.observed.player.map !== game.player.map) {
    const animate =
      !covered && !view.observed.battle && !game.battle && !buildingPassage(view.observed, game);
    setView({
      observed: game,
      arrival: view.arrival + 1,
      transition: animate ? { source: view.observed, map: game.player.map } : null,
      revealed: false,
    });
  } else if (view.observed !== game) setView({ ...view, observed: game });
  const transition = view.transition;
  useEffect(() => {
    if (lastTransition.current === transition) return;
    lastTransition.current = transition;
    curtain.setValue(0);
  }, [curtain, transition]);
  useEffect(() => {
    if (!transition || paused || !active || (view.revealed && readyMap !== transition.map)) return;
    let cancelled = false;
    let animation: Animated.CompositeAnimation | undefined;
    curtain.stopAnimation((value) => {
      if (cancelled) return;
      animation = Animated.timing(curtain, {
        toValue: view.revealed ? 0 : 1,
        duration: Math.max(
          1,
          (reduced ? 80 : view.revealed ? 260 : 180) * (view.revealed ? value : 1 - value),
        ),
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
      animation.start(({ finished }) => {
        if (!finished || cancelled) return;
        setView((current) =>
          current.transition !== transition
            ? current
            : view.revealed
              ? { ...current, transition: null }
              : { ...current, revealed: true },
        );
      });
    });
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [active, curtain, paused, readyMap, reduced, transition, view.revealed]);
  const onReady = useCallback((map: MapId) => setReadyMap(map), []);
  return {
    game: transition && !view.revealed ? transition.source : game,
    transition: transition ? { opacity: curtain, map: transition.map } : null,
    arrival: view.arrival,
    onReady,
  };
}
