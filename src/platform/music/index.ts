import { preferenceDriver } from './driver';
import { createMusicPreferences } from './preferences';

const preferences = createMusicPreferences(preferenceDriver);
export const setMusicPreferences = preferences.set;
export const subscribeMusicPreferences = preferences.subscribe;
export const getMusicPreferences = preferences.get;
