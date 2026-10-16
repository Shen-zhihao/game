import { mkdirSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { MAPS, mapSize } from '../src/content/world';
import { ILLUSTRATED_MAPS, sceneInk as c } from '../src/content/sceneArt';
import type { MapId } from '../src/game/model';

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
  const edges = new Map<string, [number, number]>();
  const has = (x: number, y: number) => accept(rows[y]?.[x] ?? '');
  rows.forEach((row, y) =>
    [...row].forEach((tile, x) => {
      if (!accept(tile)) return;
      if (!has(x, y - 1)) edges.set(`${x},${y}`, [x + 1, y]);
      if (!has(x + 1, y)) edges.set(`${x + 1},${y}`, [x + 1, y + 1]);
      if (!has(x, y + 1)) edges.set(`${x + 1},${y + 1}`, [x, y + 1]);
      if (!has(x - 1, y)) edges.set(`${x},${y + 1}`, [x, y]);
    }),
  );
  let result = '';
  while (edges.size) {
    const first = edges.keys().next().value!;
    const vertices: [number, number][] = [];
    let key = first;
    while (edges.has(key)) {
      vertices.push(key.split(',').map((n) => Number(n) * 32) as [number, number]);
      const next = edges.get(key)!;
      edges.delete(key);
      key = next.join(',');
      if (key === first) break;
    }
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

function house(map: MapId, x: number, y: number, w: number, h: number, kind: string) {
  const entrance = MAPS[map].entrances?.find(
    (e) => e.x * 32 >= x && e.x * 32 < x + w && e.y * 32 >= y && e.y * 32 < y + h,
  );
  if (!entrance) return '';
  const d = entrance.doorway;
  const bottom = d.y + d.height;
  // Preserve existing door/window pixels, used by passage animation and night lighting.
  const roof =
    kind === 'C' ? '#cf9984' : kind === 'G' ? '#9db089' : kind === 'S' ? '#a2bdc0' : '#e8bc68';
  const eave = Math.min(y + h * 0.56, d.y - 4);
  let art = ellipse(x + w / 2 + 4, bottom + 4, w * 0.53, 8, '#7c7657', 'opacity=".14"');
  art += rect(x + 3, eave - 4, w - 6, bottom - eave + 6, c.cream, `rx="4" ${line}`);
  art += rect(x + 5, bottom - 5, w - 10, 5, '#d8c49e', 'rx="2"');
  art += path(
    `M${x - 3},${eave}l12,${y - eave + 3}q${w / 2 - 9},-8 ${w - 18},0l12,${eave - y - 3}Z`,
    roof,
    line,
  );
  art += path(
    `M${x + 11},${y + 9}q${w / 2 - 11},-6 ${w - 22},0`,
    'none',
    'stroke="#fff0c4" stroke-width="3" stroke-linecap="round"',
  );
  for (let i = 1; i < 4; i++) {
    const yy = y + ((eave - y) * i) / 4;
    art += path(
      `M${x + 10 - i * 2},${yy}h${w - 20 + i * 4}`,
      'none',
      'stroke="#7e684b" stroke-width=".65" opacity=".3"',
    );
  }
  for (const window of d.windows) {
    art += rect(window.x - 6.5, window.y - 7, 13, 15, '#a5c5c4', `rx="3" ${line}`);
    art += path(
      `M${window.x - 4},${window.y - 4}h8m-4-1v10`,
      'none',
      'stroke="#fffcf5" stroke-width="1.5"',
    );
    art += rect(window.x - 9, window.y + 7, 18, 3, '#b7c394', `rx="1" ${line}`);
  }
  art += rect(d.x - 2.5, d.y - 2.5, d.width + 5, d.height + 3, '#d7b77d', `rx="3" ${line}`);
  art += rect(d.x, d.y, d.width, d.height, '#9f8261');
  art += rect(d.x + 2, d.y + 2, d.width - 4, 9, '#eddcae', 'rx="1"');
  art += path(
    `M${d.x + d.width / 2},${d.y}v${d.height}`,
    'none',
    'stroke="#655541" stroke-width="1"',
  );
  art += ellipse(d.x + d.width * 0.7, d.y + d.height * 0.68, 1.1, 1.1, '#fff1c4');
  art += rect(d.x - 4, bottom, d.width + 8, 3, '#e8d4ac', `rx="1" ${line}`);
  if (kind === 'C')
    art += path(
      `M${x + w / 2 - 3},${eave - 20}h6v5h5v6h-5v5h-6v-5h-5v-6h5Z`,
      c.paper,
      'stroke="#8d6855" stroke-width="1"',
    );
  if (kind === 'G') {
    art += path(`M${x + w / 2},${eave - 27}q-18,10 0,24q18-14 0-24Z`, '#f8e2a9', line);
    art += path(`M${x + w / 2},${eave - 22}v14l6-6`, 'none', 'stroke="#b09358" stroke-width="1.2"');
  }
  if (kind === 'S')
    art += path(
      `M${x + 7},${eave + 2}h${w - 14}v8q-6,6-12,0-6,6-12,0-6,6-12,0-6,6-12,0-6,6-12,0-6,6-12,0-6,6-12,0-6,6-12,0Z`,
      c.paper,
      'opacity=".65"',
    );
  return art;
}

export function illustratedMap(map: MapId) {
  const { rows } = MAPS[map];
  const { width, height } = mapSize(map);
  const forest = map === 'forest';
  let art = rect(0, 0, width, height, forest ? '#d3ddbe' : c.grass);
  art += path(
    contour(rows, (t) => t === 'g'),
    '#c0d09f',
    'stroke="#a9bc8c" stroke-width="1"',
  );
  art += path(
    contour(rows, (t) => [':', '=', 'R'].includes(t), 7),
    '#f3e6c9',
    'stroke="#c8b993" stroke-width="1.2"',
  );
  art += path(
    contour(rows, (t) => t === '~' || t === 'W', 8),
    c.water,
    'stroke="#f9f1db" stroke-width="7"',
  );
  art += path(
    contour(rows, (t) => t === '~' || t === 'W', 8),
    'none',
    'stroke="#8ba8a2" stroke-width="1"',
  );
  const visited = new Set<string>();
  rows.forEach((row, y) =>
    [...row].forEach((tile, x) => {
      const xx = x * 32,
        yy = y * 32;
      const n = (x * 37 + y * 59) % 13;
      if (tile === '.' && n < 7) {
        art += path(
          `M${xx + 9},${yy + 19}l-2,-4m2,4 3,-5m9,9 2,-2`,
          'none',
          'stroke="#a9b58a" stroke-width="1" stroke-linecap="round"',
        );
        if (n === 0) art += ellipse(xx + 24, yy + 8, 2, 1, '#f5edd5');
      }
      if (tile === ':' && n < 3)
        art += path(
          `M${xx + 10},${yy + 21}h4m7,-12h2`,
          'none',
          'stroke="#c4b28a" stroke-width="1" stroke-linecap="round"',
        );
      if (tile === 'g') {
        for (let i = 0; i < 3; i++) {
          const gx = xx + 5 + i * 10,
            gy = yy + 12 + ((i + n) % 2) * 13;
          art += path(
            `M${gx},${gy}q-5,-8-5,-10 7,2 5,10 0,-11 4,-13 3,8-4,13 6,-7 9,-5-2,6-9,5`,
            i % 2 ? '#8fa87c' : '#9cb485',
            'stroke="#738962" stroke-width=".7" stroke-linejoin="round"',
          );
        }
      }
      if (tile === '^')
        for (let i = 0; i < 3; i++)
          art += flower(xx + 7 + i * 9, yy + 9 + ((i + n) % 2) * 13, n + i);
      if (tile === '~') {
        art += path(
          `M${xx + 5},${yy + 12}q4,2 9,0m4,10h6`,
          'none',
          'stroke="#e7f0df" stroke-width="1.3" stroke-linecap="round"',
        );
        if (n < 2)
          art += ellipse(xx + 22, yy + 7, 4, 2.5, '#8ca879', 'stroke="#789369" stroke-width=".7"');
      }
      if ('HCSG'.includes(tile) && !visited.has(`${x},${y}`)) {
        let w = 1,
          h = 1;
        while (rows[y]?.[x + w] === tile) w++;
        while (rows[y + h]?.[x] === tile) h++;
        for (let by = y; by < y + h; by++)
          for (let bx = x; bx < x + w; bx++) visited.add(`${bx},${by}`);
        art += house(map, xx, yy, w * 32, h * 32, tile);
      }
    }),
  );
  rows.forEach((row, y) =>
    [...row].forEach((tile, x) => {
      if (tile === '#') art += tree(x * 32, y * 32, (x * 3 + y * 7) % 11, forest);
    }),
  );
  return svg(width, height, art);
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

mkdirSync('assets/maps/illustrated', { recursive: true });
for (const map of ILLUSTRATED_MAPS) {
  const source = illustratedMap(map);
  writeFileSync(
    `assets/maps/illustrated/${map}.png`,
    new Resvg(source, { fitTo: { mode: 'width', value: mapSize(map).width * 2 } }).render().asPng(),
  );
}
writeFileSync(
  'assets/maps/illustrated/battle-meadow.png',
  new Resvg(illustratedMeadow()).render().asPng(),
);
