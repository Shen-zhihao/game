export interface DayNightPreferenceDriver {
  read: () => unknown;
  write: (enabled: boolean) => void;
}

export function createDayNightPreferences(driver: DayNightPreferenceDriver) {
  let enabled = true;
  try {
    const saved = driver.read();
    if (saved === 'false' || saved === false) enabled = false;
  } catch {
    /* The clock and lighting remain usable without preference storage. */
  }
  const listeners = new Set<() => void>();
  return {
    getEnabled: () => enabled,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setEnabled(value: boolean) {
      if (enabled === value) return;
      enabled = value;
      try {
        driver.write(value);
      } catch {
        /* Keep the preference for this session. */
      }
      listeners.forEach((listener) => listener());
    },
  };
}
