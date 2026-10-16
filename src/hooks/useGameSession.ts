import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Command } from '../game/model';
import { SaveRepository } from '../persistence/repository';
import { SaveSession, SessionState } from '../persistence/session';
import { resolveWalk } from '../game/movement';

export function useGameSession(repository: SaveRepository | null) {
  const [state, setState] = useState<SessionState>({ game: null, slot: 1, saveStatus: '' });
  const [active, setActive] = useState(AppState.currentState === 'active');
  const controller = useMemo(
    () => (repository ? new SaveSession(repository, setState) : null),
    [repository],
  );
  const paused = useRef(false);
  const lastBattleInput = useRef(0);
  const lastWalkInput = useRef(0);
  const save = useCallback(() => controller?.save() ?? Promise.resolve(null), [controller]);
  const load = useCallback(
    async (targetSlot: number) => {
      if (!controller) return;
      await controller.load(targetSlot);
      lastBattleInput.current = 0;
      lastWalkInput.current = 0;
    },
    [controller],
  );
  const dispatch = useCallback(
    (command: Command) => {
      const current = controller?.state.game;
      if (!current) return;
      if (command.kind === 'walk') {
        if (Date.now() < lastWalkInput.current) return;
        lastWalkInput.current = Date.now() + resolveWalk(current, command.direction).interval - 12;
      }
      if (command.kind === 'battle') {
        if (Date.now() - lastBattleInput.current < 300) return;
        lastBattleInput.current = Date.now();
      }
      controller!.dispatch(command);
    },
    [controller],
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      if (state !== 'active' && !paused.current) void save().catch(() => undefined);
    });
    return () => listener.remove();
  }, [save]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!controller?.state.game || paused.current || AppState.currentState !== 'active') return;
      dispatch({ kind: 'tick', seconds: 1 });
      if (controller.state.game.playTimeSeconds % 10 === 0) void save().catch(() => undefined);
    }, 1000);
    return () => clearInterval(timer);
  }, [controller, dispatch, save]);
  const pause = useCallback((value: boolean) => {
    paused.current = value;
  }, []);
  const unload = useCallback(async () => {
    await controller?.unload();
  }, [controller]);
  const saveAs = useCallback(() => {
    if (!controller) return Promise.reject(new Error('存档系统尚未就绪'));
    return controller.saveAs();
  }, [controller]);
  return { ...state, active, dispatch, save, saveAs, load, pause, unload };
}
