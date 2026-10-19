import { useEffect, useState } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { spriteFor } from '../../content/catalog';
import { backSpriteFor } from '../../content/backSprites';
import { spriteFrame, spriteLayout } from '../../content/spriteFrames';
import { AtlasFrameImage } from '../AtlasFrameImage';

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
  starters_back: require('../../../assets/creatures-starters-back.png'),
};
export function CreatureSprite({
  speciesId,
  size = 100,
  flip = false,
  view = 'front',
  animate = false,
  unknown = false,
}: {
  speciesId: string;
  size?: number;
  flip?: boolean;
  view?: 'front' | 'back';
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
  const backSprite = view === 'back' ? backSpriteFor(speciesId) : null;
  // Preserve the old mirrored-front appearance for species without rear artwork.
  const mirrored = backSprite ? false : view === 'back' || flip;
  const sprite = backSprite ?? spriteFor(speciesId),
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
  const frame = spriteFrame(sprite!);
  return (
    <Animated.View
      testID={`creature-sprite-${speciesId}-${backSprite ? 'back' : mirrored ? 'front-mirrored' : 'front'}`}
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
        transform: [{ translateY: bob }, { scaleX: mirrored ? -1 : 1 }],
      }}
    >
      <View style={{ position: 'absolute', overflow: 'hidden', ...layout.crop }}>
        {frame.clipPath ? (
          <AtlasFrameImage
            frame={frame}
            source={regionalAtlases[sprite!.atlas]!}
            width={layout.crop.width}
            height={layout.crop.height}
            unknown={unknown}
          />
        ) : (
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
        )}
      </View>
    </Animated.View>
  );
}
