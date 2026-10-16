import React from 'react';
import Svg, { G, SvgXml } from 'react-native-svg';
import { MAPS, mapSize } from '../../content/world';
import { illustratedMap } from '../../content/sceneIllustrations';
import type { MapId } from '../../game/model';
const sources = new Map<MapId, string>();
function sourceFor(map: MapId) {
  if (!sources.has(map)) sources.set(map, illustratedMap(map));
  return sources.get(map)!;
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
