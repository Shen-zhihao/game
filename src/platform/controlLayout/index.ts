import { useSyncExternalStore } from 'react';
import { createControlPreferences } from './controller';
import { driver } from './driver';

const preferences = createControlPreferences(driver);
export const saveControlLayouts = preferences.saveLayouts;
export const useControlPreferences = () =>
  useSyncExternalStore(
    preferences.subscribe,
    preferences.getPreferences,
    preferences.getPreferences,
  );
