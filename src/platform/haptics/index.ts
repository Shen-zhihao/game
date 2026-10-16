import { createHapticController } from './controller';
import { driver } from './driver';
const controller = createHapticController(driver);
export const haptic = controller.pulse;
export const setHapticsEnabled = controller.setEnabled;
export const subscribeHaptics = controller.subscribe;
export const getHapticsEnabled = controller.getEnabled;
export type { Feedback } from './controller';
