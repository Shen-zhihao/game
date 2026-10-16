import { SQLiteStorage } from 'expo-sqlite/kv-store';
import type { DayNightPreferenceDriver } from '../controller';

const storage = new SQLiteStorage('stargrove-preferences.db');
const key = 'day-night-cycle-enabled';
export const driver: DayNightPreferenceDriver = {
  read: () => storage.getItemSync(key),
  write: (enabled) => storage.setItemSync(key, String(enabled)),
};
