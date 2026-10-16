import { createControlPreferences } from './controller';
import { driver } from './driver';

const preferences = createControlPreferences(driver);
export const saveControlLayouts = preferences.saveLayouts;
export const subscribeControlPreferences = preferences.subscribe;
export const getControlPreferences = preferences.getPreferences;
