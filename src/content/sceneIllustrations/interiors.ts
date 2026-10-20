import { MAPS, mapSize } from '../world';
import type { MapId } from '../../game/model';

// Furnishings are confined to the authored F cells. Flat inlays never create new obstacles.
const ink = '#655541';
const outline = `stroke="${ink}" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"`;
const rect = (x: number, y: number, w: number, h: number, fill: string, r = 2) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${outline}/>`;
const path = (d: string, fill = 'none', extra = '') =>
  `<path d="${d}" fill="${fill}" ${outline} ${extra}/>`;
const oval = (x: number, y: number, rx: number, ry: number, fill: string) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${outline}/>`;
const palettes: Record<string, [string, string, string]> = {
  dawn: ['#e5d4b0', '#b4c59e', '#d7b79c'],
  moss: ['#d9d4b5', '#9bb59b', '#c5b38b'],
  stone: ['#ddd4c4', '#aaa99c', '#c9b58a'],
  harbor: ['#ddcba8', '#a1c1bf', '#d1b29d'],
  tideworks: ['#d5c9ac', '#9ab6b9', '#d6c18c'],
  volt: ['#e4d6b6', '#b0c3b9', '#c4a579'],
  wind: ['#e3e0cd', '#b6c7c8', '#bda58c'],
  furnace: ['#e4d0b9', '#bca49a', '#d9b383'],
  lake: ['#e4ddc7', '#b1c9c2', '#c2b3c7'],
  star: ['#e1d9c6', '#b4b6cc', '#c9b589'],
  league: ['#ede1c5', '#b7c5bc', '#d1b17b'],
};
function roomInfo(map: MapId) {
  const data = MAPS[map];
  const room = data.interior;
  if (!room) return null;
  const ids = data.npcs.map((npc) => npc.id).join(' ');
  let purpose: string = room.style ?? room.kind;
  if (/professor|researcher|rubbingScholar/.test(ids)) purpose = 'research';
  else if (/cargoManifest/.test(ids)) purpose = 'warehouse';
  else if (/harborMaster|oldLighthouse|lensCase/.test(ids)) purpose = 'navigation';
  else if (/powerEngineer|toolMaker|mineForeman/.test(ids)) purpose = 'engineering';
  else if (/windScientist|migrationKeeper/.test(ids)) purpose = 'weather';
  else if (/memoryPainter/.test(ids)) purpose = 'atelier';
  else if (/springKeeper/.test(ids)) purpose = 'spa';
  else if (/kiteChild/.test(ids)) purpose = 'kite';
  const seed = [...map].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return { room, purpose, seed, colors: palettes[room.exterior] ?? palettes.dawn! };
}

