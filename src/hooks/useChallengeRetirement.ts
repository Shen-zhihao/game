import { useCallback, useEffect, useRef, useState } from 'react';
import type { Command, GameState } from '../game/model';

/** Asking or cancelling never touches the run; only a fresh confirmation may retire it. */
export function useChallengeRetirement(game: GameState, dispatch: (command: Command) => void) {
  const active = game.challenge?.active;
  const runKey = active ? (active.battleId ?? game.battle?.id ?? 'legacy-challenge') : null;
  const [view, setView] = useState({ runKey, visible: false });
  const pending = useRef<string | null>(null);
  const submitted = useRef<string | null>(null);
  if (view.runKey !== runKey) setView({ runKey, visible: false });

  useEffect(() => {
    pending.current = null;
    submitted.current = null;
  }, [runKey]);

  const cancel = useCallback(() => {
    pending.current = null;
    setView({ runKey, visible: false });
  }, [runKey]);
  const request = useCallback(() => {
    if (!runKey || pending.current === runKey || submitted.current === runKey) return;
    pending.current = runKey;
    setView({ runKey, visible: true });
  }, [runKey]);
  const confirm = useCallback(() => {
    if (!runKey || pending.current !== runKey || submitted.current === runKey) return;
    // Consume synchronously, before React rerenders or an extra tap can arrive.
    submitted.current = runKey;
    cancel();
    dispatch({ kind: 'challenge', action: { kind: 'retire' } });
  }, [cancel, dispatch, runKey]);

  return {
    visible: runKey !== null && view.runKey === runKey && view.visible,
    request,
    cancel,
    confirm,
  };
}
