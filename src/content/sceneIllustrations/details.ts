import { MAPS, mapSize } from '../world';
import { battleTheme } from '../battleScenes';
import { isIndoor } from '../../game/environment';
import { sceneInk as ink } from '../sceneArt';
import type { MapId } from '../../game/model';

// This is the screenshot's paper palette and rounded ink language, including later regions.
const stroke = `stroke="${ink.outline}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"`;
const rect = (x: number, y: number, w: number, h: number, fill: string, radius = 3) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" ${stroke}/>`;
const path = (d: string, fill = 'none', extra = '') => {
  let outline = stroke;
  for (const attribute of ['stroke', 'stroke-width'])
    if (extra.includes(`${attribute}=`))
      outline = outline.replace(new RegExp(`${attribute}="[^"]*"`), '');
  return `<path d="${d}" fill="${fill}" ${outline} ${extra}/>`;
};
const circle = (x: number, y: number, r: number, fill: string) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${stroke}/>`;
const ellipse = (x: number, y: number, rx: number, ry: number, fill: string) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${stroke}/>`;

export function illustratedPine(x: number, y: number, snow: boolean) {
  return `<g transform="translate(${x},${y})">${ellipse(16, 29, 13, 3, '#c5c7ae')}${rect(13, 21, 6, 10, '#b69c77', 2)}${path('M16 0Q10 9 5 12l5 1Q5 19 1 21l8 1-5 6q12 5 24 0l-5-6 8-1q-6-4-9-8l5-1Q21 7 16 0Z', snow ? '#bdcbbc' : '#a5bb91')}${path('M16 4q-4 6-8 8m4 4-6 6m12-5 7 6', 'none', 'stroke="#eef0d8" stroke-width="2"')}${snow ? path('M8 11q7 4 15 0M5 21q11 5 23 0', 'none', 'stroke="#fffaf0" stroke-width="3"') : ''}</g>`;
}

