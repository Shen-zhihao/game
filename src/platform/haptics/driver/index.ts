import { AppState, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SQLiteStorage } from 'expo-sqlite/kv-store';
import type { HapticDriver } from '../controller';

const preferences = new SQLiteStorage('stargrove-preferences.db');
const key = 'haptics-enabled';
export const driver: HapticDriver = {
  read: () => preferences.getItemSync(key) !== 'false',
  write: (enabled) => preferences.setItemSync(key, String(enabled)),
  active: () => AppState.currentState === 'active',
  emit: async (feedback) => {
    if (Platform.OS === 'android') {
      await Haptics.performAndroidHapticsAsync(
        {
          selection: Haptics.AndroidHaptics.Segment_Tick,
          confirm: Haptics.AndroidHaptics.Virtual_Key,
          impact: Haptics.AndroidHaptics.Context_Click,
          success: Haptics.AndroidHaptics.Confirm,
          warning: Haptics.AndroidHaptics.Reject,
        }[feedback],
      );
    } else if (feedback === 'selection') await Haptics.selectionAsync();
    else if (feedback === 'success' || feedback === 'warning')
      await Haptics.notificationAsync(
        feedback === 'success'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
    else
      await Haptics.impactAsync(
        feedback === 'impact'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      );
  },
};
