import type { ControlPreferenceDriver } from '../controller';

const key = 'stargrove-control-layout-v1';
export const driver: ControlPreferenceDriver = {
  read: () => localStorage.getItem(key),
  write: (value) => localStorage.setItem(key, value),
};
