import React from 'react';
import Svg, { G, SvgXml } from 'react-native-svg';
import { MAPS, mapSize } from '../../content/world';
import { illustratedMap } from '../../content/sceneIllustrations';
import { SCENE_SPRITE_SOURCES } from '../scenePropsAssets';
import { MAP_IMAGE_REVISIONS } from '../sceneAssets';
import type { MapId } from '../../game/model';
const sources = new Map<string, string>();
function sourceFor(map: MapId) {
  const key = `${map}:${MAP_IMAGE_REVISIONS[map]}`;
  if (!sources.has(key)) sources.set(key, illustratedMap(map, SCENE_SPRITE_SOURCES));
  return sources.get(key)!;
}
/** A missing or failed raster still renders the matching illustration, never an old tile set. */
export const TileMapLayers = React.memo(function TileMapLayers({ map }: { map: MapId }) {
  const size = mapSize(map);
  return (
    <G>
      <SvgXml xml={sourceFor(map)} width={size.width} height={size.height} />
    </G>
  );
});
export const TileMap = React.memo(function TileMap({
  map,
  width,
  height,
}: {
  map: MapId;
  width: number;
  height: number;
}) {
  const rows = MAPS[map].rows;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${rows[0]!.length * 32} ${rows.length * 32}`}>
      <TileMapLayers map={map} />
    </Svg>
  );
});
