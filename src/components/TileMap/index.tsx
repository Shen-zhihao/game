import React, { useId } from 'react';
import Svg, { Defs, G, Image, Path, Pattern, Rect, Text as SvgText } from 'react-native-svg';
import { MAPS } from '../../content/world';
import { ADVENTURE_CHAPTERS, ADVENTURE_STORY_CONTENT } from '../../content/adventure';
import { MapId } from '../../game/model';
import { cityGroundMaterial, citySurfaceFor } from '../../content/surfaces';
import { isIndoor } from '../../game/environment';

const atlas = require('../../../assets/maps/expedition-tiles.png');
const biomes = require('../../../assets/maps/biome-tiles.png');
const cities = require('../../../assets/maps/city-ground-tiles.png');
const building = new Set(['H', 'C', 'S', 'G']);
/** Draw the actual collision grid with an artist-made atlas, shared by full scene and minimap. */
export const TileMapLayers = React.memo(function TileMapLayers({ map }: { map: MapId }) {
  const prefix = `terrain${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const data = MAPS[map];
  const indoor = isIndoor(map);
  const roomColors =
    data.interior &&
    {
      home: { floor: '#c7a67a', seam: '#a1835c', wall: '#6f5845' },
      center: { floor: '#e6e6d7', seam: '#c3cfbe', wall: '#607b71' },
      shop: { floor: '#d4c5a6', seam: '#b8a784', wall: '#71634d' },
      lobby: { floor: '#b8c6cf', seam: '#8eabb8', wall: '#455f71' },
    }[data.interior.kind];
  const urban = ADVENTURE_CHAPTERS.some((c) => c.town === map);
  const theme = (tile: string, y = 0): number | undefined => {
    if (data.interior) return undefined;
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
        {roomColors && (
          <Pattern id={`${prefix}-room`} width={32} height={32} patternUnits="userSpaceOnUse">
            <Rect width={32} height={32} fill={roomColors.floor} />
            <Path
              d={
                data.interior!.kind === 'home'
                  ? 'M0 0 h32 M0 16 h32 M16 0 v16 M6 16 v16'
                  : 'M0 0 h32 v32'
              }
              stroke={roomColors.seam}
              strokeWidth={0.7}
              fill="none"
            />
          </Pattern>
        )}
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
              fill={
                roomColors
                  ? tile === '#'
                    ? roomColors.wall
                    : `url(#${prefix}-room)`
                  : `url(#${prefix}-${texture})`
              }
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
      {data.interior && (
        <G>
          {data.rows.flatMap((row, y) =>
            [...row].flatMap((tile, x) =>
              tile === 'F'
                ? [
                    <G key={`furniture-${x}-${y}`}>
                      <Rect
                        x={x * 32 + 2}
                        y={y * 32 + 3}
                        width={28}
                        height={27}
                        rx={3}
                        fill={data.interior!.kind === 'center' ? '#dbe9df' : '#936546'}
                        stroke="#4f453b"
                        strokeWidth={2}
                      />
                      <Rect
                        x={x * 32 + 5}
                        y={y * 32 + 7}
                        width={22}
                        height={7}
                        rx={1}
                        fill={data.interior!.kind === 'center' ? '#9bbec4' : '#dab981'}
                      />
                      <Path
                        d={`M${x * 32 + 5} ${y * 32 + 19} h22`}
                        stroke="#5c4937"
                        strokeWidth={2}
                      />
                    </G>,
                  ]
                : [],
            ),
          )}
          <Rect
            x={6 * 32}
            y={8 * 32}
            width={3 * 32}
            height={3 * 32}
            rx={6}
            fill={
              data.interior.kind === 'center'
                ? '#86b5a0'
                : data.interior.kind === 'shop'
                  ? '#be9b60'
                  : '#a47661'
            }
            opacity={0.6}
          />
          <Path d="M240 314 v24 m-8 -8 8 8 8 -8" stroke="#fff3ce" strokeWidth={3} fill="none" />
          <SvgText x={240} y={307} fontSize={10} textAnchor="middle" fill="#fff3ce">
            出口
          </SvgText>
        </G>
      )}
      <BuildingEntranceLayers map={map} />
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
      <BuildingEntranceLayers map={map} />
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

/** Door overlays also apply to pre-rendered maps; visible doors and collision share coordinates. */
function BuildingEntranceLayers({ map }: { map: MapId }) {
  const data = MAPS[map];
  const entrances = data.entrances ?? [];
  const passages = isIndoor(map)
    ? []
    : data.portals.filter(
        (p) => isIndoor(p.map) && !entrances.some((e) => e.x === p.x && e.y === p.y),
      );
  return (
    <G>
      {entrances.map((e) => (
        <G key={`door-${e.x}-${e.y}`}>
          <Rect
            x={e.x * 32 + 3}
            y={e.y * 32 + 3}
            width={26}
            height={29}
            rx={3}
            fill="#695037"
            stroke="#f3d69b"
            strokeWidth={2}
          />
          <Rect x={e.x * 32 + 7} y={e.y * 32 + 6} width={18} height={25} fill="#173d3d" />
          <Path
            d={`M${e.x * 32 + 16} ${e.y * 32 + 35} v12 m-4 -5 4 5 4 -5`}
            stroke="#fff0b8"
            strokeWidth={2}
            fill="none"
          />
          <Rect
            x={e.x * 32 - 40}
            y={e.y * 32 - 12}
            width={112}
            height={13}
            rx={3}
            fill="#203c38"
            opacity={0.9}
          />
          <SvgText
            x={e.x * 32 + 16}
            y={e.y * 32 - 2}
            fontSize={9}
            textAnchor="middle"
            fill="#fff4d4"
          >
            {e.name}
          </SvgText>
        </G>
      ))}
      {passages.map((p) => (
        <G key={`passage-${p.x}-${p.y}`}>
          <Rect
            x={p.x * 32}
            y={p.y * 32}
            width={32}
            height={32}
            rx={8}
            fill="#182d31"
            stroke="#c2b891"
            strokeWidth={3}
          />
          <SvgText
            x={p.x * 32 + (p.x === 0 ? 36 : p.x === data.rows[0]!.length - 1 ? -4 : 16)}
            y={p.y * 32 - 6}
            textAnchor={p.x === 0 ? 'start' : p.x === data.rows[0]!.length - 1 ? 'end' : 'middle'}
            fontSize={10}
            fill="#fff4d4"
            stroke="#263b37"
            strokeWidth={0.3}
          >
            {MAPS[p.map].name}入口
          </SvgText>
        </G>
      ))}
    </G>
  );
}
