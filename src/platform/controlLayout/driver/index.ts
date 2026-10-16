import { SQLiteStorage } from 'expo-sqlite/kv-store';
import type { ControlPreferenceDriver } from '../controller';

const storage = new SQLiteStorage('stargrove-preferences.db');
const key = 'control-layout-v1';
export const driver: ControlPreferenceDriver = {
  read: () => storage.getItemSync(key),
  write: (value) => storage.setItemSync(key, value),
};
