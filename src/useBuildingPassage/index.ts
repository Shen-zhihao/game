import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import { buildingPassage, BuildingPassage, DOOR_TIMINGS } from '../game/buildingPassage';
import type { GameState } from '../game/model';
import { SCENE_TRANSITION } from '../sceneTransition';

export interface DoorPresentation extends BuildingPassage {
  open: Animated.Value;
  travel: Animated.Value;
}

/** Gameplay has already committed the destination; only the displayed exploration scene waits. */
export function useBuildingPassage(game: GameState) {
  const [view, setView] = useState<{
    observedMap: string;
    game: GameState;
    passage: BuildingPassage | null;
    showDestination: boolean;
  }>({ observedMap: game.player.map, game, passage: null, showDestination: false });
  if (view.observedMap !== game.player.map) {
    setView({
      observedMap: game.player.map,
      game,
      passage: buildingPassage(view.game, game),
      showDestination: false,
    });
  } else if (!view.passage && view.game !== game) {
    setView({ ...view, game });
  }
  const [open] = useState(() => new Animated.Value(0));
  const [travel] = useState(() => new Animated.Value(0));
  const [curtain] = useState(() => new Animated.Value(0));
  const reduced = useRef(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) reduced.current = value;
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      reduced.current = value;
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  const passage = view.passage;
  useEffect(() => {
    open.setValue(0);
    travel.setValue(0);
    curtain.setValue(0);
    if (!passage) return;
    const timing = (value: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(value, {
        toValue,
        duration: reduced.current ? Math.min(80, duration) : duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
    // Keep the source scene visible until the full-screen curtain is opaque.
    let animation = passage.entering
      ? Animated.sequence([
          timing(open, 1, DOOR_TIMINGS.open),
          timing(travel, 1, DOOR_TIMINGS.pass),
          Animated.parallel([
            timing(open, 0, DOOR_TIMINGS.close),
            timing(curtain, 1, SCENE_TRANSITION.fadeOut),
          ]),
        ])
      : timing(curtain, 1, SCENE_TRANSITION.fadeOut);
    animation.start(({ finished }) => {
      if (!finished) return;
      setView((current) =>
        current.passage === passage ? { ...current, showDestination: true } : current,
      );
      // Leave one covered frame for React to commit the destination map and camera.
      animation = Animated.sequence([
        Animated.delay(SCENE_TRANSITION.coveredFrame),
        ...(passage.entering
          ? [timing(curtain, 0, SCENE_TRANSITION.fadeIn)]
          : [
              Animated.parallel([
                timing(curtain, 0, SCENE_TRANSITION.fadeIn),
                timing(open, 1, DOOR_TIMINGS.open),
              ]),
              timing(travel, 1, DOOR_TIMINGS.pass),
              timing(open, 0, DOOR_TIMINGS.close),
            ]),
      ]);
      animation.start(({ finished: revealed }) => {
        if (revealed)
          setView((current) =>
            current.passage === passage ? { ...current, passage: null } : current,
          );
      });
    });
    return () => animation.stop();
  }, [open, travel, curtain, passage]);
  const showingDoor = passage && (passage.entering ? !view.showDestination : view.showDestination);
  return {
    game: passage
      ? showingDoor
        ? passage.outside
        : view.showDestination
          ? game
          : passage.source
      : game,
    door: showingDoor ? ({ ...passage, open, travel } satisfies DoorPresentation) : null,
    transition: passage
      ? { opacity: curtain, entering: passage.entering, name: passage.entrance.name }
      : null,
  };
}