function plant(x: number, y: number, flower = false) {
  return `<g transform="translate(${x},${y})">${rect(-6, 6, 12, 8, '#c8ad87', 2)}${path('M0 7V-5M0 2q-10-1-8-9 7 0 8 9m0-2q9-2 7-10-7 1-7 10', ink.leaf)}${flower ? circle(0, -6, 3, '#e1bdab') : ''}</g>`;
}
function shelf(w: number, h: number, variant: number) {
  let art = rect(3, 6, w - 6, h - 8, '#c4ac87', 4);
  for (let y = 12; y < h - 9; y += 23) {
    art += rect(7, y, w - 14, 17, '#e8d7b5', 2);
    for (let x = 10; x < w - 10; x += 9)
      art += rect(
        x,
        y + 3 + (x % 2) * 2,
        6,
        12 - (x % 2) * 2,
        ['#b5c7bc', '#dbb59d', '#e0cf99'][(x + variant) % 3]!,
        1,
      );
  }
  return art;
}
function installation(kind: string, w: number, h: number) {
  let art = ellipse(w / 2, h - 4, w * 0.42, 3, '#c4b99b');
  if (kind === 'archive') return art + shelf(w, h, 1);
  if (kind === 'power') {
    art += rect(5, h * 0.36, w - 10, h * 0.57, '#c4c4af', 5);
    for (const x of [w * 0.28, w * 0.72]) {
      art += rect(x - 8, 9, 16, h * 0.6, '#b7c7be', 5);
      for (let y = 16; y < h * 0.64; y += 9) art += ellipse(x, y, 11, 3, '#ddc28f');
      art += circle(x, h * 0.71, 5, '#f7eed4');
      art += path(`M${x - 3} ${h * 0.71}l3-3 3 2`);
    }
    return art + path(`M${w * 0.28} 9V4h${w * 0.44}v5`);
  }
  if (kind === 'forge') {
    art += path(
      `M7 ${h - 6}V${h * 0.47}Q${w / 2} ${-h * 0.13} ${w - 7} ${h * 0.47}V${h - 6}Z`,
      '#caa98d',
    );
    art += path(
      `M${w * 0.25} ${h - 10}V${h * 0.6}Q${w / 2} ${h * 0.27} ${w * 0.75} ${h * 0.6}V${h - 10}Z`,
      '#8d7b69',
    );
    art += path(`M${w * 0.36} ${h - 12}q-5-9 6-17 2 9 7 4 9 11 0 14Z`, '#efc98e');
    for (let y = 13; y < h * 0.7; y += 15)
      art += path(`M10 ${y}h${w - 20}`, 'none', 'opacity=".35"');
    return art;
  }
  if (kind === 'weather') {
    art += rect(w * 0.4, 12, w * 0.2, h - 17, '#c4ae87');
    art += circle(w / 2, 15, Math.min(w * 0.31, 20), '#f5edd5');
    art += path(`M${w / 2} 15l${w * 0.13} -7M${w / 2 - 7} ${h - 9}h14`);
    art += path(`M8 ${h * 0.68}V${h * 0.32}h${w - 16}`);
    return art + path(`M${w - 8} ${h * 0.32}l-18 -7v14Z`, '#d6b699');
  }
  if (kind === 'star') {
    art += rect(w * 0.18, h - 16, w * 0.64, 10, '#c8b89a');
    art += ellipse(w / 2, h * 0.43, w * 0.34, h * 0.31, '#e4d7b6');
    art += ellipse(w / 2, h * 0.43, w * 0.22, h * 0.22, '#bccbc3');
    art += path(
      `M${w * 0.2} ${h * 0.66}l${w * 0.6} ${-h * 0.44}M${w * 0.3} ${h * 0.24}l${w * 0.4} ${h * 0.4}`,
    );
    return art + path(`M${w / 2} ${h * 0.2}l4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1Z`, '#e7c785');
  }
  // Carved stone columns retain the existing solid footprint and leave all aisles clear.
  art += rect(w * 0.14, h - 14, w * 0.72, 10, '#c9bea4');
  art += rect(w * 0.26, 12, w * 0.48, h - 22, '#dcd1b7');
  art += rect(w * 0.17, 6, w * 0.66, 12, '#eee3c6');
  art += path(`M${w * 0.38} 24v${Math.max(1, h - 46)}m${w * 0.22} 0V24`, 'none', 'opacity=".4"');
  return art + plant(w * 0.7, h - 17);
}

