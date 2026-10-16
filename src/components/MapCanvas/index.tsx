import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Canvas, Image, useImage, FilterMode, MipmapMode } from '@shopify/react-native-skia';
import { GameState, MapId } from '../../game/model';
import { MAP_IMAGES } from '../sceneAssets';
import { MapPatch, TileMap } from '../TileMap';
import { useSceneReady } from '../../useSceneReady';

export function MapCanvas({
  state,
  width,
  height,
  onReady,
}: {
  state: GameState;
  width: number;
  height: number;
  onReady?: (map: MapId) => void;
}) {
  const source = MAP_IMAGES[state.player.map];
  const notifyReady = useCallback(() => onReady?.(state.player.map), [onReady, state.player.map]);
  useSceneReady(!source, onReady ? notifyReady : undefined);
  return source ? (
    <View style={{ width, height }}>
      <RasterMap
        key={state.player.map}
        map={state.player.map}
        source={source}
        width={width}
        height={height}
        onReady={onReady ? notifyReady : undefined}
      />
      <MapPatch map={state.player.map} width={width} height={height} />
    </View>
  ) : (
    <TileMap map={state.player.map} width={width} height={height} />
  );
}
function RasterMap({
  map,
  source,
  width,
  height,
  onReady,
}: {
  map: MapId;
  source: number;
  width: number;
  height: number;
  onReady?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);
  const background = useImage(source, onError);
  useSceneReady(!!background || failed, onReady);
  if (failed) return <TileMap map={map} width={width} height={height} />;
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
