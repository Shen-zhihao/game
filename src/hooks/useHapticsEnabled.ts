import { useSyncExternalStore } from 'react';
import { getHapticsEnabled, subscribeHaptics } from '../platform/haptics';

export const useHapticsEnabled = () =>
  useSyncExternalStore(subscribeHaptics, getHapticsEnabled, () => true);