/** Regional materials and purpose-specific, flush floor plans replace a shared central rug. */
export function interiorFloor(map: MapId) {
  const info = roomInfo(map);
  if (!info) return '';
  const { width, height } = mapSize(map);
  const {
    purpose,
    colors: [base, accent, trim],
    seed,
    room,
  } = info;
  let art = rect(31, 31, width - 62, height - 62, base, 0);
  const wood = ['home', 'teahouse', 'bakery', 'warehouse', 'kite'].includes(purpose);
  if (wood) {
    for (let y = 32; y < height - 32; y += 16) {
      art += path(`M32 ${y}H${width - 32}`, 'none', 'opacity=".22"');
      for (let x = 32 + ((y / 16 + seed) % 3) * 28; x < width - 32; x += 84)
        art += path(`M${x} ${y}v16`, 'none', 'opacity=".17"');
    }
  } else {
    for (let y = 32; y < height - 32; y += 32)
      for (let x = 32; x < width - 32; x += 32) {
        const patterned = (x / 32 + y / 32 + seed) % 4 === 0;
        art += `<rect x="${x + 1}" y="${y + 1}" width="30" height="30" rx="2" fill="${patterned ? accent : '#fff8e5'}" opacity="${patterned ? '.23' : '.12'}"/>`;
        art += path(`M${x} ${y + 32}V${y}h32`, 'none', 'opacity=".15"');
      }
  }
  const cx = width / 2;
  if (purpose === 'center') {
    art += rect(cx - 72, 196, 144, 113, '#e7eadc', 22);
    art += rect(cx - 64, 204, 128, 97, 'none', 18);
    art += path(`M${cx - 6} 225h12v17h17v12h-17v17h-12v-17h-17v-12h17Z`, accent);
    art += path(`M${cx - 47} 288h94`, 'none', 'opacity=".3"');
  } else if (purpose === 'research' || purpose === 'weather' || purpose === 'navigation') {
    // An observation dial is an inlaid floor surface, not a new stand in the aisle.
    art += oval(cx + 5, 246, 72, 61, '#ece5cf');
    art += oval(cx + 5, 246, 61, 51, 'none');
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const x = cx + 5 + Math.cos(a) * 55;
      const y = 246 + Math.sin(a) * 46;
      art += oval(x, y, 2, 2, accent);
    }
    art += path(`M${cx + 5} 198l12 48-12 46-12-46Z`, accent);
    art += path(`M${cx - 48} 246h106`, 'none', 'opacity=".35"');
    if (purpose === 'research')
      art += `<g transform="translate(${cx + 5},246)">${oval(0, 0, 25, 10, 'none')}${oval(0, 0, 10, 25, 'none')}${oval(0, 0, 5, 5, trim)}</g>`;
  } else if (purpose === 'lobby' || room.exterior === 'league') {
    art += rect(cx - 45, 176, 90, height - 212, accent, 1);
    art += rect(cx - 39, 181, 78, height - 222, 'none', 1);
    for (let y = 209; y < height - 60; y += 42)
      art += path(`M${cx} ${y - 12}l12 12-12 12-12-12Z`, '#ead7a7');
  } else if (purpose === 'greenhouse') {
    // Drainage seams and a leaf mosaic distinguish a working conservatory.
    for (const x of [150, 288]) art += path(`M${x} 110v210`, 'none', 'opacity=".3"');
    art += oval(cx, 244, 55, 43, '#cbd5b3');
    art += path(`M${cx - 28} 260q-6-45 55-47-2 47-55 47Zm0 0 42-35`, accent);
  } else if (purpose === 'engineering' || purpose === 'workshop') {
    art += rect(158, 208, 126, 92, '#d6c5a4', 3);
    for (const x of [165, 274])
      for (let y = 216; y < 290; y += 13) art += path(`M${x} ${y}l6 6`, 'none', 'opacity=".38"');
    art += oval(cx, 254, 23, 23, accent);
    art += oval(cx, 254, 12, 12, base);
    for (let i = 0; i < 8; i++)
      art += `<g transform="translate(${cx},254) rotate(${i * 45})">${rect(-3, -31, 6, 9, accent, 1)}</g>`;
  } else if (purpose === 'library') {
    art += rect(128, 112, 190, 82, accent, 12);
    art += rect(135, 119, 176, 68, 'none', 8);
    art += path('M199 140q13-8 25 1 13-9 26-1v31q-13-8-26 0-12-8-25 0Zm25 1v30', '#eee6cc');
    art += rect(160, 272, 128, 33, trim, 6);
  } else {
    const round = ['teahouse', 'spa', 'atelier'].includes(purpose);
    const offset = ((seed % 3) - 1) * 8;
    art += round
      ? oval(cx + offset, 244, 65, 49, accent)
      : rect(cx - 66 + offset, 208, 132, 91, accent, 8);
    art += round
      ? oval(cx + offset, 244, 56, 40, 'none')
      : rect(cx - 58 + offset, 216, 116, 75, 'none', 5);
    if (purpose === 'spa')
      art += path(`M${cx - 30} 236q15-10 30 0t30 0m-60 14q15-10 30 0t30 0`, 'none', 'opacity=".5"');
    else
      for (let i = -2; i <= 2; i++)
        art += path(`M${cx + offset + i * 19} 236l8 8-8 8-8-8Z`, trim, 'opacity=".65"');
  }
  // Households choose their own woven border rather than sharing one stock carpet.
  if (purpose === 'home') {
    const bands = 2 + ((seed >>> 9) % 4);
    for (let i = 0; i < bands; i++)
      art += path(`M${cx - 48 + i * 12} 225v52`, 'none', 'opacity=".18"');
  }
  // Four regional border inlays vary independently of the room's purpose.
  for (const x of [49, width - 49]) {
    const spacing = room.exterior === 'volt' ? 30 : room.exterior === 'wind' ? 48 : 40;
    for (let y = 108 + (seed % 11); y < height - 58; y += spacing)
      art += path(`M${x - 4} ${y}l4-6 4 6-4 6Z`, trim, 'opacity=".55"');
  }
  return `<g data-interior-floor="${map}">${art}</g>`;
}

