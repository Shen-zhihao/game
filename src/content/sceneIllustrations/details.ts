import { MAPS, mapSize } from '../world';
import { battleTheme, type BattleTheme } from '../battleScenes';
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

function emblem(theme: BattleTheme, size = 24) {
  const drawing =
    theme === 'electric'
      ? path('M3-22-13 3H0l-3 19L14-6H1Z', '#e3c18a')
      : theme === 'furnace'
        ? path('M0 22C-27 9-9-8-3-22-1-6 10-9 9-17 30 9 17 22 0 22Z', '#dfb08d')
        : theme === 'coast' || theme === 'lake'
          ? path(
              'M-25 4q12-17 24 0t25 0M-25 15q12-17 24 0t25 0',
              'none',
              'stroke="#94b3b1" stroke-width="3"',
            ) + circle(0, -13, 7, '#d5d8b9')
          : theme === 'wind'
            ? path(
                'M-23 4C-26-15 8-26 23-19 23 0 5 19-23 4Zm-9 20L15-13m-27 23V-7m13 9 13-1',
                '#c6d6d0',
              )
            : theme === 'star'
              ? path('M0-24 7-8 24-7 11 5l4 19L0 15-16 9l4-13-11-11 17-1Z', '#dacaac') +
                ellipse(0, 0, 31, 12, 'none')
              : theme === 'league'
                ? path(
                    'M-13-18h26v15Q0 21-13-3ZM-13-14q-24-2-5 16m31-16q24-2 5 16M0 10v12m-11 0h22',
                    '#e2c68d',
                  )
                : theme === 'highlands'
                  ? path('M-26 19-10-15 0 2 9-22 27 19Z', '#c6bea8') +
                    path('m9-22-8 18 9-4 9 7Z', '#f0e6ce')
                  : path(
                      'M0 23C-30 7-16-18 0-24 17-18 29 7 0 23Zm0-37v37M-11-5 0 6 12-4',
                      '#c3ceab',
                    );
  return `<g transform="scale(${size / 24})">${drawing}</g>`;
}

/** Additional architecture stays on solid cells; floor decoration is deliberately flat. */
function regionalDetails(map: MapId) {
  const data = MAPS[map],
    theme = battleTheme(map),
    indoor = isIndoor(map);
  let art = '';
  data.rows.forEach((row, y) =>
    [...row].forEach((tile, x) => {
      const xx = x * 32,
        yy = y * 32,
        n = (x * 17 + y * 29) % 19;
      if (!indoor && tile === '.' && n < 2) {
        const tint =
          theme === 'wind'
            ? '#d6dfcf'
            : theme === 'furnace' || theme === 'highlands'
              ? '#dac8ac'
              : '#ccd8b6';
        art += `<g opacity=".65">${path(`M${xx + 2} ${yy + 23}q-2-10 8-10 3-9 10-4 12-1 10 10-10 10-28 4Z`, tint, 'stroke="none"')}</g>`;
        if (theme === 'coast' || theme === 'furnace' || theme === 'highlands')
          art +=
            ellipse(xx + 10, yy + 22, 4, 2, '#c8b99b') + ellipse(xx + 23, yy + 13, 3, 2, '#e7dcc3');
        else
          art += path(
            `M${xx + 12} ${yy + 24}v-12m0 6q-9-1-7-7 7 0 7 7m1 1q8-1 7-8-7 1-7 8`,
            '#b3c49d',
            'stroke="#8fa27b" stroke-width=".65"',
          );
      }
      // Shoreline tufts lie on land, while floating leaves stay in the water footprint.
      if (
        !indoor &&
        tile === '.' &&
        n % 4 === 0 &&
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => '~W'.includes(data.rows[y + dy!]?.[x + dx!] ?? ' '))
      )
        art += path(
          `M${xx + 10} ${yy + 27}q-4-15-1-21m1 21q4-18 8-22m-4 22q9-13 10-12`,
          'none',
          'stroke="#8fa68e" stroke-width="1.2"',
        );
    }),
  );
  return art;
}

