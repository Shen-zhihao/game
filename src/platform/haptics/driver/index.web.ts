import type { HapticDriver } from '../controller';
export const driver: HapticDriver = {
  read: () => localStorage.getItem('stargrove-haptics-enabled') !== 'false',
  write: (enabled) => localStorage.setItem('stargrove-haptics-enabled', String(enabled)),
  active: () => document.visibilityState === 'visible',
  emit: (feedback) => {
    navigator.vibrate?.(
      feedback === 'success'
        ? [18, 40, 18]
        : feedback === 'impact'
          ? 20
          : feedback === 'warning'
            ? [12, 30, 12]
            : 8,
    );
  },
};
