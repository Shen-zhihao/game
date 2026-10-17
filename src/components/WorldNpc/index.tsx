import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { Npc } from '../../content/world';
import { NpcSprite } from '../CharacterSprite';

export function WorldNpc({
  npc,
  scale,
  paused,
  alert = false,
}: {
  npc: Npc;
  scale: number;
  paused: boolean;
  alert?: boolean;
}) {
  const [position] = useState(() => new Animated.ValueXY({ x: npc.x * 32, y: npc.y * 32 }));
  const previous = useRef({ x: npc.x, y: npc.y });
  useEffect(() => {
    const distance = Math.abs(previous.current.x - npc.x) + Math.abs(previous.current.y - npc.y);
    previous.current = { x: npc.x, y: npc.y };
    position.stopAnimation();
    const target = { x: npc.x * 32, y: npc.y * 32 };
    if (distance !== 1 || paused) position.setValue(target);
    else
      Animated.timing(position, {
        toValue: target,
        duration: 560,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    return () => position.stopAnimation();
  }, [npc.x, npc.y, paused, position]);
  return (
    <Animated.View
      pointerEvents="none"
      testID={`npc-${npc.id}`}
      style={{
        position: 'absolute',
        left: -12 * scale,
        top: -29 * scale,
        zIndex: npc.y * 10,
        width: 56 * scale,
        height: 56 * scale,
        transform: [
          { translateX: Animated.multiply(position.x, scale) },
          { translateY: Animated.multiply(position.y, scale) },
        ],
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: 23 * scale,
          height: 7 * scale,
          borderRadius: 15 * scale,
          backgroundColor: '#173f3480',
          bottom: scale,
          left: 17 * scale,
        }}
      />
      <NpcSprite npc={npc} size={56 * scale} paused={paused} />
      {alert && (
        <View
          testID={`trainer-alert-${npc.id}`}
          style={{
            position: 'absolute',
            top: -17 * scale,
            left: 19 * scale,
            width: 20 * scale,
            height: 25 * scale,
            borderRadius: 8 * scale,
            backgroundColor: '#fff7d7',
            borderWidth: 1.5 * scale,
            borderColor: '#c9a65e',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: '#a56c26',
              fontSize: 20 * scale,
              lineHeight: 23 * scale,
              fontWeight: '900',
            }}
          >
            !
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
