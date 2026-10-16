export const BATTLE_MESSAGE_DELAYS = [500, 1000, 2000, 3000, 5000] as const;
export const DEFAULT_BATTLE_MESSAGE_DELAY = 2000;
export type BattleMessageDelay = (typeof BATTLE_MESSAGE_DELAYS)[number];
export interface PlaybackPreferenceDriver {
  read: () => unknown;
  write: (delay: BattleMessageDelay) => void;
}
const isDelay = (value: number): value is BattleMessageDelay =>
  BATTLE_MESSAGE_DELAYS.some((delay) => delay === value);

export function createPlaybackPreferences(driver: PlaybackPreferenceDriver) {
  let delay: BattleMessageDelay = DEFAULT_BATTLE_MESSAGE_DELAY;
  try {
    const stored = driver.read();
    if (typeof stored === 'string' || typeof stored === 'number') {
      const value = Number(stored);
      if (isDelay(value)) delay = value;
    }
  } catch {
    // An unavailable preference store does not prevent battle playback.
  }
  const listeners = new Set<() => void>();
  return {
    getDelay: () => delay,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setDelay(value: number) {
      if (!isDelay(value) || value === delay) return;
      delay = value;
      try {
        driver.write(value);
      } catch {
        /* Keep the setting for this session. */
      }
      listeners.forEach((listener) => listener());
    },
  };
}
