import React from 'react';
import { Canvas, Image, useImage, FilterMode, MipmapMode } from '@shopify/react-native-skia';
import { GameState } from '../game/model';
import { MAP_IMAGES } from './sceneAssets';

export function MapCanvas({
  state,
  width,
  height,
}: {
  state: GameState;
  width: number;
  height: number;
}) {
  const background = useImage(MAP_IMAGES[state.player.map]);
  return (
    <Canvas style={{ width, height }}>
      {background && (
        <Image
          image={background}
          x={0}
          y={0}
          width={width}
          height={height}
          fit="fill"
          sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}
        />
      )}
    </Canvas>
  );
}
