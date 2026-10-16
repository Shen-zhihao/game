export type Feedback = 'selection' | 'confirm' | 'impact' | 'success' | 'warning';
export interface HapticDriver {
  read: () => boolean;
  write: (enabled: boolean) => void;
  active: () => boolean;
  emit: (feedback: Feedback) => Promise<void> | void;
  now?: () => number;
}
export function createHapticController(driver: HapticDriver) {
  let enabled = true;
  let lastAt = -Infinity;
  try {
    enabled = driver.read();
  } catch {
    /* Keep the session preference if storage is unavailable. */
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
      enabled = value;
      try {
        driver.write(value);
      } catch {
        /* Feedback remains configurable for this session. */
      }
      listeners.forEach((listener) => listener());
    },
    pulse(feedback: Feedback = 'selection') {
      try {
        const now = (driver.now ?? Date.now)();
        if (!enabled || !driver.active() || now - lastAt < 80) return;
        lastAt = now;
        // Native failures and unsupported browsers must never interrupt game actions.
        void Promise.resolve(driver.emit(feedback)).catch(() => {});
      } catch {
        /* A missing haptic engine is harmless. */
      }
    },
  };
}
