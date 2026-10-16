import { useEffect, useState } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { spriteFor } from '../../content/catalog';
import { spriteLayout } from '../../content/spriteFrames';

const atlas = require('../../../assets/creatures-ch1.png');
const coastAtlas = require('../../../assets/creatures-coast.png');
const tidalAtlas = require('../../../assets/creatures-tidal.png');
const highlandsAtlas = require('../../../assets/creatures-highlands.png');
const electricAtlas = require('../../../assets/creatures-electric.png');
const regionalAtlases: Record<string, number> = {
  moth: require('../../../assets/creatures-moth.png'),
  ch1: atlas,
  coast: coastAtlas,
  tidal: tidalAtlas,
  highlands: highlandsAtlas,
  electric: electricAtlas,
  urban: require('../../../assets/creatures-urban.png'),
  mirror_a: require('../../../assets/creatures-mirror_a.png'),
  mirror_b: require('../../../assets/creatures-mirror_b.png'),
  field_a: require('../../../assets/creatures-field_a.png'),
  field_b: require('../../../assets/creatures-field_b.png'),
  fire_a: require('../../../assets/creatures-fire_a.png'),
  fire_b: require('../../../assets/creatures-fire_b.png'),
  wind_a: require('../../../assets/creatures-wind_a.png'),
  wind_b: require('../../../assets/creatures-wind_b.png'),
  forest_a: require('../../../assets/creatures-forest_a.png'),
  forest_b: require('../../../assets/creatures-forest_b.png'),
};
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
  const sprite = spriteFor(speciesId),
    cell = sprite?.cell;
  if (cell === undefined)
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
  const layout = spriteLayout(sprite!, size);
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
        transform: [{ translateY: bob }, { scaleX: flip ? -1 : 1 }],
      }}
    >
      <View style={{ position: 'absolute', overflow: 'hidden', ...layout.crop }}>
        <Image
          accessible={false}
          source={regionalAtlases[sprite!.atlas]}
          resizeMode="stretch"
          style={[
            {
              position: 'absolute',
              ...layout.image,
              tintColor: unknown ? '#263e42' : undefined,
              opacity: unknown ? 0.65 : 1,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}