/** Furniture lives inside existing solid rectangles; medallions and rugs are flat floor art. */
export function illustratedSceneDetails(map: MapId) {
  const data = MAPS[map],
    { rows } = data,
    { width, height } = mapSize(map),
    theme = battleTheme(map);
  const indoor = isIndoor(map),
    room = data.interior;
  let art = '';
  if (room) {
    const color =
      room.style === 'teahouse' ? '#c6d1b3' : room.style === 'library' ? '#bccdc6' : '#e4cba7';
    art += rect(5 * 32 + 5, 4 * 32 + 5, 4 * 32 - 10, 5 * 32 - 10, color, 9);
    art += rect(5 * 32 + 10, 4 * 32 + 10, 4 * 32 - 20, 5 * 32 - 20, 'none', 6);
    art += path('M207 180l17-15 17 15-17 15Z', '#f3e7c9');
    // Wall lamps and potted plants give each room a furnished edge without introducing blockers.
    for (const x of [48, width - 48]) art += plant(x, 22, room.style === 'greenhouse');
    return art;
  }
  if (indoor && map !== 'gym' && map !== 'mine' && map !== 'mineDepths') {
    // Connected islands touching the rim are walls. Freestanding blocks become real installations.
    const seen = new Set<string>();
    rows.forEach((row, y) =>
      [...row].forEach((tile, x) => {
        if (tile !== '#' || seen.has(`${x},${y}`)) return;
        const stack: [[number, number]] | [number, number][] = [[x, y]],
          cells: [number, number][] = [];
        while (stack.length) {
          const [xx, yy] = stack.pop()!,
            key = `${xx},${yy}`;
          if (seen.has(key) || rows[yy]?.[xx] !== '#') continue;
          seen.add(key);
          cells.push([xx, yy]);
          stack.push([xx - 1, yy], [xx + 1, yy], [xx, yy - 1], [xx, yy + 1]);
        }
        if (
          cells.some(
            ([xx, yy]) => xx === 0 || yy === 0 || xx === row.length - 1 || yy === rows.length - 1,
          )
        )
          return;
        const left = Math.min(...cells.map((c) => c[0])),
          right = Math.max(...cells.map((c) => c[0]));
        const top = Math.min(...cells.map((c) => c[1])),
          bottom = Math.max(...cells.map((c) => c[1]));
        // Irregular and hollow ruin walls keep their masonry instead of covering the interior court.
        if (cells.length !== (right - left + 1) * (bottom - top + 1) || cells.length < 4) return;
        const w = (right - left + 1) * 32,
          h = (bottom - top + 1) * 32;
        const kind =
          map === 'mirrorArchive'
            ? 'archive'
            : theme === 'electric'
              ? 'power'
              : theme === 'furnace'
                ? 'forge'
                : map === 'windObservatory'
                  ? 'weather'
                  : theme === 'star'
                    ? 'star'
                    : 'column';
        for (let yy = 0; yy < h; yy += 96)
          art += `<g transform="translate(${left * 32 + 4},${top * 32 + yy + 3})">${installation(kind, w - 8, Math.min(96, h - yy) - 6)}</g>`;
      }),
    );
    // Subtle floor inlay distinguishes arenas and halls while keeping every path visible.
    for (let y = 3; y < rows.length - 3; y += 7)
      for (let x = 4; x < rows[0]!.length - 4; x += 9) {
        if (
          ![-1, 0, 1].every((dy) =>
            [-1, 0, 1].every((dx) => ':.'.includes(rows[y + dy]?.[x + dx] ?? ' ')),
          )
        )
          continue;
        const xx = x * 32 + 16,
          yy = y * 32 + 16;
        art += `<g opacity=".32">${ellipse(xx, yy, 32, 22, 'none')}${path(`M${xx - 22} ${yy}h44m-22-16v32`, 'none')}</g>`;
      }
    if (map === 'hallOfFame' || map === 'leagueHall')
      for (let x = 3; x < rows[0]!.length - 3; x += 4) {
        art += `<g transform="translate(${x * 32},2)">${rect(3, 3, 26, 21, '#e6cf99')}${path('M9 7h14v6q-7 11-14 0Z', '#f7e3aa')}${path('M16 19v5m-5 0h10')}</g>`;
      }
  }
  // Shores use the same restrained ink, low reeds and petal shapes as the supplied screenshot.
  rows.forEach((row, y) =>
    [...row].forEach((tile, x) => {
      const n = (x * 37 + y * 59) % 23,
        xx = x * 32,
        yy = y * 32;
      if ((tile === '~' || tile === 'W') && !indoor && n < 5) {
        art += ellipse(xx + 13, yy + 19, 8, 3, '#aebf98');
        if (n === 0) art += path(`M${xx + 13} ${yy + 18}q-10-9 0-15 10 6 0 15Z`, '#e2bfb2');
      }
      if (
        tile === '#' &&
        indoor &&
        map !== 'mine' &&
        map !== 'mineDepths' &&
        n % 5 === 0 &&
        rows[y + 1]?.[x] !== '#'
      ) {
        art += rect(xx + 7, yy + 9, 18, 15, '#d9d5bb', 3);
        art += path(`M${xx + 12} ${yy + 15}l4-3 4 3-4 4Z`, '#e9ddbc');
      }
    }),
  );
  // Map bounds are kept explicit for the SVG renderer; details never redefine world geometry.
  return `<g data-scene-detail="${map}" data-world-size="${width}x${height}">${art}</g>`;
}