function fixture(purpose: string, variant: number, accent: string, trim: string) {
  let art = rect(2, 4, 28, 26, '#c7b291', 3);
  if (purpose === 'research') {
    art = rect(2, 21, 28, 9, '#d8ccb0');
    if (variant % 2) {
      art += path('M8 24h17M13 23v-5q13 0 9-10l-6-4-4 5 7 4', 'none');
      art += rect(11, 3, 8, 6, accent);
      art += oval(19, 24, 5, 2, '#f5ead1');
    } else {
      art += path('M7 5h7v8L3 24q0 4 14 0L12 13V5', '#bed4cd');
      art += path('M5 20h10l2 4H3Z', accent);
      art += rect(21, 7, 6, 17, '#e7d7b0');
      art += path('M22 17h4m-4-4h4');
    }
  } else if (purpose === 'warehouse') {
    art = rect(2, 3, 28, 27, '#c9af86');
    art += path('M4 5l24 23M28 5 4 28M16 4v24', 'none');
    art += rect(9, 9, 14, 10, '#f0e0b9');
    art += path('M12 16h8m-4-4v7');
  } else if (purpose === 'navigation' || purpose === 'weather') {
    art = rect(2, 21, 28, 9, '#c9b28d');
    art += path('M16 24V8m-8 16 8-5 8 5');
    art += oval(16, 11, 11, 9, '#e6d4a9');
    art += oval(16, 11, 8, 6, accent);
    art += path(purpose === 'weather' ? 'M16 11l5-4M4 4h24' : 'M11 14l10-6m-8-1 6 9');
  } else if (purpose === 'engineering' || purpose === 'workshop') {
    art = rect(2, 17, 28, 13, '#c8ae87');
    art += rect(1, 14, 30, 6, '#e1c9a1');
    art += oval(10, 10, 7, 7, accent) + oval(10, 10, 3, 3, '#eee0c1');
    art += path('M23 4v17m-4-12 8-2m-6 19h4');
  } else if (purpose === 'atelier' || purpose === 'kite') {
    art = path('M7 30 14 3h4l8 27M9 24h15', 'none');
    art +=
      purpose === 'kite'
        ? path('M16 4 28 13 16 23 4 13Z M4 13h24M16 4v24l4 3', accent)
        : rect(5, 6, 23, 18, '#f6eacf');
    if (purpose === 'atelier')
      art += path('M7 20 12 12l5 6 5-7 4 9Z', accent) + oval(22, 10, 2, 2, trim);
  } else if (purpose === 'spa') {
    art = oval(16, 23, 14, 7, '#c7b08d') + oval(16, 20, 13, 6, accent);
    art += path('M9 13q-5-5 0-10m8 10q-5-5 0-10m8 10q-5-5 0-10');
  } else if (purpose === 'lobby') {
    art = rect(5, 25, 22, 5, '#d6c29c');
    art += path('M10 3h12v10q-6 9-12 0ZM10 6Q-1 4 6 14h5m11-8q11-2 4 8h-5M16 17v8', '#e5c68c');
    art += rect(10, 23, 12, 3, trim);
  } else if (purpose === 'library' || purpose === 'guild') {
    art += rect(4, 7, 24, 19, '#ad9476');
    for (let i = 0; i < 5; i++)
      art += rect(5 + i * 4.4, 9 + ((i + variant) % 3), 3.5, 14, i % 2 ? accent : trim, 0.6);
    art += path('M3 26h26');
  } else if (purpose === 'greenhouse') {
    art = rect(2, 23, 28, 7, '#c7ad85');
    for (const x of [8, 23]) {
      art += path(`M${x} 25V8m0 9q-11-1-7-9 7 0 7 9m0-3q10-3 7-10-7 2-7 10`, accent);
      if (variant % 3 === 0) art += oval(x, 7, 3, 3, trim);
    }
  } else if (purpose === 'center') {
    art = rect(2, 3, 28, 27, '#e2e7d9', 5);
    art += rect(5, 6, 22, 8, accent, 2);
    art += path('M12 19h8v7h-8Z', '#d8ae9a');
    art += path('M16 18v9m-5-4h10', 'none');
  } else if (purpose === 'shop') {
    for (const y of [11, 23])
      for (let i = 0; i < 3; i++) {
        art += rect(5 + i * 8, y - 5, 6, 9, (i + variant) % 2 ? accent : trim, 1);
        art += rect(6 + i * 8, y - 6, 4, 2, '#f1e6ca', 0.5);
      }
    art += path('M3 16h26m-26 12h26');
  } else if (purpose === 'bakery') {
    if (variant % 2) {
      art = rect(2, 2, 28, 28, '#c8a68b', 5);
      art += path('M7 25V16q9-13 18 0v9Z', '#8e7962');
      art += oval(16, 23, 6, 3, '#e6bd78');
    } else
      for (const x of [9, 23])
        for (const y of [13, 24])
          art += oval(x, y, 5, 3, '#dfb474') + path(`M${x - 1} ${y - 2}l-1 3`);
  } else if (purpose === 'teahouse') {
    art = oval(16, 20, 14, 10, '#c6ad87') + oval(16, 17, 13, 9, '#ebd7b0');
    art += path('M6 12h8v6q-4 4-8 0Zm8 2q7-2 4 4h-4', accent);
    art += oval(23, 18, 4, 3, trim);
  } else if (variant % 2) {
    art = rect(2, 3, 28, 27, '#c4ad88', 4);
    art += rect(4, 6, 24, 21, accent, 3) + rect(5, 7, 22, 6, '#fff3dc', 3);
    art += path('M5 21h22', 'none');
  } else {
    art += rect(4, 7, 24, 4, '#ead8b2');
    art += oval(11, 20, 6, 4, accent) + rect(21, 14, 5, 12, trim, 1);
  }
  return art;
}

