import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import type { Command, Direction, GameState, WalkDirection } from '../game/model';
import { resolveWalk, WALK_VECTORS, walkDirection } from '../game/movement';

const KEY_DIRECTIONS: Record<string, Direction> = {
  arrowup: 'up',
  w: 'up',
  arrowdown: 'down',
  s: 'down',
  arrowleft: 'left',
  a: 'left',
  arrowright: 'right',
  d: 'right',
};

export function useWalkInput({
  game,
  paused,
  blocked,
  dispatch,
  onMenu,
}: {
  game: GameState;
  paused: boolean;
  blocked: boolean;
  dispatch: (command: Command) => void;
  onMenu: () => void;
}) {
  const input = useRef({ game, paused, blocked, dispatch, onMenu });
  useLayoutEffect(() => {
    input.current = { game, paused, blocked, dispatch, onMenu };
  }, [game, paused, blocked, dispatch, onMenu]);
  const held = useRef<WalkDirection | null>(null);
  const keys = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextStepAt = useRef(0);
  const endMovement = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    held.current = null;
  }, []);
  const stop = useCallback(() => {
    keys.current.clear();
    endMovement();
  }, [endMovement]);
  const direction = useCallback(
    (value: WalkDirection) => {
      if (input.current.blocked) return;
      held.current = value;
      if (timer.current !== null) return;
      const step = () => {
        timer.current = null;
        if (input.current.blocked || !held.current) {
          endMovement();
          return;
        }
        const wait = nextStepAt.current - Date.now();
        if (wait > 0) {
          timer.current = setTimeout(step, wait);
          return;
        }
        const current = input.current;
        const delay = resolveWalk(current.game, held.current).interval;
        nextStepAt.current = Date.now() + delay;
        current.dispatch({ kind: 'walk', direction: held.current });
        timer.current = setTimeout(step, delay);
      };
      step();
    },
    [endMovement],
  );
  useEffect(() => {
    if (blocked) stop();
    return stop;
  }, [blocked, stop]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', stop);
    return () => subscription.remove();
  }, [stop]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const updateKeys = () => {
      if (input.current.blocked) {
        stop();
        return;
      }
      let x = 0,
        y = 0;
      for (const key of keys.current) {
        const [dx, dy] = WALK_VECTORS[KEY_DIRECTIONS[key]!];
        x += dx;
        y += dy;
      }
      x = Math.sign(x);
      y = Math.sign(y);
      if (x || y) direction(walkDirection(x, y));
      else endMovement();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (input.current.paused) return;
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable)
        return;
      const key = event.key.toLowerCase();
      if (KEY_DIRECTIONS[key]) {
        event.preventDefault();
        if (!event.repeat) {
          keys.current.add(key);
          updateKeys();
        }
        return;
      }
      if (key === 'r' && !event.repeat && !input.current.blocked) {
        event.preventDefault();
        stop();
        input.current.dispatch({ kind: 'setRunning', running: !input.current.game.player.running });
        return;
      }
      if (!event.repeat && ['enter', ' ', 'z'].includes(key)) {
        event.preventDefault();
        stop();
        if (input.current.game.dialogue) input.current.dispatch({ kind: 'nextDialogue' });
        else if (!input.current.blocked) input.current.dispatch({ kind: 'interact' });
      }
      if (key === 'escape' && !event.repeat && !input.current.blocked) {
        stop();
        input.current.onMenu();
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      if (keys.current.delete(event.key.toLowerCase())) updateKeys();
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', stop);
      stop();
    };
  }, [direction, endMovement, stop]);
  return { direction, stop };
}
