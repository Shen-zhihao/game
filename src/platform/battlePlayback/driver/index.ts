import { SQLiteStorage } from 'expo-sqlite/kv-store';
import type { PlaybackPreferenceDriver } from '../controller';

const storage = new SQLiteStorage('stargrove-preferences.db');
const key = 'battle-message-delay-ms';
export const driver: PlaybackPreferenceDriver = {
  read: () => storage.getItemSync(key),
  write: (delay) => storage.setItemSync(key, String(delay)),
};
