import { useSyncExternalStore } from 'react';
import { getMusicPreferences, subscribeMusicPreferences } from '../platform/music';

export const useMusicPreferences = () =>
  useSyncExternalStore(subscribeMusicPreferences, getMusicPreferences, getMusicPreferences);