/** Detail is grouped behind the creatures' clear battle platforms. */
export function illustratedBattleDetails(theme: BattleTheme) {
  let art = '';
  const tint = theme === 'furnace' ? '#bba08b' : theme === 'highlands' ? '#b7ae95' : '#b5c3aa';
  // Varied foreground pebbles, leaves and border plants break up broad empty floor shapes.
  for (let i = 0; i < 44; i++) {
    const x = (i * 179 + 41) % 1510,
      y = 565 + ((i * 113) % 430);
    if (
      ((x - 390) / 340) ** 2 + ((y - 750) / 120) ** 2 < 1 ||
      ((x - 1120) / 270) ** 2 + ((y - 460) / 110) ** 2 < 1
    )
      continue;
    art += `<g opacity=".65">${ellipse(x, y, 7 + (i % 5), 3, tint)}${path(`M${x + 19} ${y - 3}l8-3m-3 8 8-1`, 'none', 'stroke="#aa9d80" stroke-width="1.6"')}</g>`;
    if (i % 5 === 0)
      art += `<g transform="translate(${x},${y - 5}) scale(1.5)">${plant(0, 0, theme === 'lake')}</g>`;
  }
  if (theme === 'electric') {
    for (let i = 0; i < 7; i++) {
      const x = 25 + i * 235,
        y = 130 + (i % 2) * 50;
      art += rect(x + 27, y + 13, 71, 44, '#b2c5bc', 7);
      art += circle(x + 63, y + 34, 14, '#f1e7cc') + path(`M${x + 63} ${y + 34}l7-7`);
      for (let k = 0; k < 4; k++)
        art += path(
          `M${x + 32} ${y + 78 + k * 11}h62`,
          'none',
          'stroke="#a8aa95" stroke-width="2"',
        );
      art += `<g transform="translate(${x + 63},${y + 184})">${emblem(theme, 15)}</g>`;
    }
    art += path('M0 419h550v27h260v-27h726', 'none', 'stroke="#b49e7b" stroke-width="7"');
  } else if (theme === 'furnace') {
    for (const [x, y, s] of [
      [35, 286, 2.5],
      [1260, 282, 2.9],
      [238, 393, 1.6],
    ])
      art += `<g transform="translate(${x},${y}) scale(${s})">${installation('forge', 72, 80)}</g>`;
    art += path(
      'M86 290q-24-54 5-83m22 52q-11-28 6-53m1260 80q27-51 1-81',
      'none',
      'stroke="#e8d4b8" stroke-width="12" opacity=".7"',
    );
  } else if (theme === 'highlands') {
    art += path(
      'M0 460q180-65 370-20m820 20q180-65 346-27M0 492q180-65 370-20m820 20q180-65 346-27',
      'none',
      'stroke="#998c73" stroke-width="3"',
    );
    art += `<g transform="translate(90,300) scale(2.4)">${installation('column', 60, 66)}</g>`;
    art += path(
      'M1370 449V267h90m-90 28 73 115m-73-143 73 40m17-40v126',
      'none',
      'stroke="#8f7e66" stroke-width="8"',
    );
    art += rect(1434, 393, 54, 35, '#c6ab80', 6);
  } else if (theme === 'league' || theme === 'star') {
    for (let i = 0; i < 7; i++) {
      const x = 20 + i * 240;
      art += rect(x - 8, 416, 188, 19, '#d4c4a3', 5) + rect(x - 1, 284, 30, 14, '#e5d8bc', 3);
      art += path(`M${x + 8} 308v94m7-94v94`, 'none', 'stroke="#aa9c81" stroke-width="2"');
      if (theme === 'league')
        art += `<g transform="translate(${x + 86},216)">${emblem(theme, 20)}</g>`;
      else if (i % 2 === 0)
        art += path(
          `M${x + 18} 410q-23-50 0-84m-3 43q-27-1-21-22m20 6q24-9 19-26`,
          'none',
          'stroke="#9eaf8d" stroke-width="6"',
        );
    }
    art += `<g transform="translate(770,606)" opacity=".4">${ellipse(0, 0, 175, 61, '#f7edd5')}${ellipse(0, 0, 160, 52, 'none')}<g transform="scale(2.1,1)">${emblem(theme, 35)}</g></g>`;
    for (const x of [60, 1440])
      art += `<g transform="translate(${x},363) scale(1.7)">${installation(theme === 'star' ? 'star' : 'column', 55, 75)}</g>`;
  }
  return `<g data-battle-detail="${theme}">${art}</g>`;
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
    // Small wall pictures identify the parent region in all 102 enterable rooms.
    for (const x of [112, width - 112])
      art += `<g transform="translate(${x},17)">${rect(-21, -12, 42, 24, '#f2e5c9', 3)}${emblem(theme, 9)}</g>`;
    return art;
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
    }),
  );
  // Map bounds are kept explicit for the SVG renderer; details never redefine world geometry.
  return `<g data-scene-detail="${map}" data-world-size="${width}x${height}">${art}${regionalDetails(map)}</g>`;
}
