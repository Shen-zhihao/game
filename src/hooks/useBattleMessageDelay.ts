import { useSyncExternalStore } from 'react';
import { getBattleMessageDelay, subscribeBattleMessageDelay } from '../platform/battlePlayback';
import { DEFAULT_BATTLE_MESSAGE_DELAY } from '../platform/battlePlayback/controller';

export const useBattleMessageDelay = () =>
  useSyncExternalStore(
    subscribeBattleMessageDelay,
    getBattleMessageDelay,
    () => DEFAULT_BATTLE_MESSAGE_DELAY,
  );
