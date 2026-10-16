import { useSyncExternalStore } from 'react';
import { createPlaybackPreferences, DEFAULT_BATTLE_MESSAGE_DELAY } from './controller';
import { driver } from './driver';

const preferences = createPlaybackPreferences(driver);
export const setBattleMessageDelay = preferences.setDelay;
export const useBattleMessageDelay = () =>
  useSyncExternalStore(
    preferences.subscribe,
    preferences.getDelay,
    () => DEFAULT_BATTLE_MESSAGE_DELAY,
  );
export { BATTLE_MESSAGE_DELAYS } from './controller';
