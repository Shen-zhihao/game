import { useEffect, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { useAnimatedScalar } from '../../hooks/useAnimatedScalar';

export function AnimatedNumber({
  value,
  suffix = '',
  paused = false,
  style,
}: {
  value: number;
  suffix?: string;
  paused?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const [display, setDisplay] = useState(value);
  const motion = useAnimatedScalar(value, 420, paused);
  useEffect(() => {
    const id = motion.addListener(({ value: next }) => setDisplay(Math.round(next)));
    return () => motion.removeListener(id);
  }, [motion]);
  return (
    <Text style={style}>
      {display}
      {suffix}
    </Text>
  );
}
