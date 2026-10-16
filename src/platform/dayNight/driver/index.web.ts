import type { DayNightPreferenceDriver } from '../controller';

const key = 'stargrove-day-night-cycle-enabled';
export const driver: DayNightPreferenceDriver = {
  read: () => localStorage.getItem(key),
  write: (enabled) => localStorage.setItem(key, String(enabled)),
};
