import { createPlaybackPreferences } from './controller';
import { driver } from './driver';

const preferences = createPlaybackPreferences(driver);
export const setBattleMessageDelay = preferences.setDelay;
export const subscribeBattleMessageDelay = preferences.subscribe;
export const getBattleMessageDelay = preferences.getDelay;
export { BATTLE_MESSAGE_DELAYS } from './controller';
