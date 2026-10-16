import { useCallback, useState } from 'react';
import { Image, View } from 'react-native';
import { GameState, MapId } from '../../game/model';
import { MAP_IMAGES } from '../sceneAssets';
import { TileMap } from '../TileMap';
import { useSceneReady } from '../../hooks/useSceneReady';

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
  const map = state.player.map;
  const source = MAP_IMAGES[map];
  const notifyReady = useCallback(() => onReady?.(map), [onReady, map]);
  useSceneReady(!source, onReady ? notifyReady : undefined);
  return (
    <View style={{ width, height }}>
      {source ? (
        <RasterMap
          key={map}
          map={map}
          source={source}
          width={width}
          height={height}
          onReady={onReady ? notifyReady : undefined}
        />
      ) : (
        <TileMap map={state.player.map} width={width} height={height} />
      )}
    </View>
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
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useSceneReady(loaded || failed, onReady);
  return failed ? (
    <TileMap map={map} width={width} height={height} />
  ) : (
    <Image
      source={source}
      resizeMode="stretch"
      style={{ width, height }}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}
