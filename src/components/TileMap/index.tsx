import React, { useId } from 'react';
import Svg, { Defs, G, Image, Path, Pattern, Rect } from 'react-native-svg';
import { MAPS } from '../../content/world';
import { ADVENTURE_CHAPTERS, ADVENTURE_STORY_CONTENT } from '../../content/adventure';
import { MapId } from '../../game/model';
import { cityGroundMaterial, citySurfaceFor } from '../../content/surfaces';

const atlas = require('../../../assets/maps/expedition-tiles.png');
const biomes = require('../../../assets/maps/biome-tiles.png');
const cities = require('../../../assets/maps/city-ground-tiles.png');
const building = new Set(['H', 'C', 'S', 'G']);
/** Draw the actual collision grid with an artist-made atlas, shared by full scene and minimap. */
export const TileMapLayers = React.memo(function TileMapLayers({ map }: { map: MapId }) {
  const prefix = `terrain${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const data = MAPS[map];
  const indoor = ADVENTURE_STORY_CONTENT.some((c) => c.indoor.includes(map));
  const urban = ADVENTURE_CHAPTERS.some((c) => c.town === map);
  const theme = (tile: string, y = 0): number | undefined => {
    if (map === 'leagueHall' && tile === ':')
      return y >= 52 ? 0 : y >= 39 ? 11 : y >= 26 ? 11 : y >= 13 ? 7 : 9;
    if (tile === 'L') return 5;
    if (map === 'windSanctuary')
      return tile === '#'
        ? 2
        : tile === 'g' || tile === '^'
          ? 1
          : tile === '.' || tile === ','
            ? 0
            : tile === ':'
              ? 13
              : undefined;
    if (map === 'windRoute' || map === 'wind')
      return tile === '#' ? 2 : tile === '.' ? 14 : undefined;
    if (['furnaceRoute', 'furnace', 'foundry', 'hotSprings', 'fireGym'].includes(map))
      return tile === '#'
        ? 4
        : tile === '.' || tile === ',' || tile === 'g'
          ? 3
          : tile === '~'
            ? 6
            : tile === 'H'
              ? 15
              : undefined;
    if (['lake', 'lakeRoute', 'mirrorArchive', 'mirrorRuins'].includes(map))
      return tile === '#' ? 8 : tile === ':' ? 7 : tile === '.' ? 12 : undefined;
    if (
      [
        'star',
        'starRoute',
        'starCore',
        'starGym',
        'ancientTemple',
        'nightHall',
        'league',
        'leagueHall',
        'championRoad',
        'hallOfFame',
      ].includes(map)
    )
      return tile === '#'
        ? 8
        : tile === ':'
          ? String(map) === 'starCore'
            ? 10
            : String(map) === 'nightHall'
              ? 11
              : 9
          : tile === '.'
            ? 14
            : undefined;
    return undefined;
  };
  const cell = (tile: string) =>
    tile === 'g'
      ? 1
      : tile === '~' || tile === 'W'
        ? 6
        : tile === '='
          ? 7
          : tile === '#'
            ? indoor || urban
              ? 5
              : 4
            : tile === 'H'
              ? 8
              : tile === 'C'
                ? 9
                : tile === 'S'
                  ? 10
                  : tile === 'G'
                    ? 11
                    : tile === '^'
                      ? 15
                      : tile === ':'
                        ? indoor
                          ? 3
                          : 2
                        : tile === 'R' || tile === ','
                          ? 12
                          : 0;
  return (
    <G>
      <Defs>
        {Array.from({ length: 16 }, (_, i) => (
          <Pattern
            key={i}
            id={`${prefix}-${i}`}
            x={0}
            y={0}
            width={32}
            height={32}
            patternUnits="userSpaceOnUse"
          >
            <Image
              href={atlas}
              x={-(i % 4) * 32}
              y={-Math.floor(i / 4) * 32}
              width={128}
              height={128}
              preserveAspectRatio="none"
            />
          </Pattern>
        ))}
        {Array.from({ length: 16 }, (_, i) => (
          <Pattern
            key={`city-${i}`}
            id={`${prefix}-city-${i}`}
            x={0}
            y={0}
            width={32}
            height={32}
            patternUnits="userSpaceOnUse"
          >
            <Image
              href={cities}
              x={-(i % 4) * 32}
              y={-Math.floor(i / 4) * 32}
              width={128}
              height={128}
              preserveAspectRatio="none"
            />
          </Pattern>
        ))}
        {Array.from({ length: 16 }, (_, i) => (
          <Pattern
            key={`theme-${i}`}
            id={`${prefix}-theme-${i}`}
            x={0}
            y={0}
            width={32}
            height={32}
            patternUnits="userSpaceOnUse"
          >
            <Image
              href={biomes}
              x={-(i % 4) * 32}
              y={-Math.floor(i / 4) * 32}
              width={128}
              height={128}
              preserveAspectRatio="none"
            />
          </Pattern>
        ))}
      </Defs>
      {data.rows.flatMap((row, y) => {
        const runs: React.ReactNode[] = [];
        for (let x = 0; x < row.length;) {
          const tile = row[x]!,
            start = x;
          while (x < row.length && row[x] === tile) x++;
          const px = start * 32,
            py = y * 32,
            w = (x - start) * 32;
          const material = cityGroundMaterial(map, tile);
          const texture = material
            ? `${material.atlas === 'base' ? '' : material.atlas === 'biome' ? 'theme-' : 'city-'}${material.cell}`
            : theme(tile, y) === undefined
              ? cell(tile)
              : `theme-${theme(tile, y)}`;
          runs.push(
            <Rect
              key={`${y}-${start}`}
              x={px}
              y={py}
              width={w}
              height={32}
              fill={`url(#${prefix}-${texture})`}
            />,
          );
          if (building.has(tile) && data.rows[y + 1]?.[start] !== tile) {
            runs.push(
              <G key={`front-${y}-${start}`}>
                <Rect
                  x={px}
                  y={py + 11}
                  width={w}
                  height={21}
                  fill="#e7d6ac"
                  stroke="#624c35"
                  strokeWidth={1}
                />
                <Rect x={px - 2} y={py + 8} width={w + 4} height={4} fill="#674e31" />
                {Array.from({ length: x - start }, (_, i) => (
                  <G key={i}>
                    <Rect
                      x={px + i * 32 + 5}
                      y={py + 16}
                      width={11}
                      height={9}
                      fill="#315868"
                      stroke="#fcf0ca"
                      strokeWidth={2}
                    />
                    <Rect x={px + i * 32 + 9} y={py + 17} width={2} height={6} fill="#84c9d1" />
                  </G>
                ))}
                <Rect
                  x={px + w / 2 - 8}
                  y={py + 16}
                  width={16}
                  height={16}
                  fill="#214d47"
                  stroke="#745e42"
                  strokeWidth={2}
                />
                <Rect x={px + w / 2 - 10} y={py + 30} width={20} height={2} fill="#b9ae88" />
                {tile === 'C' && (
                  <Path
                    d={`M${px + w / 2 - 3} ${py - 3} h6 v4 h4 v6 h-4 v4 h-6 v-4 h-4 v-6 h4 Z`}
                    fill="#fff4dc"
                    stroke="#71613d"
                    strokeWidth={1}
                  />
                )}
              </G>,
            );
          }
        }
        return runs;
      })}
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
export function MapPatchLayers({ map }: { map: MapId }) {
  const prefix = `patch${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const links = ADVENTURE_STORY_CONTENT.flatMap((c) => c.links).filter((l) => l.from === map);
  const surface = citySurfaceFor(map);
  if (!links.length && !surface) return null;
  const cell = surface?.street ?? 2;
  return (
    <G>
      <Defs>
        <Pattern id={prefix} width={32} height={32} patternUnits="userSpaceOnUse">
          <Image
            href={surface ? cities : atlas}
            x={-(cell % 4) * 32}
            y={-Math.floor(cell / 4) * 32}
            width={128}
            height={128}
            preserveAspectRatio="none"
          />
        </Pattern>
      </Defs>
      {surface &&
        MAPS[map].rows.flatMap((row, y) => {
          const pieces: React.ReactNode[] = [];
          for (let x = 0; x < row.length;) {
            if (row[x] !== ':') {
              x++;
              continue;
            }
            const start = x;
            while (row[x] === ':') x++;
            pieces.push(
              <Rect
                key={`street-${y}-${start}`}
                x={start * 32}
                y={y * 32}
                width={(x - start) * 32}
                height={32}
                fill={`url(#${prefix})`}
              />,
            );
          }
          return pieces;
        })}
      {links
        .flatMap((l) => l.paths)
        .map(([x, y, w, h], i) => (
          <Rect
            key={i}
            x={x * 32}
            y={y * 32}
            width={w * 32}
            height={h * 32}
            fill={`url(#${prefix})`}
          />
        ))}
    </G>
  );
}
export const MapPatch = React.memo(function MapPatch({
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
    <Svg
      pointerEvents="none"
      style={{ position: 'absolute', inset: 0 }}
      width={width}
      height={height}
      viewBox={`0 0 ${rows[0]!.length * 32} ${rows.length * 32}`}
    >
      <MapPatchLayers map={map} />
    </Svg>
  );
});