/** Replace only existing furniture tiles; regional wall exhibits stay inside the north wall. */
export function interiorFixtures(map: MapId) {
  const info = roomInfo(map);
  if (!info) return '';
  const {
    purpose,
    seed,
    colors: [, accent, trim],
    room,
  } = info;
  const data = MAPS[map];
  const { width } = mapSize(map);
  let art = '';
  data.rows.forEach((row, y) =>
    [...row].forEach((tile, x) => {
      if (tile === 'F')
        art += `<g transform="translate(${x * 32},${y * 32})">${fixture(purpose, x + y + seed, accent, trim)}</g>`;
    }),
  );
  // An asymmetrical wall display makes same-purpose rooms genuinely different in each region.
  const panels = 2 + (seed % 3);
  for (let i = 0; i < panels; i++) {
    const x = 76 + (i * (width - 152)) / Math.max(1, panels - 1);
    art += rect(x - 19, 5, 38, 22, trim, 2);
    art += rect(x - 16, 8, 32, 16, '#f4e7ca', 1);
    if (room.exterior === 'volt') art += path(`M${x - 11} 16h7v-5h8v10h7`, 'none');
    else if (room.exterior === 'wind') art += path(`M${x - 12} 21l8-11 9 11m-4-5 8-6`, accent);
    else if (room.exterior === 'furnace') art += path(`M${x - 10} 22l9-13 12 13Z`, accent);
    else if (room.exterior === 'lake' || room.exterior === 'harbor')
      art += path(`M${x - 12} 14q6-5 12 0t12 0m-24 7q6-5 12 0t12 0`, 'none');
    else if (room.exterior === 'star' || room.exterior === 'league')
      art += path(`M${x} 9l3 5 7 1-5 4 1 4-6-2-6 2 1-4-5-4 7-1Z`, accent);
    else art += path(`M${x - 7} 22q-7-14 13-13 4 13-13 13Zm0 0 10-10`, accent);
  }
  return `<g data-interior-fixtures="${map}">${art}</g>`;
}
