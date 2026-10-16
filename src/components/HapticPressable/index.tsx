import { forwardRef } from 'react';
import { Pressable, PressableProps, View } from 'react-native';
import { Feedback, haptic } from '../../platform/haptics';

export const HapticPressable = forwardRef<View, PressableProps & { feedback?: Feedback | false }>(
  function HapticPressable(
    { feedback = 'selection', onPress, onPressIn, disabled, ...props },
    ref,
  ) {
    return (
      <Pressable
        {...props}
        ref={ref}
        disabled={disabled}
        onPress={
          onPress
            ? (event) => {
                if (!disabled && feedback) haptic(feedback);
                onPress(event);
              }
            : undefined
        }
        onPressIn={
          onPressIn
            ? (event) => {
                if (!disabled && !onPress && feedback) haptic(feedback);
                onPressIn(event);
              }
            : undefined
        }
      />
    );
  },
);
