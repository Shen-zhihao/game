import { useSyncExternalStore } from 'react';
import { createDayNightPreferences } from './controller';
import { driver } from './driver';

const preferences = createDayNightPreferences(driver);
export const setDayNightEnabled = preferences.setEnabled;
export const useDayNightEnabled = () =>
  useSyncExternalStore(preferences.subscribe, preferences.getEnabled, () => true);
