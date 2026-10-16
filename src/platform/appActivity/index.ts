import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

const isActive = () =>
  AppState.currentState !== 'background' &&
  AppState.currentState !== 'inactive' &&
  (Platform.OS !== 'web' ||
    typeof document === 'undefined' ||
    document.visibilityState !== 'hidden');

export function useAppActivity() {
  const [active, setActive] = useState(isActive);
  useEffect(() => {
    const update = () => setActive(isActive());
    const subscription = AppState.addEventListener('change', update);
    if (Platform.OS === 'web' && typeof document !== 'undefined')
      document.addEventListener('visibilitychange', update);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined')
        document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return active;
}
