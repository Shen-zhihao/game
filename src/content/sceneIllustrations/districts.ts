import { MAPS } from '../world';
import type { MapId } from '../../game/model';
import type { BuildingEntrance } from '../buildings';

/** Late cities share collision data, not an architectural kit. All drawings use final grid anchors. */
const PALETTES = {
  volt: ['#d8c8a7', '#739b97', '#b58355', '#eee1bd'],
  wind: ['#dce4d8', '#708b87', '#a99e81', '#f6f4df'],
  furnace: ['#d2b39b', '#9a6b56', '#8f8c7e', '#efcf9a'],
  lake: ['#d3dfcf', '#80a8a4', '#b2b59b', '#f3edd6'],
  star: ['#c8c7d4', '#8d91af', '#afa27e', '#eee7c8'],
  league: ['#e2d6b9', '#b6a276', '#8f9d89', '#fbf2d4'],
} as const;
type LateCity = keyof typeof PALETTES;
const late = (map: MapId): map is LateCity => map in PALETTES;
const ink = 'stroke="#71634f" stroke-width="1.3" stroke-linejoin="round"';
const rect = (x: number, y: number, w: number, h: number, fill: string, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const path = (d: string, fill = 'none', extra = ink) => `<path d="${d}" fill="${fill}" ${extra}/>`;
const ellipse = (x: number, y: number, rx: number, ry: number, fill: string, extra = ink) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;

/** Flush paving is walkable: no visual walls, trees or furniture are added to open tiles. */
export function districtGround(map: MapId) {
  if (!late(map)) return '';
  const { rows } = MAPS[map];
  const [stone, roof, metal, light] = PALETTES[map];
  let paving = '',
    clip = '';
  rows.forEach((row, y) =>
    [...row].forEach((tile, x) => {
      if (tile !== ':' && tile !== '.') return;
      const xx = x * 32,
        yy = y * 32;
      if (tile === ':') {
        clip += rect(xx, yy, 32, 32, '#fff');
        if (map === 'volt') {
          paving += rect(xx + 1, yy + 1, 30, 30, stone, 'rx="3"');
          paving += path(
            `M${xx + 4} ${yy + 8}h24m-24 16h24`,
            'none',
            `stroke="${metal}" stroke-width=".7" opacity=".55"`,
          );
          for (const dx of [5, 27]) paving += ellipse(xx + dx, yy + 5, 1.2, 1.2, metal, '');
        } else if (map === 'furnace') {
          for (let j = 0; j < 2; j++)
            for (let k = 0; k < 2; k++)
              paving += rect(
                xx + k * 16 + (j % 2) * 3,
                yy + j * 16,
                15,
                15,
                (x + y + j + k) % 3 ? stone : '#c4a58e',
                'rx="2"',
              );
        } else if (map === 'lake') {
          paving += path(
            `M${xx} ${yy + 8}q8-5 16 0t16 0m-32 16q8-5 16 0t16 0`,
            'none',
            `stroke="${roof}" stroke-width=".8" opacity=".5"`,
          );
        } else if (map === 'wind') {
          paving += path(
            `M${xx + 2} ${yy + 2}h28v28H${xx + 2}Zm0 14h28`,
            'none',
            'stroke="#aab7a6" stroke-width=".6"',
          );
          if ((x + y) % 5 === 0)
            paving += path(
              `M${xx + 5} ${yy + 22}q10-7 22-4`,
              'none',
              `stroke="${light}" stroke-width="2"`,
            );
        } else {
          paving += rect(
            xx + 1,
            yy + 1,
            30,
            30,
            (x + y) % 2 === 0 ? stone : light,
            'opacity=".38"',
          );
          if ((x + y) % 3 === 0)
            paving += path(
              `M${xx + 16} ${yy + 5}l11 11-11 11-11-11Z`,
              'none',
              `stroke="${metal}" stroke-width=".6" opacity=".6"`,
            );
        }
      } else if (x > 1 && y > 1 && x < row.length - 2 && y < rows.length - 2) {
        // Continuous landscaped beds replace the repeated flecks of the template districts.
        const quarter = x > row.length * 0.55 ? 1 : 0;
        paving += rect(
          xx,
          yy,
          32,
          32,
          map === 'furnace' ? '#d8c3a2' : quarter ? '#d3dec1' : '#cdd7b9',
          'opacity=".48"',
        );
        if ((x * 7 + y * 11) % 9 === 0)
          paving += path(
            `M${xx + 4} ${yy + 17}q9-5 22 0`,
            'none',
            `stroke="${map === 'furnace' ? '#ad9274' : '#b0c09c'}" stroke-width=".7"`,
          );
      }
    }),
  );
  // Use the largest fully paved square, so medallions never straddle garden beds or buildings.
  const squares: number[][] = [];
  let best = { size: 0, x: 0, y: 0 };
  rows.forEach((row, y) => {
    squares[y] = [];
    [...row].forEach((tile, x) => {
      const size =
        tile === ':'
          ? 1 +
            Math.min(
              squares[y - 1]?.[x] ?? 0,
              squares[y]?.[x - 1] ?? 0,
              squares[y - 1]?.[x - 1] ?? 0,
            )
          : 0;
      squares[y]![x] = size;
      if (size > best.size) best = { size, x, y };
    });
  });
  const cx = (best.x + 1 - best.size / 2) * 32;
  const cy = (best.y + 1 - best.size / 2) * 32;
  const r = Math.max(20, Math.min(140, best.size * 16 - 8));
  let plaza =
    ellipse(cx, cy, r, r, light, `stroke="${metal}" stroke-width="3"`) +
    ellipse(cx, cy, r - 11, r - 11, 'none', `stroke="${roof}" stroke-width="1.5"`);
  if (map === 'volt') {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const x = cx + Math.cos(a) * r * 0.8,
        y = cy + Math.sin(a) * r * 0.8;
      plaza +=
        path(`M${cx} ${cy}H${x}V${y}`, 'none', `stroke="${metal}" stroke-width="3"`) +
        ellipse(x, y, 5, 5, light, ink);
    }
    plaza += path(`M${cx + 9} ${cy - 45}l-34 49h26l-10 37 37-50h-27Z`, roof, ink);
  } else if (map === 'wind') {
    for (let i = 0; i < 8; i++)
      plaza += `<g transform="rotate(${i * 45} ${cx} ${cy})">${path(`M${cx} ${cy - r * 0.78}l12 ${r * 0.78}-12 16-12-16Z`, i % 2 ? stone : roof, ink)}</g>`;
  } else if (map === 'furnace') {
    for (let i = 0; i < 12; i++)
      plaza += `<g transform="rotate(${i * 30} ${cx} ${cy})">${rect(cx - 7, cy - r * 0.81, 14, 24, roof, 'rx="2"')}</g>`;
    plaza += path(
      `M${cx} ${cy + 40}c-45-10-34-46-7-74-3 29 25 15 18-5 38 40 18 72-11 79Z`,
      metal,
      ink,
    );
  } else if (map === 'lake') {
    for (let i = 0; i < 5; i++)
      plaza += path(
        `M${cx - r * 0.65} ${cy - 36 + i * 18}q${r * 0.32} -15 ${r * 0.65} 0t${r * 0.65} 0`,
        'none',
        `stroke="${roof}" stroke-width="3"`,
      );
  } else if (map === 'star') {
    for (let i = 0; i < 3; i++)
      plaza += `<g transform="rotate(${i * 60} ${cx} ${cy})">${ellipse(cx, cy, r * 0.8, r * 0.25, 'none', `stroke="${roof}" stroke-width="2"`)}</g>`;
    plaza += path(
      `M${cx} ${cy - 35}l10 24 26 1-20 16 6 25-22-14-22 14 6-25-20-16 26-1Z`,
      metal,
      ink,
    );
  } else {
    plaza += path(
      `M${cx - 24} ${cy - 40}h48v35q-24 45-48 0Zm0 5q-48-5-15 38m63-38q48-5 15 38M${cx} ${cy + 19}v25m-26 0h52`,
      metal,
      ink,
    );
  }
  return `<defs><clipPath id="district-paving">${clip}</clipPath></defs>${paving}<g clip-path="url(#district-paving)" opacity=".73">${plaza}</g>`;
}

