import { useSyncExternalStore } from 'react';
import { getControlPreferences, subscribeControlPreferences } from '../platform/controlLayout';

export const useControlPreferences = () =>
  useSyncExternalStore(subscribeControlPreferences, getControlPreferences, getControlPreferences);
