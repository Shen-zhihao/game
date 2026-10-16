import { useSyncExternalStore } from 'react';
import { createHapticController } from './controller';
import { driver } from './driver';
const controller = createHapticController(driver);
export const haptic = controller.pulse;
export const setHapticsEnabled = controller.setEnabled;
export const useHapticsEnabled = () =>
  useSyncExternalStore(controller.subscribe, controller.getEnabled, () => true);
export type { Feedback } from './controller';
