import type { PlaybackPreferenceDriver } from '../controller';

const key = 'stargrove-battle-message-delay-ms';
export const driver: PlaybackPreferenceDriver = {
  read: () => localStorage.getItem(key),
  write: (delay) => localStorage.setItem(key, String(delay)),
};
