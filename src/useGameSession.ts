import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { reduceGame } from './game/engine';
import { Command, GameState } from './game/model';
import { SaveRepository } from './persistence/repository';
import { Snapshot } from './persistence/snapshot';

export function useGameSession(repository: SaveRepository | null) {
  const [game, setGame] = useState<GameState | null>(null);
  const [slot, setSlot] = useState(1);
  const [saveStatus, setSaveStatus] = useState('');
  const [active, setActive] = useState(AppState.currentState === 'active');
  const ref = useRef<{
    game: GameState | null;
    snapshot: Snapshot | null;
    slot: number;
    generation: number;
    dirty: number;
    saved: number;
    branchId: string | undefined;
  }>({
    game: null,
    snapshot: null,
    slot: 1,
    generation: 0,
    dirty: 0,
    saved: 0,
    branchId: undefined,
  });
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const paused = useRef(false);
  const lastBattleInput = useRef(0);
  const lastWalkInput = useRef(0);
  const save = useCallback(async (): Promise<Snapshot | null> => {
    if (!repository || !ref.current.game) return null;
    const captured = { ...ref.current };
    const operation = queue.current.then(async () => {
      if (captured.generation !== ref.current.generation) return null;
      if (captured.dirty <= ref.current.saved) return ref.current.snapshot;
      setSaveStatus('正在保存…');
      const snapshot = await repository.save(
        captured.slot,
        captured.game!,
        ref.current.snapshot?.revisionId ?? null,
        ref.current.branchId,
      );
      if (captured.generation === ref.current.generation) {
        ref.current.snapshot = snapshot;
        ref.current.saved = captured.dirty;
        setSaveStatus(captured.dirty === ref.current.dirty ? '已保存' : '有新进度');
      }
      return snapshot;
    });
    queue.current = operation.catch((error: unknown) => {
      if (captured.generation === ref.current.generation)
        setSaveStatus(`保存失败：${error instanceof Error ? error.message : '请重试'}`);
    });
    return operation;
  }, [repository]);
  const load = useCallback(
    async (targetSlot: number) => {
      if (!repository) return;
      await queue.current;
      await repository.drain();
      const loaded = await repository.load(targetSlot);
      if (!loaded) throw new Error('这个槽位还没有存档');
      ref.current = {
        game: loaded.game,
        snapshot: loaded.snapshot,
        slot: targetSlot,
        generation: ref.current.generation + 1,
        dirty: 0,
        saved: 0,
        branchId: repository.newBranch(),
      };
      lastBattleInput.current = 0;
      lastWalkInput.current = 0;
      setSlot(targetSlot);
      setGame(loaded.game);
      setSaveStatus('已读取');
    },
    [repository],
  );
  const dispatch = useCallback(
    (command: Command) => {
      const current = ref.current.game;
      if (!current) return;
      if (command.kind === 'walk') {
        if (Date.now() - lastWalkInput.current < 145) return;
        lastWalkInput.current = Date.now();
      }
      if (command.kind === 'battle') {
        if (Date.now() - lastBattleInput.current < 300) return;
        lastBattleInput.current = Date.now();
      }
      const next = reduceGame(current, command);
      if (next === current) return;
      ref.current.game = next;
      ref.current.dirty += 1;
      setGame(next);
      if (!['walk', 'tick'].includes(command.kind)) void save().catch(() => undefined);
    },
    [save],
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
      if (!ref.current.game || paused.current || AppState.currentState !== 'active') return;
      dispatch({ kind: 'tick', seconds: 1 });
      if (ref.current.game.playTimeSeconds % 10 === 0) void save().catch(() => undefined);
    }, 1000);
    return () => clearInterval(timer);
  }, [dispatch, save]);
  const pause = useCallback((value: boolean) => {
    paused.current = value;
  }, []);
  const unload = useCallback(async () => {
    await save();
    ref.current.generation += 1;
    ref.current.game = null;
    setGame(null);
  }, [save]);
  return { game, slot, saveStatus, active, dispatch, save, load, pause, unload };
}