/** Complete replacement silhouettes while keeping each authored door and window anchor exact. */
export function districtBuilding(map: MapId, entrance: BuildingEntrance): string | null {
  if (!late(map)) return null;
  const { x, y, width: w, height: h, kind } = entrance.footprint;
  const d = entrance.doorway,
    bottom = d.y + d.height,
    eave = Math.min(y + h * 0.53, d.y - 7),
    top = Math.min(y, eave - 24);
  const [stone, roof, metal, light] = PALETTES[map];
  const variant = (entrance.x + entrance.y) % 3;
  let art = ellipse(x + w / 2, bottom + 3, w * 0.52, 6, '#76674f', 'opacity=".18"');
  art += rect(x + 2, eave - 4, w - 4, bottom - eave + 5, stone, `rx="3" ${ink}`);
  if (map === 'volt') {
    // Copper sawtooth workshop roofs and transformer pilasters.
    art += path(
      `M${x - 2} ${eave}V${top + 12}l${w * 0.32} -12v15l${w * 0.34} -15v15l${w * 0.34} -15v${eave - top}Z`,
      roof,
      ink,
    );
    for (let i = 1; i < 4; i++) art += rect(x + (w * i) / 4 - 7, top + 17, 14, 10, '#c7ddd2', ink);
    for (const dx of [7, w - 14]) {
      art += rect(x + dx, eave + 2, 7, bottom - eave - 3, metal, ink);
      for (let k = 0; k < 3; k++) art += ellipse(x + dx + 3.5, eave + 8 + k * 8, 6, 2, light, ink);
    }
  } else if (map === 'wind') {
    // Steep overlapping alpine gables, braced timber and a visible snow lip.
    art += path(
      `M${x - 5} ${eave}L${x + w * 0.28} ${top - 17}l${w * 0.25} ${eave - top + 17}L${x + w * 0.75} ${top - 8}l${w * 0.28} ${eave - top + 8}Z`,
      roof,
      ink,
    );
    art += path(`M${x - 5} ${eave}h${w + 9}`, 'none', 'stroke="#f9f6e8" stroke-width="4"');
    for (const dx of [7, w - 12])
      art += path(
        `M${x + dx} ${eave + 3}v${bottom - eave - 4}m0-5 17-${bottom - eave - 13}`,
        'none',
        `stroke="${metal}" stroke-width="3"`,
      );
    art += path(`M${x + w * 0.75} ${top - 8}v-22m-10 8h23l-6-5v10Z`, light, ink);
  } else if (map === 'furnace') {
    // Brick barrel vaults and tall terracotta flues.
    art += path(`M${x - 3} ${eave}Q${x + w * 0.5} ${top - 34} ${x + w + 3} ${eave}Z`, roof, ink);
    for (let i = 1; i < 5; i++)
      art += path(
        `M${x + (w * i) / 5} ${eave - 3}q-5-${(eave - top) * 0.6} 0-${(eave - top) * 0.75}`,
        'none',
        `stroke="${metal}" stroke-width="1.5"`,
      );
    art +=
      rect(x + w - 25, top - 18, 14, eave - top + 10, metal, ink) +
      rect(x + w - 29, top - 22, 22, 7, light, ink);
    for (let yy = eave + 8; yy < bottom - 5; yy += 10)
      art += path(`M${x + 5} ${yy}h${w - 10}`, 'none', 'stroke="#ac8f77" stroke-width=".7"');
  } else if (map === 'lake') {
    // Broad curved lake pavilion roofs, balcony rails and ceramic ridge tiles.
    art += path(
      `M${x - 9} ${eave + 2}Q${x + w * 0.18} ${eave - 8} ${x + w * 0.26} ${top + 3}Q${x + w / 2} ${top - 12} ${x + w * 0.74} ${top + 3}Q${x + w * 0.84} ${eave - 8} ${x + w + 9} ${eave + 2}Z`,
      roof,
      ink,
    );
    art += path(
      `M${x - 6} ${eave - 1}q${w / 2} -8 ${w + 12} 0`,
      'none',
      `stroke="${light}" stroke-width="3"`,
    );
    for (const dx of [7, w - 12]) art += rect(x + dx, eave + 3, 5, bottom - eave - 3, metal, ink);
    for (let i = 0; i < 3; i++)
      art += ellipse(x + w * 0.5 + (i - 1) * 9, top + 2, 4, 3, light, ink);
  } else if (map === 'star') {
    // Observatories have curved domes; adjacent facilities use staggered stepped wings.
    if (variant === 0 || kind === 'G') {
      art += path(
        `M${x - 3} ${eave}A${w * 0.52} ${eave - top + 13} 0 0 1 ${x + w + 3} ${eave}Z`,
        roof,
        ink,
      );
      art += path(
        `M${x + w / 2} ${top - 13}v${eave - top + 13}m-${w * 0.28} 0q0-${eave - top + 14} ${w * 0.28}-${eave - top + 13}`,
        'none',
        `stroke="${light}" stroke-width="1.5"`,
      );
    } else {
      art += path(
        `M${x - 3} ${eave}v-${eave - top - 7}h${w * 0.24}v-14h${w * 0.52}v14h${w * 0.24 + 6}v${eave - top - 7}Z`,
        roof,
        ink,
      );
      art +=
        ellipse(x + w / 2, top + 13, 13, 13, '#c7d4cd', ink) +
        ellipse(x + w / 2, top + 13, 18, 6, 'none', `stroke="${metal}" stroke-width="2"`);
    }
  } else {
    // Ceremonial stone pediments with colonnades, not the shared cottage roof.
    art += path(
      `M${x - 7} ${eave}L${x + w / 2} ${top - 21}l${w / 2 + 7} ${eave - top + 21}Z`,
      metal,
      ink,
    );
    art += path(
      `M${x + 8} ${eave - 7}L${x + w / 2} ${top - 10}l${w / 2 - 8} ${eave - top + 3}Z`,
      light,
      ink,
    );
    for (const dx of [8, w * 0.25, w * 0.75, w - 15])
      if (x + dx < d.x - 9 || x + dx > d.x + d.width + 5) {
        art +=
          rect(x + dx, eave + 3, 7, bottom - eave - 5, light, ink) +
          rect(x + dx - 3, eave + 1, 13, 5, metal, ink) +
          rect(x + dx - 3, bottom - 5, 13, 5, metal, ink);
      }
  }
  // Roof courses, carved lintels and deep window reveals give the architecture real scale.
  for (let i = 1; i < 6; i++) {
    const t = i / 6,
      inset = w * (1 - t) * 0.4;
    art += path(
      `M${x + inset} ${top + (eave - top) * t}h${w - inset * 2}`,
      'none',
      `stroke="${light}" stroke-width=".8" opacity=".4"`,
    );
  }
  art += rect(x + 5, eave + 2, w - 10, 4, light, 'opacity=".65"');
  for (const win of d.windows) {
    art += rect(win.x - 10, win.y - 10, 20, 21, metal, `rx="3" ${ink}`);
    art += rect(win.x - 12, win.y + 10, 24, 4, light, ink);
  }
  const style = entrance.style;
  if (style === 'greenhouse') {
    // Raised glass lantern with visible ribs, in addition to the regional lower roof.
    const gx = x + w * 0.22,
      gy = top + 3,
      gw = w * 0.56,
      gh = Math.max(16, eave - top - 9);
    art += path(
      `M${gx} ${gy + gh}v-${gh * 0.64}q${gw * 0.5}-${gh * 0.7} ${gw} 0v${gh * 0.64}Z`,
      '#bed6c8',
      ink,
    );
    for (let i = 1; i < 6; i++)
      art += path(
        `M${gx + (gw * i) / 6} ${gy + gh}v-${gh * 0.82}`,
        'none',
        `stroke="${light}" stroke-width="2"`,
      );
    art += path(
      `M${gx + 2} ${gy + gh * 0.58}h${gw - 4}`,
      'none',
      `stroke="${light}" stroke-width="2"`,
    );
  } else if (style === 'workshop' || style === 'bakery') {
    const chimneyX = x + w * 0.78;
    art +=
      rect(chimneyX, top - 13, 15, 32, metal, ink) +
      rect(chimneyX - 3, top - 16, 21, 5, light, ink);
    art += path(
      `M${chimneyX + 6} ${top - 20}q-8-9 0-17m5-4q-5-8 0-13`,
      'none',
      'stroke="#f4edd9" stroke-width="3" stroke-linecap="round"',
    );
    if (style === 'workshop') {
      const gx = x + w * 0.35,
        gy = top + (eave - top) * 0.6;
      art += ellipse(gx, gy, 13, 13, metal, ink) + ellipse(gx, gy, 7, 7, light, ink);
      for (let i = 0; i < 8; i++)
        art += `<g transform="rotate(${i * 45} ${gx} ${gy})">${rect(gx - 2, gy - 17, 4, 6, metal, ink)}</g>`;
    }
  } else if (style === 'library' || style === 'guild') {
    const tx = x + w * 0.5,
      ty = top - 3;
    art += rect(tx - 17, ty - 16, 34, 34, stone, `rx="4" ${ink}`);
    art += path(`M${tx - 22} ${ty - 15}l22-16 22 16Z`, roof, ink);
    art += ellipse(tx, ty + 1, 10, 11, '#c9d9cd', ink);
    art += path(
      style === 'guild' ? `M${tx} ${ty - 7}v8l6 3` : `M${tx} ${ty - 7}v16m-7-8h14`,
      'none',
      `stroke="${metal}" stroke-width="1.5"`,
    );
  }
  if (style === 'bakery' || style === 'teahouse') {
    for (let i = 0; i < 10; i++)
      art += rect(
        x + 4 + (i * (w - 8)) / 10,
        eave + 6,
        (w - 8) / 10,
        10,
        i % 2 ? light : roof,
        `rx="2" ${ink}`,
      );
  }
  // A shallow stoop and flower boxes stay inside the existing facade footprint.
  for (const win of d.windows) {
    art += rect(win.x - 11, win.y + 13, 22, 6, metal, `rx="2" ${ink}`);
    for (let i = 0; i < 3; i++)
      art += ellipse(win.x - 7 + i * 7, win.y + 12, 3, 4, i % 2 ? '#d7c49a' : '#a8bc93', ink);
  }
  // Functional facade signs remain clear in every regional silhouette.
  for (const win of d.windows) {
    art += rect(win.x - 7, win.y - 8, 14, 16, '#a9c7c6', `rx="${map === 'lake' ? 6 : 2}" ${ink}`);
    art += path(
      `M${win.x} ${win.y - 6}v12m-5-6h10`,
      'none',
      `stroke="${light}" stroke-width="1.5"`,
    );
  }
  const sx = x + w / 2,
    sy = eave - 13;
  if (kind === 'C') art += path(`M${sx - 3} ${sy - 7}h6v4h4v6h-4v4h-6v-4h-4v-6h4Z`, '#fffaf0', ink);
  if (kind === 'S')
    for (let i = 0; i < 6; i++)
      art += rect(x + 4 + (i * (w - 8)) / 6, eave + 2, (w - 8) / 6, 7, i % 2 ? metal : light, ink);
  if (kind === 'G') art += path(`M${sx} ${sy - 12}l10 5v12l-10 7-10-7v-12Z`, light, ink);
  if (entrance.style) {
    const sx = x + w - 22,
      sy = bottom - 30;
    art += rect(sx - 9, sy - 9, 18, 18, light, `rx="3" ${ink}`);
    const s = entrance.style;
    art +=
      s === 'library'
        ? path(
            `M${sx - 6} ${sy - 4}q3-2 6 0 3-2 6 0v9q-3-2-6 0-3-2-6 0ZM${sx} ${sy - 4}v9`,
            roof,
            ink,
          )
        : s === 'bakery'
          ? ellipse(sx, sy, 6, 4, '#dfb877', ink)
          : s === 'workshop'
            ? path(
                `M${sx - 5} ${sy + 5}l10-10m-4-1 5 5`,
                'none',
                'stroke="#8b8d79" stroke-width="3"',
              )
            : s === 'greenhouse'
              ? path(`M${sx} ${sy + 5}q-10-7 0-12 10 5 0 12Z`, roof, ink)
              : s === 'teahouse'
                ? path(`M${sx - 6} ${sy - 4}h10v6q-5 6-10 0Zm10 1q8-1 3 5h-3`, roof, ink)
                : ellipse(sx, sy, 6, 6, metal, ink);
  }
  art +=
    rect(d.x - 3, d.y - 3, d.width + 6, d.height + 3, metal, `rx="3" ${ink}`) +
    rect(d.x, d.y, d.width, d.height, '#937d62', ink);
  art +=
    rect(d.x + 2, d.y + 2, d.width - 4, 8, light, 'rx="1"') +
    path(`M${d.x + d.width / 2} ${d.y + 1}v${d.height - 1}`, 'none', ink) +
    ellipse(d.x + d.width * 0.72, d.y + d.height * 0.7, 1, 1, light, '');
  art += rect(d.x - 4, bottom - 2, d.width + 8, 3, light, ink);
  return art;
}
