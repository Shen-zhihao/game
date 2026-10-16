import { Image, View } from 'react-native';
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
  return (
    <View style={{ width, height }}>
      {MAP_IMAGES[state.player.map] ? (
        <Image
          source={MAP_IMAGES[state.player.map]}
          resizeMode="stretch"
          style={{ width, height }}
        />
      ) : (
        <TileMap map={state.player.map} width={width} height={height} />
      )}
      {!!MAP_IMAGES[state.player.map] && (
        <MapPatch map={state.player.map} width={width} height={height} />
      )}
    </View>
  );
}
