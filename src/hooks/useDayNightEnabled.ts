import { useSyncExternalStore } from 'react';
import { getDayNightEnabled, subscribeDayNightEnabled } from '../platform/dayNight';

export const useDayNightEnabled = () =>
  useSyncExternalStore(subscribeDayNightEnabled, getDayNightEnabled, () => true);
