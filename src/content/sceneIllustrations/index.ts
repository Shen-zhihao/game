import { MAPS, mapSize } from '../world';
import { battleTheme, type BattleTheme } from '../battleScenes';
import { isIndoor } from '../../game/environment';
import { sceneInk as c } from '../sceneArt';
import type { MapId } from '../../game/model';
import type { BuildingEntrance } from '../buildings';

const rect = (x: number, y: number, w: number, h: number, fill: string, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const path = (d: string, fill: string, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const ellipse = (x: number, y: number, rx: number, ry: number, fill: string, extra = '') =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const line = `stroke="${c.outline}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"`;
const svg = (width: number, height: number, content: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`;

/** Merge cells before drawing: roads and shores have continuous rounded edges. */
function contour(rows: string[], accept: (tile: string) => boolean, radius = 5) {
  type Edge = { x: number; y: number; nx: number; ny: number; direction: number };
  const edges = new Map<string, Edge>();
  const outgoing = new Map<string, string[]>();
  const has = (x: number, y: number) => accept(rows[y]?.[x] ?? '');
  const add = (x: number, y: number, nx: number, ny: number, direction: number) => {
    const key = `${x},${y}:${nx},${ny}`;
    edges.set(key, { x, y, nx, ny, direction });
    const from = `${x},${y}`;
    outgoing.set(from, [...(outgoing.get(from) ?? []), key]);
  };
  rows.forEach((row, y) =>
    [...row].forEach((tile, x) => {
      if (!accept(tile)) return;
      if (!has(x, y - 1)) add(x, y, x + 1, y, 0);
      if (!has(x + 1, y)) add(x + 1, y, x + 1, y + 1, 1);
      if (!has(x, y + 1)) add(x + 1, y + 1, x, y + 1, 2);
      if (!has(x - 1, y)) add(x, y + 1, x, y, 3);
    }),
  );
  let result = '';
  while (edges.size) {
    const first = edges.keys().next().value!;
    const vertices: [number, number][] = [];
    let key: string | undefined = first;
    while (key && edges.has(key)) {
      const edge: Edge = edges.get(key)!;
      vertices.push([edge.x * 32, edge.y * 32]);
      edges.delete(key);
      const choices: string[] = (outgoing.get(`${edge.nx},${edge.ny}`) ?? []).filter((k) =>
        edges.has(k),
      );
      const priority = [1, 0, 3, 2];
      choices.sort(
        (a, b) =>
          priority.indexOf((edges.get(a)!.direction - edge.direction + 4) % 4) -
          priority.indexOf((edges.get(b)!.direction - edge.direction + 4) % 4),
      );
      key = choices[0];
    }
    if (vertices.length < 3) continue;
    vertices.forEach(([x, y], i) => {
      const previous = vertices[(i + vertices.length - 1) % vertices.length]!;
      const next = vertices[(i + 1) % vertices.length]!;
      const before = [
        x + Math.sign(previous[0] - x) * radius,
        y + Math.sign(previous[1] - y) * radius,
      ];
      const after = [x + Math.sign(next[0] - x) * radius, y + Math.sign(next[1] - y) * radius];
      result += `${i ? 'L' : 'M'}${before}Q${x},${y} ${after}`;
    });
    result += 'Z';
  }
  return result;
}

function tree(x: number, y: number, variant: number, forest: boolean) {
  const fill = forest ? (variant % 2 ? '#98af83' : '#a4ba8c') : variant % 2 ? c.leaf : '#b4c796';
  return `<g transform="translate(${x},${y})">${ellipse(17, 29, 16, 5, '#65754e', 'opacity=".14"')}
    ${path('M14 21v9q3 3 6 0V20', '#b99a70', line)}
    ${path('M4 24C-2 20 0 12 5 10 2 3 12-1 17 3 24-2 32 3 30 9 37 14 33 22 29 23 24 29 20 26 17 26 11 29 7 26 4 24Z', fill, line)}
    ${path('M5 13q-1-8 10-7m5 0q7-2 8 5', 'none', 'stroke="#e3e9c7" stroke-width="2.5" stroke-linecap="round"')}
    ${path('M8 22q6 4 9 0m4 0q4 2 7-2', 'none', 'stroke="#7e986d" stroke-width="1.2" stroke-linecap="round"')}
    ${variant % 4 === 0 ? ellipse(25, 15, 2, 2.5, '#e9ba65', 'stroke="#9b8254" stroke-width=".7"') : ''}</g>`;
}

function flower(x: number, y: number, n: number) {
  return `<g transform="translate(${x},${y})">${path('M0 6v6m0-2q-6 0-5-4 5 0 5 4m0 1q6 0 5-4-5 0-5 4', '#9cab7b', 'stroke="#85916d" stroke-width=".7"')}
    ${[0, 72, 144, 216, 288].map((angle) => ellipse(0, -2, 2, 3, n % 3 === 0 ? '#d9a08c' : c.paper, `transform="rotate(${angle})" stroke="#b6a17d" stroke-width=".5"`)).join('')}
    ${ellipse(0, 0, 1.8, 1.8, c.gold)}</g>`;
}

function meadowTree(x: number, y: number, scale: number, tint: string) {
  return `<g transform="translate(${x},${y}) scale(${scale})">
    ${ellipse(0, 187, 103, 17, '#8c9e70', 'opacity=".14"')}
    ${path('M-22 34q15 65-6 151h54Q4 117 26 34', '#c2a275', 'stroke="#736047" stroke-width="3"')}
    ${path('M0 153V52m0 54-27-27m27 10 25-23', 'none', 'stroke="#9a7f57" stroke-width="3" stroke-linecap="round"')}
    ${path('M-94 66C-131 34-112-24-74-26-89-76-35-111 3-88 48-119 106-80 96-38 148-13 129 48 99 61 86 102 39 108 5 91-40 119-81 98-94 66Z', tint, 'stroke="#6f805b" stroke-width="3" stroke-linejoin="round"')}
    ${path('M-91 4q-5-29 27-36m12-30q20-21 42-13m34 0q29-12 46 14', 'none', 'stroke="#dce4bc" stroke-width="7" stroke-linecap="round"')}
    ${path('M-76 62q24 22 47 9M38 75q32 8 48-16', 'none', 'stroke="#81986a" stroke-width="3" stroke-linecap="round"')}
    ${ellipse(-47, 16, 6, 7, '#e5b664')}${ellipse(56, -20, 6, 7, '#e5b664')}</g>`;
}

export function illustratedMeadow() {
  let art = rect(0, 0, 1536, 1024, '#f6efdb');
  art += path('M1045 0h245L687 1024H340Z', '#efbc48', 'opacity=".06"');
  art += ellipse(1118, 145, 74, 74, '#f0ce7c');
  art += ellipse(1118, 145, 94, 94, 'none', 'stroke="#ead6a6" stroke-width="2"');
  art += path(
    'M190 184q14-22 37-7 8-39 40-31 30-19 46 16 36-8 44 22Z M827 125q12-18 30-11 8-28 31-23 25-8 35 14 28-2 32 20Z',
    '#fffcf5',
    'stroke="#e3d9bd" stroke-width="2"',
  );
  art += path('M0 342Q210 175 403 294 633 152 830 293 1109 171 1536 280V650H0Z', '#d2dcb8');
  art += path('M0 385Q256 260 464 357 682 254 900 349 1215 244 1536 363V700H0Z', '#bdcca2');
  // A quiet creek behind the far clearing leaves silhouettes and HP cards legible.
  art += path(
    'M380 384Q644 332 1027 375T1536 352V457Q1200 436 951 414T380 411Z',
    '#abc8c4',
    'stroke="#f6edcf" stroke-width="7"',
  );
  art += path(
    'M647 382q98-12 199 3m241 10q85 5 156-1',
    'none',
    'stroke="#e6eee0" stroke-width="3" stroke-linecap="round"',
  );
  art += path('M0 479Q276 364 570 445 823 362 1091 444 1340 398 1536 455V1024H0Z', '#dce3c5');
  art += path('M0 728Q338 592 675 714 1050 595 1536 692V1024H0Z', '#d2dcb5');
  art += meadowTree(175, 241, 1.8, '#b1c594');
  art += meadowTree(-55, 360, 2.3, '#99b182');
  art += meadowTree(1510, 195, 1.8, '#abc08e');
  art += meadowTree(1416, 418, 1.25, '#9bb282');
  // Authored foot points match battleAnchors' existing 1536 × 1024 coordinate space.
  art += ellipse(1120, 471, 236, 57, '#b7c49a', 'opacity=".6"');
  art += ellipse(1120, 460, 231, 56, '#eee4c3', 'stroke="#b4b78e" stroke-width="2"');
  art += path(
    'M922 447q169-61 371-3',
    'none',
    'stroke="#fff7e2" stroke-width="3" stroke-linecap="round"',
  );
  art += ellipse(390, 768, 306, 80, '#b3c295', 'opacity=".65"');
  art += ellipse(390, 750, 302, 79, '#eee4c3', 'stroke="#afb389" stroke-width="2.5"');
  art += path(
    'M128 728q231-89 502-8',
    'none',
    'stroke="#fff7e2" stroke-width="4" stroke-linecap="round"',
  );
  for (let i = 0; i < 60; i++) {
    const x = (i * 199 + 23) % 1536,
      y = 475 + ((i * 97) % 520);
    if (
      ((x - 390) / 325) ** 2 + ((y - 750) / 110) ** 2 < 1 ||
      ((x - 1120) / 255) ** 2 + ((y - 460) / 80) ** 2 < 1
    )
      continue;
    art += path(
      `M${x},${y}q-5,-10-9,-9m9,9q-2,-15 2,-15m-2,15q5,-11 10,-10`,
      'none',
      'stroke="#9cac80" stroke-width="2" stroke-linecap="round"',
    );
    if (i % 3 === 0)
      art += `<g transform="translate(${x + 15},${y - 10}) scale(1.4)">${flower(0, 0, i)}</g>`;
  }
  art += path(
    'M-20 921Q60 814 151 911q78-72 139 20 99-44 164 93H-20Z M1238 1024q23-123 93-110 58-114 129-37 52-44 96 14v133Z',
    '#a9bc8b',
    'stroke="#81956b" stroke-width="2.5"',
  );
  return svg(1536, 1024, art);
}

const themes = {
  meadow: {
    ground: '#dce3c5',
    road: '#f3e6c9',
    edge: '#c8b993',
    water: '#a5c6c5',
    roof: '#e8bc68',
    wall: '#b2c393',
    rock: '#b9b59c',
    sky: '#f6efdb',
  },
  highlands: {
    ground: '#e5ddc8',
    road: '#d4c8af',
    edge: '#a89b81',
    water: '#a7bebc',
    roof: '#bba98c',
    wall: '#b5ad99',
    rock: '#a99f8b',
    sky: '#f2e9d4',
  },
  coast: {
    ground: '#eee1bc',
    road: '#cdb28d',
    edge: '#a58b6b',
    water: '#a3c9c7',
    roof: '#d5aa83',
    wall: '#b8c9a1',
    rock: '#c3bb9e',
    sky: '#f8efd8',
  },
  electric: {
    ground: '#e4e0cf',
    road: '#d2c8ae',
    edge: '#b48b62',
    water: '#aac9c3',
    roof: '#b3c4b6',
    wall: '#a2b8a0',
    rock: '#b7baa7',
    sky: '#f4edd9',
  },
  wind: {
    ground: '#e9eddf',
    road: '#d3d6c8',
    edge: '#a6b1a3',
    water: '#b7d2d0',
    roof: '#9fb9bd',
    wall: '#b7c9b1',
    rock: '#b9c4bb',
    sky: '#f6f3e4',
  },
  furnace: {
    ground: '#e8d2bb',
    road: '#d7baa2',
    edge: '#b18e72',
    water: '#a9c3bc',
    roof: '#c79478',
    wall: '#b7a187',
    rock: '#b39a83',
    sky: '#f7e7d2',
  },
  lake: {
    ground: '#dce4d3',
    road: '#cbd7ca',
    edge: '#a3b3a4',
    water: '#a8ccce',
    roof: '#a8beb8',
    wall: '#a5bca0',
    rock: '#b4bca9',
    sky: '#f1f0dc',
  },
  star: {
    ground: '#e0dcca',
    road: '#d3cbb8',
    edge: '#b1a28b',
    water: '#b8c9c8',
    roof: '#b4afba',
    wall: '#b4b6a1',
    rock: '#b7b0a4',
    sky: '#f1e9da',
  },
  league: {
    ground: '#e8e4d2',
    road: '#f5ecd4',
    edge: '#c4ad7b',
    water: '#b4cdca',
    roof: '#d5b46c',
    wall: '#bbc7a7',
    rock: '#c8c0a5',
    sky: '#fbf3df',
  },
} satisfies Record<BattleTheme, Record<string, string>>;

function building(entrance: BuildingEntrance, theme: BattleTheme) {
  const { x, y, width: w, kind } = entrance.footprint;
  const d = entrance.doorway;
  const bottom = d.y + d.height;
  const roofBottom = Math.min(y + entrance.footprint.height * 0.54, d.y - 6);
  const roofTop = Math.min(y, roofBottom - 24);
  const roof =
    kind === 'C'
      ? '#d7a38d'
      : kind === 'G'
        ? themes[theme].roof
        : kind === 'S'
          ? '#a7beb9'
          : themes[theme].roof;
  let art = ellipse(x + w / 2 + 3, bottom + 3, w * 0.52, 6, c.outline, 'opacity=".14"');
  art += rect(x + 2, roofBottom - 3, w - 4, bottom - roofBottom + 5, c.cream, `rx="4" ${line}`);
  art += rect(x + 4, bottom - 5, w - 8, 5, '#d5c39e', 'rx="2"');
  art += path(
    `M${x - 2},${roofBottom}l11,${roofTop - roofBottom + 4}q${w / 2 - 9},-7 ${w - 18},0l11,${roofBottom - roofTop - 4}Z`,
    roof,
    line,
  );
  art += path(
    `M${x + 12},${roofTop + 10}q${w / 2 - 12},-5 ${w - 24},0`,
    'none',
    'stroke="#fff1cf" stroke-width="3" stroke-linecap="round"',
  );
  for (let i = 1; i < 4; i++)
    art += path(
      `M${x + 8 - i},${roofTop + ((roofBottom - roofTop) * i) / 4}h${w - 16 + i * 2}`,
      'none',
      'stroke="#80684f" stroke-width=".7" opacity=".25"',
    );
  for (const window of d.windows) {
    art += rect(window.x - 6.5, window.y - 7, 13, 15, '#a9c9c8', `rx="3" ${line}`);
    art += path(
      `M${window.x - 4},${window.y - 4}h8m-4-1v10`,
      'none',
      'stroke="#fffcf5" stroke-width="1.5"',
    );
    art += rect(window.x - 9, window.y + 7, 18, 3, '#c0cda7', `rx="1" ${line}`);
  }
  art += rect(d.x - 3, d.y - 3, d.width + 6, d.height + 3, '#d8bd88', `rx="3" ${line}`);
  art += rect(d.x, d.y, d.width, d.height, '#a48b69');
  art += rect(d.x + 2, d.y + 2, d.width - 4, 9, '#f0dfb2', 'rx="1"');
  art += path(
    `M${d.x + d.width / 2},${d.y}v${d.height}`,
    'none',
    `stroke="${c.outline}" stroke-width="1"`,
  );
  art += ellipse(d.x + d.width * 0.72, d.y + d.height * 0.7, 1, 1, c.paper);
  // The sill ends at the same Y as the entrance tile; the road starts immediately below it.
  art += rect(d.x - 4, bottom - 2, d.width + 8, 3, '#eedbb7', `rx="1" ${line}`);
  const symbolX = x + w / 2,
    symbolY = roofBottom - 15;
  if (kind === 'C')
    art += path(
      `M${symbolX - 3},${symbolY - 8}h6v5h5v6h-5v5h-6v-5h-5v-6h5Z`,
      c.paper,
      'stroke="#a37560" stroke-width="1"',
    );
  if (kind === 'G')
    art += path(`M${symbolX},${symbolY - 13}q-15,8 0,22q15-14 0-22Z`, '#f3dfaa', line);
  if (kind === 'S')
    for (let i = 0; i < Math.floor((w - 8) / 12); i++)
      art += rect(x + 4 + i * 12, roofBottom + 2, 12, 7, i % 2 ? '#dbc5a3' : c.paper, 'rx="2"');
  return art;
}
function boulder(x: number, y: number, fill: string, small = false) {
  return `<g transform="translate(${x},${y})">${ellipse(16, 28, 14, 4, c.outline, 'opacity=".12"')}${path(small ? 'M5 27 3 17 10 8 24 10 30 22 26 28Z' : 'M1 28 2 16 9 5 22 3 30 15 31 28Z', fill, line)}${path('M7 14 13 8 23 8m-8 3 4 9-5 5', 'none', 'stroke="#f7efdb" stroke-width="1.2" opacity=".65"')}</g>`;
}
function furniture(x: number, y: number, kind: string, variant: number) {
  let art = rect(x + 2, y + 6, 28, 24, '#c6ac86', `rx="4" ${line}`);
  if (kind === 'center') {
    art =
      rect(x + 2, y + 4, 28, 26, '#dce5d7', `rx="4" ${line}`) +
      rect(x + 5, y + 6, 22, 8, '#abc9c5', 'rx="2"') +
      path(`M${x + 16},${y + 18}v7m-3-3h6`, 'none', 'stroke="#c2907e" stroke-width="2"');
  } else if (kind === 'shop' || kind === 'lobby') {
    art += rect(x + 4, y + 5, 24, 7, '#ead9b9', `rx="2" ${line}`);
    for (let i = 0; i < 3; i++)
      art += rect(x + 7 + i * 7, y + 16, 4, 9, ['#a5bbb1', '#d9af91', '#d0c18e'][i]!, 'rx="1"');
  } else if (variant % 2 === 0) {
    art =
      rect(x + 2, y + 5, 28, 25, '#c9b68e', `rx="4" ${line}`) +
      rect(x + 4, y + 8, 24, 18, '#d7e0c0', 'rx="3"') +
      rect(x + 5, y + 8, 22, 6, c.paper, 'rx="3"');
  } else
    art +=
      rect(x + 5, y + 9, 22, 3, '#ead7b1') +
      path(`M${x + 7},${y + 19}h18`, 'none', `stroke="${c.outline}" stroke-width="1"`);
  return art;
}

/** Every path, shore, building and exit is authored from the final playable grid. */
export function illustratedMap(map: MapId) {
  const data = MAPS[map],
    { rows } = data,
    { width, height } = mapSize(map);
  const theme = battleTheme(map),
    p = themes[theme],
    room = data.interior?.kind,
    indoor = isIndoor(map);
  const cave = ['mine', 'mineDepths'].includes(map);
  const forest = ['forest', 'deepwood', 'gym'].includes(map);
  const floor = room
    ? room === 'home'
      ? '#e5d3b4'
      : '#f0eddf'
    : indoor && !cave
      ? '#e7e2d0'
      : p.ground;
  const avenues = new Set<string>();
  if (map === 'star' || map === 'league') {
    const spineY = Math.floor(rows.length / 2),
      centreX = Math.floor(rows[0]!.length / 2);
    rows.forEach((row, y) =>
      [...row].forEach((tile, x) => {
        if (tile === ':' && (x === centreX || y === spineY)) avenues.add(`${x},${y}`);
      }),
    );
    for (const entrance of data.entrances ?? []) {
      const start: [number, number] = [entrance.x, entrance.y + 1];
      const queue: [number, number][] = [start];
      const previous = new Map<string, [number, number] | null>([[start.join(','), null]]);
      for (let i = 0; i < queue.length; i++) {
        const cell = queue[i]!;
        if (avenues.has(cell.join(','))) {
          let cursor: [number, number] | null = cell;
          while (cursor) {
            avenues.add(cursor.join(','));
            cursor = previous.get(cursor.join(',')) ?? null;
          }
          break;
        }
        const [x, y] = cell;
        for (const next of [
          [x, y + 1],
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
        ] as [number, number][]) {
          if (rows[next[1]]?.[next[0]] !== ':' || previous.has(next.join(','))) continue;
          previous.set(next.join(','), cell);
          queue.push(next);
        }
      }
    }
  }
  let art = rect(0, 0, width, height, floor);
  if (room) {
    for (let y = 0; y < height; y += room === 'home' ? 16 : 32)
      art += path(`M0 ${y}h${width}`, 'none', 'stroke="#c9bda5" stroke-width=".55"');
    for (let x = 0; x < width; x += 32)
      art += path(`M${x} 0v${height}`, 'none', 'stroke="#d1c5b0" stroke-width=".45"');
    art += rect(
      4 * 32,
      3 * 32,
      6 * 32,
      7 * 32,
      room === 'center' ? '#e2e6d5' : room === 'shop' ? '#f0dfb7' : '#e9dfc7',
      'rx="14"',
    );
    art += rect(
      4 * 32 + 7,
      3 * 32 + 7,
      6 * 32 - 14,
      7 * 32 - 14,
      'none',
      'rx="10" stroke="#c7b995" stroke-width="1"',
    );
  }
  art += path(
    contour(rows, (t) => t === 'g'),
    indoor && !forest ? '#d4d8b9' : '#c1d0a4',
    'fill-rule="evenodd" stroke="#a9bc8c" stroke-width="1"',
  );
  if (!room)
    art += path(
      contour(rows, (t) => t === ':'),
      p.road,
      `fill-rule="evenodd" stroke="${p.edge}" stroke-width="1.1"`,
    );
  art += path(
    contour(rows, (t) => t === '~' || t === 'W', 7),
    p.water,
    'fill-rule="evenodd" stroke="#f8efda" stroke-width="6"',
  );
  art += path(
    contour(rows, (t) => t === 'L', 6),
    '#dcaa7a',
    'fill-rule="evenodd" stroke="#f9d498" stroke-width="4"',
  );
  rows.forEach((row, y) =>
    [...row].forEach((tile, x) => {
      const xx = x * 32,
        yy = y * 32,
        n = (x * 37 + y * 59) % 13;
      if (tile === '.' && !indoor) {
        if (theme === 'wind' && n % 3 === 0)
          art += path(
            `M${xx + 5},${yy + 22}q8,-4 20,-1`,
            'none',
            'stroke="#fbf9ed" stroke-width="2.5" stroke-linecap="round"',
          );
        else if (n < 5)
          art += path(
            `M${xx + 9},${yy + 19}l-2,-4m2,4 3,-5m9,9 2,-2`,
            'none',
            `stroke="${theme === 'coast' || theme === 'highlands' || theme === 'furnace' ? '#baa98d' : '#a9b58a'}" stroke-width="1" stroke-linecap="round"`,
          );
      }
      if (tile === ':' && !room) {
        if (map === 'star' || map === 'league') {
          art += path(
            `M${xx},${yy}h32v32`,
            'none',
            `stroke="${p.edge}" stroke-width=".45" opacity=".5"`,
          );
          if (avenues.has(`${x},${y}`))
            art += rect(
              xx + 2,
              yy + 2,
              28,
              28,
              map === 'league' ? '#e4d1a3' : '#c8bfaa',
              'rx="3" opacity=".6"',
            );
        }
        if (theme === 'coast')
          art += path(
            `M${xx},${yy + 8}h32m-32,12h32m-24,-18v4m16,16v5`,
            'none',
            'stroke="#a68b6e" stroke-width=".65" opacity=".6"',
          );
        else if (theme === 'electric')
          art += path(`M${xx},${yy}h32v32`, 'none', 'stroke="#bba17e" stroke-width=".7"');
        else if (n < 4)
          art += path(
            `M${xx + 10},${yy + 21}h4m7,-12h2`,
            'none',
            `stroke="${p.edge}" stroke-width=".8"`,
          );
      }
      if (tile === ',')
        art += path(
          `M${xx + 8},${yy + 20}h2m9,-12h2`,
          'none',
          `stroke="${p.edge}" stroke-width=".8" opacity=".5"`,
        );
      if (tile === '=') {
        art += rect(xx, yy, 32, 32, theme === 'coast' ? '#d3b68d' : '#ded0b0');
        art += path(
          `M${xx},${yy + 2}h32m-32,10h32m-32,10h32`,
          'none',
          'stroke="#9e8668" stroke-width=".8"',
        );
      }
      if (tile === 'g')
        for (let i = 0; i < 3; i++) {
          const gx = xx + 5 + i * 10,
            gy = yy + 12 + ((i + n) % 2) * 13;
          art += path(
            `M${gx},${gy}q-5,-8-5,-10 7,2 5,10 0,-11 4,-13 3,8-4,13 6,-7 9,-5-2,6-9,5`,
            theme === 'wind' ? '#afc0a2' : i % 2 ? '#95ad81' : '#a5ba90',
            'stroke="#81946d" stroke-width=".7" stroke-linejoin="round"',
          );
        }
      if (tile === '^')
        for (let i = 0; i < 3; i++)
          art += flower(xx + 7 + i * 9, yy + 9 + ((i + n) % 2) * 13, n + i);
      if (tile === '~' || tile === 'W')
        art += path(
          `M${xx + 5},${yy + 12}q4,2 9,0m4,10h6`,
          'none',
          'stroke="#edf3df" stroke-width="1.3" stroke-linecap="round"',
        );
      if (tile === 'L')
        art += path(
          `M${xx + 3},${yy + 10}q12,8 25,1m-20,12 13,-1`,
          'none',
          'stroke="#ffe2a7" stroke-width="2" stroke-linecap="round"',
        );
      if (tile === 'F') art += furniture(xx, yy, room ?? 'home', x + y);
      if (tile === 'E')
        art +=
          rect(xx + 2, yy + 1, 28, 30, '#d8c193', 'rx="3"') +
          path(`M${xx + 10},${yy + 13}l6,6 6,-6`, 'none', `stroke="${c.paper}" stroke-width="2"`);
      if (tile === '#') {
        if (room || (indoor && !cave && !forest)) {
          art += rect(xx, yy, 32, 32, room ? '#c7bba2' : p.wall);
          if (rows[y + 1]?.[x] !== '#') art += rect(xx, yy + 27, 32, 5, '#9c8d72', 'rx="1"');
          if (y === 0 && x > 1 && x < rows[0]!.length - 2 && x % 4 === 2)
            art +=
              rect(xx + 4, yy + 5, 24, 19, '#bed2cc', `rx="4" ${line}`) +
              path(
                `M${xx + 16},${yy + 6}v17m-10-9h20`,
                'none',
                'stroke="#fff5da" stroke-width="1.5"',
              );
        } else if (cave || theme === 'highlands' || theme === 'furnace')
          art += boulder(xx, yy, p.rock);
        else art += tree(xx, yy, n, forest);
      }
    }),
  );
  for (const entrance of data.entrances ?? []) art += building(entrance, theme);
  return svg(width, height, art);
}

/** Backgrounds retain the shared participant anchors and use region-specific silhouettes. */
export function illustratedBattle(theme: BattleTheme) {
  if (theme === 'meadow') return illustratedMeadow();
  const p = themes[theme];
  let art = rect(0, 0, 1536, 1024, p.sky);
  art +=
    ellipse(1170, 125, 65, 65, '#eed4a0') +
    ellipse(1170, 125, 86, 86, 'none', 'stroke="#eadfc1" stroke-width="2"');
  art += path('M0 330Q225 176 440 290 665 176 900 283 1180 186 1536 304V650H0Z', p.wall);
  if (theme === 'highlands' || theme === 'wind') {
    art += path(
      'M-50 370 180 105 360 325 605 72 820 355 1110 84 1380 336 1575 146V640H-50Z',
      theme === 'wind' ? '#bfcfc5' : '#c0b79f',
      'stroke="#9c9d89" stroke-width="2"',
    );
    art += path(
      'm180 105-72 84 69-22 51 32 28-5Zm425-33-72 94 69-34 54 42 21-6Zm505 12-84 95 82-29 49 25 30-4Z',
      '#f7f2df',
    );
    art += path('M0 505Q300 345 600 435 1000 323 1536 468V1024H0Z', p.ground);
    if (theme === 'wind')
      for (let i = 0; i < 8; i++)
        art += path(
          `M${70 + i * 181} ${250 + (i % 3) * 35}q70,-26 133,0`,
          'none',
          'stroke="#f8f5e9" stroke-width="4" stroke-linecap="round"',
        );
  } else if (theme === 'coast' || theme === 'lake') {
    art += path(
      'M0 300Q420 250 820 285T1536 264V740H0Z',
      p.water,
      'stroke="#e9efde" stroke-width="5"',
    );
    for (let i = 0; i < 13; i++)
      art += path(
        `M${(i * 233) % 1480},${330 + (i % 4) * 50}q55,10 114,-1`,
        'none',
        'stroke="#edf3e3" stroke-width="3" stroke-linecap="round"',
      );
    art += path(
      'M0 665Q285 508 626 660 1064 523 1536 617V1024H0Z',
      p.ground,
      'stroke="#fbf1d6" stroke-width="7"',
    );
    if (theme === 'coast') {
      art += path(
        'M150 365v-169m-4 0 124 119H150Z',
        '#fffcf5',
        'stroke="#9f9274" stroke-width="3"',
      );
      art += path('M75 365h213l-25 35H102Z', '#bba282', line);
      for (let i = 0; i < 5; i++)
        art += `<g transform="translate(${110 + i * 280},${835 + (i % 2) * 45}) scale(2)">${flower(0, 0, i)}</g>`;
    } else {
      for (const [x, y] of [
        [200, 390],
        [440, 470],
        [1300, 570],
      ])
        art +=
          ellipse(x!, y!, 48, 16, '#b9c59e') +
          path(`M${x! - 12},${y! - 5}q-23,-46 12,-54 35,8 12,54Z`, '#e7c3b2', line);
    }
  } else if (theme === 'electric') {
    for (let i = 0; i < 7; i++) {
      const x = 25 + i * 235;
      art += rect(
        x,
        105 + (i % 2) * 50,
        125,
        320,
        '#c6c9b5',
        `rx="18" stroke="${p.edge}" stroke-width="3"`,
      );
      art += rect(x + 15, 130 + (i % 2) * 50, 95, 140, '#e8e7d5', 'rx="10"');
      art += path(
        `M${x + 63},${300 + (i % 2) * 50}v140h80`,
        'none',
        'stroke="#b99a6d" stroke-width="8" stroke-linejoin="round"',
      );
    }
    art += path('M0 480Q700 415 1536 455V1024H0Z', p.ground);
    for (let i = 0; i < 8; i++)
      art += path(`M${i * 240},1024 768,470`, 'none', 'stroke="#c9bda1" stroke-width="2"');
  } else if (theme === 'furnace') {
    art += path(
      'M-50 515 200 182 340 290 540 102 735 342 963 150 1320 446 1570 255V1024H-50Z',
      '#bd9f89',
      'stroke="#a38670" stroke-width="3"',
    );
    art += path('M460 211 540 102 622 218 568 190 531 217 500 191Z', '#e3b382');
    art += path(
      'M600 210q-40 44 10 87t-17 83q-70 51 40 129t-37 144q-84 36 65 155',
      'none',
      'stroke="#efc58d" stroke-width="26" stroke-linecap="round"',
    );
    art += path('M0 624Q348 460 660 596 1100 482 1536 581V1024H0Z', p.ground);
    for (let i = 0; i < 5; i++)
      art += `<g transform="translate(${(i * 431) % 1480},${625 + (i % 3) * 115}) scale(3)">${boulder(0, 0, p.rock, true)}</g>`;
  } else {
    // Quiet arches and carved masonry distinguish star ruins from the gold league arena.
    const gold = theme === 'league';
    for (let i = 0; i < 7; i++) {
      const x = 20 + i * 240;
      art += path(
        `M${x} 445V183q86-107 172 0v262h-30V199q-57-76-112 0v246Z`,
        gold ? '#d3bc83' : '#c2b8aa',
        `stroke="${p.edge}" stroke-width="3"`,
      );
      if (gold) art += path(`M${x + 36} 187h100v90l-50-24-50 24Z`, '#ecdbad', line);
      else
        art += path(
          `m${x + 86},238 10,20 23,3-17,16 4,23-20-11-20,11 4-23-17-16 23-3Z`,
          '#e5d5a4',
          line,
        );
    }
    art += path('M0 480Q700 430 1536 455V1024H0Z', p.ground);
    for (let y = 520; y < 1024; y += 100)
      art += path(`M0 ${y}h1536`, 'none', 'stroke="#c7bea8" stroke-width="1.2"');
  }
  // Painted platforms stay at the exact coordinates used by battleAnchors and move effects.
  const platform =
    theme === 'wind'
      ? '#f4f2e4'
      : theme === 'furnace'
        ? '#cfb49a'
        : theme === 'star'
          ? '#d8cfbc'
          : '#eee3c5';
  art +=
    ellipse(1120, 471, 236, 57, p.edge, 'opacity=".26"') +
    ellipse(1120, 460, 231, 56, platform, `stroke="${p.edge}" stroke-width="2"`);
  art +=
    ellipse(390, 768, 306, 80, p.edge, 'opacity=".26"') +
    ellipse(390, 750, 302, 79, platform, `stroke="${p.edge}" stroke-width="2.5"`);
  art += path(
    'M922 447q169-61 371-3M128 728q231-89 502-8',
    'none',
    'stroke="#fff8e3" stroke-width="4" stroke-linecap="round"',
  );
  if (theme === 'lake' || theme === 'coast' || theme === 'wind') {
    art += meadowTree(-25, 320, 1.65, theme === 'wind' ? '#c4d1bd' : '#adbf9d');
    art += meadowTree(1560, 260, 1.65, theme === 'wind' ? '#c4d1bd' : '#adbf9d');
  }
  return svg(1536, 1024, art);
}
