import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Command, GameState } from '../game/model';
import {
  commandPresentation,
  fieldPresentation,
  JourneyEvent,
  rewardPresentation,
} from '../game/presentation';

export function useJourneyPresentation(game: GameState | null, send: (command: Command) => void) {
  const current = useRef(game);
  useLayoutEffect(() => {
    current.current = game;
  }, [game]);
  const pending = useRef<{ before: GameState; command: Command } | null>(null);
  const battleSource = useRef<GameState | null>(null);
  const rejectedInputTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequence = useRef(0);
  const [awaiting, setAwaiting] = useState<GameState | null>(null);
  const [view, setView] = useState<{ id: number; event: JourneyEvent; source: GameState } | null>(
    null,
  );
  const playing = useRef<typeof view>(null);
  const show = useCallback((event: JourneyEvent, source: GameState) => {
    const next = { id: ++sequence.current, event, source };
    playing.current = next;
    setView(next);
  }, []);
  const dispatch = useCallback(
    (command: Command) => {
      const before = current.current;
      if (!before || playing.current || pending.current) return;
      const event = commandPresentation(before, command);
      if (event?.kind === 'evolution') {
        show(event, before);
        return;
      }
      const input = { before, command };
      pending.current = input;
      setAwaiting(before);
      send(command);
      // Debounced or rejected commands may leave the session object unchanged.
      if (rejectedInputTimer.current) clearTimeout(rejectedInputTimer.current);
      rejectedInputTimer.current = setTimeout(() => {
        if (pending.current === input && current.current === before) {
          pending.current = null;
          setAwaiting(null);
        }
      }, 80);
      if (event) show(event, before);
    },
    [send, show],
  );
  useEffect(
    () => () => {
      if (rejectedInputTimer.current) clearTimeout(rejectedInputTimer.current);
    },
    [],
  );
  useLayoutEffect(() => {
    const input = pending.current;
    if (!game || !input || input.before === game) return;
    pending.current = null;
    setAwaiting(null);
    if (!input.before.battle && game.battle) battleSource.current = input.before;
    else if (
      input.before.battle &&
      game.battle &&
      !battleSource.current &&
      input.before.battle.phase !== 'ended'
    )
      battleSource.current = input.before;
    const reward =
      input.before.battle && !game.battle ? rewardPresentation(battleSource.current, game) : null;
    if (input.before.battle && !game.battle) battleSource.current = null;
    if (playing.current) return;
    const event = reward ?? fieldPresentation(input.before, game, input.command);
    if (event) show(event, input.before);
  }, [game, show]);
  const finish = useCallback(
    (cancel = false) => {
      const active = playing.current;
      if (!active) return;
      playing.current = null;
      setView(null);
      pending.current = null;
      setAwaiting(null);
      if (active.event.kind === 'evolution') send({ ...active.event.command, accept: !cancel });
    },
    [send],
  );
  const reset = useCallback(() => {
    playing.current = null;
    pending.current = null;
    battleSource.current = null;
    setAwaiting(null);
    setView(null);
  }, []);
  return { view, dispatch, finish, reset, game: view?.source ?? awaiting ?? game };
}
