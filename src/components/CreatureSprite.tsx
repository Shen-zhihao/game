import React, { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { SPRITE_CELL } from '../content/catalog';

const atlas = require('../../assets/creatures-ch1.png');
export function CreatureSprite({
  speciesId,
  size = 100,
  flip = false,
  animate = false,
  unknown = false,
}: {
  speciesId: string;
  size?: number;
  flip?: boolean;
  animate?: boolean;
  unknown?: boolean;
}) {
  const [bob] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: -5,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      bob.setValue(0);
    };
  }, [animate, bob]);
  const cell = SPRITE_CELL[speciesId];
  if (unknown || cell === undefined)
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: size * 0.5,
            height: size * 0.55,
            borderRadius: size * 0.25,
            backgroundColor: '#456452',
            opacity: 0.45,
            transform: [{ rotate: '-12deg' }],
          }}
        />
      </View>
    );
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
        transform: [{ translateY: bob }, { scaleX: flip ? -1 : 1 }],
      }}
    >
      <Image
        accessible={false}
        source={atlas}
        resizeMode="stretch"
        style={[
          StyleSheet.absoluteFill,
          {
            width: size * 4,
            height: size * 4,
            left: -(cell % 4) * size,
            top: -Math.floor(cell / 4) * size,
          },
        ]}
      />
    </Animated.View>
  );
}
