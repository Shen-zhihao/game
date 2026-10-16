import React from 'react';
import { View } from 'react-native';
import { Canvas, Image, useImage, FilterMode, MipmapMode } from '@shopify/react-native-skia';
import { GameState } from '../../game/model';
import { MAP_IMAGES } from '../sceneAssets';
import { MapPatch, TileMap } from '../TileMap';

export function MapCanvas({
  state,
  width,
  height,
}: {
  state: GameState;
  width: number;
  height: number;
}) {
  const source = MAP_IMAGES[state.player.map];
  return source ? (
    <View style={{ width, height }}>
      <RasterMap source={source} width={width} height={height} />
      <MapPatch map={state.player.map} width={width} height={height} />
    </View>
  ) : (
    <TileMap map={state.player.map} width={width} height={height} />
  );
}
function RasterMap({ source, width, height }: { source: number; width: number; height: number }) {
  const background = useImage(source);
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
