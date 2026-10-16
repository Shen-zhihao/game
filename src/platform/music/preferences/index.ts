export const DEFAULT_MUSIC_VOLUME = 0.55;
export interface MusicPreferenceDriver {
  read: () => string | null;
  write: (value: string) => void;
}
export function createMusicPreferences(driver: MusicPreferenceDriver) {
  let value = { enabled: true, volume: DEFAULT_MUSIC_VOLUME };
  try {
    const saved: unknown = JSON.parse(driver.read() ?? 'null');
    if (saved && typeof saved === 'object' && 'enabled' in saved && 'volume' in saved) {
      if (typeof saved.enabled === 'boolean') value.enabled = saved.enabled;
      if (typeof saved.volume === 'number' && Number.isFinite(saved.volume))
        value.volume = Math.max(0, Math.min(1, saved.volume));
    }
  } catch {
    /* Keep usable defaults if local preferences cannot be read. */
  }
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(next: Partial<typeof value>) {
      const volume = next.volume ?? value.volume;
      value = {
        enabled: next.enabled ?? value.enabled,
        volume: Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : value.volume,
      };
      try {
        driver.write(JSON.stringify(value));
      } catch {
        /* Session controls still work. */
      }
      listeners.forEach((listener) => listener());
    },
  };
}
