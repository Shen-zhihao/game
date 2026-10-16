import { createDayNightPreferences } from './controller';
import { driver } from './driver';

const preferences = createDayNightPreferences(driver);
export const setDayNightEnabled = preferences.setEnabled;
export const subscribeDayNightEnabled = preferences.subscribe;
export const getDayNightEnabled = preferences.getEnabled;
