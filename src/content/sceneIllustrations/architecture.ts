import { MAPS, mapSize } from '../world';
import { battleTheme } from '../battleScenes';
import { isIndoor } from '../../game/environment';
import type { MapId } from '../../game/model';
import { sceneSprite, type SceneSpriteSources } from './sprites';

const ink = '#75644f',
  cream = '#fff4da',
  wood = '#be9872';
const outline = `stroke="${ink}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
const r = (x: number, y: number, w: number, h: number, fill: string, rx = 4) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${outline}/>`;
const p = (d: string, fill = 'none', extra = '') =>
  `<path d="${d}" fill="${fill}" ${extra.includes('stroke=') ? '' : outline} ${extra}/>`;
const e = (x: number, y: number, rx: number, ry: number, fill: string, extra = '') =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra.includes('stroke=') ? '' : outline} ${extra}/>`;
const group = (x: number, y: number, art: string) =>
  `<g transform="translate(${x},${y})">${art}</g>`;
type Patch = {
  x: number;
  y: number;
  w: number;
  h: number;
  cells: [number, number][];
  rim: boolean;
};
function patches(map: MapId, accept: (tile: string) => boolean): Patch[] {
  const rows = MAPS[map].rows,
    seen = new Set<string>(),
    result: Patch[] = [];
  rows.forEach((row, y) =>
    [...row].forEach((tile, x) => {
      if (!accept(tile) || seen.has(`${x},${y}`)) return;
      const stack: [number, number][] = [[x, y]],
        cells: [number, number][] = [];
      while (stack.length) {
        const [xx, yy] = stack.pop()!,
          key = `${xx},${yy}`;
        if (seen.has(key) || !accept(rows[yy]?.[xx] ?? '')) continue;
        seen.add(key);
        cells.push([xx, yy]);
        stack.push([xx - 1, yy], [xx + 1, yy], [xx, yy - 1], [xx, yy + 1]);
      }
      const left = Math.min(...cells.map((c) => c[0])),
        top = Math.min(...cells.map((c) => c[1]));
      result.push({
        x: left * 32,
        y: top * 32,
        w: (Math.max(...cells.map((c) => c[0])) - left + 1) * 32,
        h: (Math.max(...cells.map((c) => c[1])) - top + 1) * 32,
        cells,
        rim: cells.some(
          ([xx, yy]) => xx === 0 || yy === 0 || xx === row.length - 1 || yy === rows.length - 1,
        ),
      });
    }),
  );
  return result;
}
function clip(id: string, cells: [number, number][]) {
  return `<clipPath id="${id}">${cells.map(([x, y]) => `<rect x="${x * 32}" y="${y * 32}" width="32" height="32"/>`).join('')}</clipPath>`;
}
function plant(x: number, y: number, s = 1) {
  return `<g transform="translate(${x},${y}) scale(${s})">${e(0, 19, 17, 4, '#c8bea0', 'stroke="none"')}${p('M-12 3h24l-3 16H-9Z', '#d5b08c')}${e(0, 3, 12, 3, '#e7c69f')}${p('M0 2v-19m0 12q-18-1-15-15 14-1 15 15m0-4q3-17 17-17 4 15-17 17m-2 6q-17 7-20-3 13-7 20 3m4-2q17 8 20-4-13-7-20 4', '#a9bf91')}${p('M0-8 11-11m-12 7-12-6', 'none', 'stroke="#dbe5b9" stroke-width="2"')}</g>`;
}
function lamp(x: number, y: number) {
  return group(
    x,
    y,
    e(0, 8, 17, 6, '#dec8a2', 'stroke="none" opacity=".28"') +
      r(-3, -4, 6, 14, wood) +
      r(-9, -20, 18, 20, '#eed299', 5) +
      p('M-12-20 0-28l12 8Z', '#b8bba6') +
      p('M0-18v15', 'none', 'stroke="#fff7db" stroke-width="3"'),
  );
}

type Furnishing =
  | 'reactor'
  | 'generator'
  | 'kiln'
  | 'shelves'
  | 'observatory'
  | 'greenhouse'
  | 'cloister'
  | 'bells';
function furnishing(sources: SceneSpriteSources, kind: Furnishing, w: number, h: number): string {
  if (kind !== 'bells') return sceneSprite(sources, kind, 0, 0, w, h);
  // Wind chimes remain a small physical timber frame, rather than a floating wind emblem.
  const left = 8,
    mid = w / 2;
  let art =
    r(left, h - 20, w - 16, 12, '#c2ad8a', 4) +
    p(
      `M${left + 10} ${h - 22}V18h${w - 36}v${h - 40}`,
      'none',
      'stroke="#a98a68" stroke-width="6"',
    );
  for (let i = 0; i < 3; i++) {
    const x = mid + (i - 1) * Math.max(12, (w - 56) / 2),
      y = 34 + i * 9;
    art +=
      p(`M${x} 20v${y - 20}`) +
      p(`M${x - 8} ${y + 7}q8-18 16 0v20h-16Z`, i % 2 ? '#a9c4bc' : '#dcc08a') +
      p(`M${x} ${y + 28}v8m-10-10h20`);
  }
  return art;
}
function style(map: MapId): Furnishing {
  if (map === 'mirrorArchive') return 'shelves';
  if (map === 'windObservatory') return 'observatory';
  const theme = battleTheme(map);
  return theme === 'electric'
    ? 'generator'
    : theme === 'furnace'
      ? 'kiln'
      : theme === 'star'
        ? 'reactor'
        : theme === 'wind'
          ? 'bells'
          : theme === 'meadow'
            ? 'greenhouse'
            : 'cloister';
}

export const hasArchitecturalScene = (map: MapId) => isIndoor(map) && !MAPS[map].interior;

/** A material floor and a few intentional architectural zones replace repeated target stamps. */
export function architecturalFloor(map: MapId) {
  if (!hasArchitecturalScene(map)) return '';
  const { width, height } = mapSize(map),
    theme = battleTheme(map),
    rows = MAPS[map].rows;
  const cells: [number, number][] = [];
  rows.forEach((row, y) =>
    [...row].forEach((t, x) => {
      if (':.g^='.includes(t)) cells.push([x, y]);
    }),
  );
  const id = `floor-${map}`;
  let a = clip(id, cells) + `<g clip-path="url(#${id})">`;
  const cave = map === 'mine' || map === 'mineDepths';
  const floor = cave
    ? '#d9cfb6'
    : theme === 'furnace'
      ? '#dcc6aa'
      : theme === 'wind'
        ? '#e1dfc9'
        : theme === 'star'
          ? '#dfddc8'
          : '#e4deca';
  a += r(0, 0, width, height, floor, 0);
  for (let y = 32; y < height; y += cave ? 70 : 64)
    for (let x = 20 + (Math.floor(y / 64) % 2) * 42; x < width; x += 88) {
      const seed = (x * 13 + y * 7) % 17;
      if (cave) {
        a += e(
          x + 36,
          y + 27,
          39,
          17,
          seed < 6 ? '#d3c7ac' : '#e1d5bb',
          'stroke="none" opacity=".35"',
        );
      } else {
        a += `<rect x="${x + 2}" y="${y + 2}" width="82" height="58" rx="6" fill="${seed < 6 ? '#e9e2ce' : seed < 11 ? '#e0d7c0' : floor}" stroke="#c7bea5" stroke-width=".6"/>`;
      }
      if (seed % 3 === 0)
        a += p(
          `M${x + 12} ${y + 15}h22m17 31h12`,
          'none',
          'stroke="#f6ecd5" stroke-width="2" opacity=".6"',
        );
    }
  if (!cave) {
    const cx = width / 2,
      runner = Math.min(width * 0.23, 210),
      color =
        theme === 'furnace'
          ? '#bca68c'
          : theme === 'star'
            ? '#aebfb3'
            : theme === 'lake'
              ? '#b3c9c2'
              : theme === 'wind'
                ? '#c2c8b0'
                : '#c6b292';
    a +=
      r(cx - runner / 2, 34, runner, height - 68, color, 7) +
      `<rect x="${cx - runner / 2 + 8}" y="40" width="${runner - 16}" height="${height - 80}" rx="4" fill="none" stroke="#e6dfc4" stroke-width="2"/>`;
    // One court per real room, with stitched borders and a visible centre line.
    if (/Gym$/.test(map) || map === 'gym' || map === 'leagueHall') {
      const bands = [
        0,
        ...rows.flatMap((row, y) =>
          row.split('').filter((t) => t === '#').length > row.length * 0.55 &&
          y > 0 &&
          y < rows.length - 1
            ? [y * 32]
            : [],
        ),
        height - 32,
      ].filter((v, i, a) => !i || v - a[i - 1]! > 32);
      for (let i = 0; i < bands.length - 1; i++) {
        const top = bands[i]! + 52,
          h = bands[i + 1]! - top - 22;
        if (h < 80) continue;
        const x = width * 0.19,
          w = width * 0.62;
        a += r(
          x,
          top,
          w,
          h,
          theme === 'furnace'
            ? '#c4af93'
            : theme === 'wind'
              ? '#bdcbb7'
              : theme === 'lake'
                ? '#b8ccc6'
                : '#c5d0ba',
          12,
        );
        a +=
          r(x + 10, top + 10, w - 20, h - 20, 'none', 8) +
          p(`M${x + 12} ${top + h / 2}h${w - 24}`, 'none', 'stroke="#f5ecd3" stroke-width="3"');
        a += e(
          cx,
          top + h / 2,
          Math.min(54, w * 0.14),
          Math.min(37, h * 0.25),
          'none',
          'stroke="#f3e9cc" stroke-width="3"',
        );
        for (const side of [-1, 1])
          a += p(
            `M${cx + side * (w / 2 - 24)} ${top + 24}v${h - 48}`,
            'none',
            'stroke="#a2b29c" stroke-width="2" stroke-dasharray="5 7"',
          );
      }
    } else {
      for (const side of [-1, 1])
        a += p(
          `M${cx + side * (runner / 2 + 25)} 65V${height - 65}`,
          'none',
          'stroke="#c8bea0" stroke-width="2"',
        );
      if (map === 'starCore') {
        for (const y of [height * 0.24, height * 0.53, height * 0.78])
          a +=
            p(
              `M${width * 0.12} ${y}h${width * 0.76}`,
              'none',
              'stroke="#b9ad8d" stroke-width="8"',
            ) +
            p(`M${width * 0.12} ${y}h${width * 0.76}`, 'none', 'stroke="#eee0b4" stroke-width="3"');
      }
      if (map === 'hallOfFame')
        a +=
          r(width * 0.21, height * 0.18, width * 0.58, height * 0.64, '#cbbb95', 18) +
          r(
            width * 0.21 + 12,
            height * 0.18 + 12,
            width * 0.58 - 24,
            height * 0.64 - 24,
            'none',
            12,
          );
    }
  }
  // Tiny natural wear follows the slabs rather than the logical collision grid.
  for (let i = 0; i < Math.floor((width * height) / 22000); i++) {
    const x = 40 + ((i * 181) % (width - 80)),
      y = 40 + ((i * 137) % (height - 80));
    a += p(`M${x} ${y}l8 2 5-3`, 'none', 'stroke="#b9ad91" stroke-width="1" opacity=".4"');
  }
  return `<g data-architectural-floor="${map}">${a}</g></g>`;
}

/** Render connected solid footprints as full furniture banks, never stamp one emblem per tile. */
export function architecturalFixtures(map: MapId, sources: SceneSpriteSources) {
  if (!hasArchitecturalScene(map)) return '';
  const rows = MAPS[map].rows,
    theme = battleTheme(map),
    kind = style(map),
    cave = map === 'mine' || map === 'mineDepths';
  let a = '';
  if (cave) {
    const solids = rows.flatMap((row, y) =>
      [...row].flatMap((t, x) => (t === '#' ? [[x, y] as [number, number]] : [])),
    );
    const id = `cliffs-${map}`;
    a += clip(id, solids) + `<g clip-path="url(#${id})">`;
    const { width, height } = mapSize(map);
    a += r(0, 0, width, height, '#b7ad94', 0);
    for (let y = 4; y < height; y += 26)
      a += p(
        `M0 ${y} Q${width * 0.2} ${y - 13} ${width * 0.45} ${y + 2} T${width} ${y - 4}`,
        'none',
        'stroke="#dfd0ae" stroke-width="3"',
      );
    for (let x = 13; x < width; x += 67)
      a += p(
        `M${x} 0l-9 22 6 19-4 19m-7 ${height - 72}l7-18-4-16`,
        'none',
        'stroke="#978b71" stroke-width="1.3"',
      );
    a += '</g>';
  } else
    rows.forEach((row, y) =>
      [...row].forEach((tile, x) => {
        if (tile !== '#') return;
        const xx = x * 32,
          yy = y * 32;
        const color = theme === 'furnace' ? '#b49c83' : theme === 'star' ? '#a9b6a6' : '#b6bba5';
        a +=
          `<rect x="${xx}" y="${yy}" width="32" height="32" fill="${color}"/>` +
          p(`M${xx} ${yy + 12}h32m-18-12v12m8 0v19`, 'none', 'stroke="#dcd5b9" stroke-width="1.5"');
        if (rows[y + 1]?.[x] !== '#')
          a +=
            p(`M${xx} ${yy + 29}h32`, 'none', 'stroke="#8f846c" stroke-width="5"') +
            p(`M${xx} ${yy + 25}h32`, 'none', 'stroke="#e5dab9" stroke-width="2"');
        if (y === 0 && x > 1 && x < row.length - 2 && x % 5 === 2) {
          a +=
            p(`M${xx + 2} ${yy + 27}V12q14-22 28 0v15Z`, '#a9c7c3') +
            p(`M${xx + 16} ${yy + 4}v22m-12-10h24`, 'none', 'stroke="#f5e8c8" stroke-width="2"');
        }
      }),
    );
  for (const block of patches(map, (t) => t === '#')) {
    if (block.rim || cave) continue;
    if (block.cells.length !== (block.w * block.h) / 1024 || block.w < 64 || block.h < 64) continue;
    // A single continuous plinth, pipes and cabinets give even long banks a readable silhouette.
    a += group(
      block.x,
      block.y,
      r(3, 5, block.w - 6, block.h - 9, kind === 'shelves' ? '#bc9f7b' : '#c6bda4', 8) +
        p(`M8 12h${block.w - 16}m0 ${block.h - 28}H8`, 'none', 'stroke="#f0dfb8" stroke-width="3"'),
    );
    const count = Math.max(1, Math.floor(block.h / Math.max(150, block.w * 1.15))),
      unit = block.h / count;
    for (let i = 0; i < count; i++)
      a += group(
        block.x + 4,
        block.y + i * unit + 3,
        furnishing(
          sources,
          kind === 'reactor' && block.x > rows[0]!.length * 16 ? 'generator' : kind,
          block.w - 8,
          unit - 6,
        ),
      );
    if (kind === 'reactor' || kind === 'generator')
      a += p(
        `M${block.x + 9} ${block.y + 20}v${block.h - 38}`,
        'none',
        'stroke="#9e8765" stroke-width="5"',
      );
  }
  // Architectural displays stand on existing wall ledges. Only their drawn height projects
  // behind the solid base, like the existing tree canopies; no extra floor blockers are added.
  if (!cave) {
    const banks = new Set(
      patches(map, (t) => t === '#')
        .filter(
          (block) =>
            !block.rim &&
            block.w >= 64 &&
            block.h >= 64 &&
            block.cells.length === (block.w * block.h) / 1024,
        )
        .flatMap((block) => block.cells.map(([x, y]) => `${x},${y}`)),
    );
    const displayKind = map === 'hallOfFame' ? 'shelves' : kind === 'bells' ? 'observatory' : kind;
    rows.forEach((row, y) => {
      if (y === 0) return;
      for (let x = 2; x < row.length - 5; x += 8) {
        if (![0, 1, 2, 3].every((dx) => row[x + dx] === '#' && !banks.has(`${x + dx},${y}`)))
          continue;
        if (![0, 1, 2, 3].some((dx) => rows[y - 1]?.[x + dx] !== '#')) continue;
        // Leave authored NPCs and portal approaches unobscured.
        const occupied = [...MAPS[map].npcs, ...MAPS[map].portals];
        if (occupied.some((npc) => Math.abs(npc.x - x - 1.5) < 3.5 && Math.abs(npc.y - y) < 3))
          continue;
        const baseX = x * 32 + 6,
          baseY = y * 32;
        a += `<g data-wall-display="${x},${y},4">${sceneSprite(sources, displayKind === 'reactor' ? 'cloister' : displayKind, baseX, baseY - 70, 116, 97)}</g>`;
      }
    });
  }
  // Wall-mounted lanterns, planters and records have physical supports and readable scale.
  rows.forEach((row, y) =>
    [...row].forEach((tile, x) => {
      if (
        tile !== '#' ||
        rows[y + 1]?.[x] === '#' ||
        x < 2 ||
        x >= row.length - 2 ||
        (y > 0 && y < rows.length - 1 && !rows[y]!.startsWith('#'.repeat(x + 1)))
      )
        return;
      const yy = y * 32,
        xx = x * 32;
      if (x % 7 === 2) a += lamp(xx + 16, yy + 18);
      else if (x % 11 === 4 && !cave)
        a += group(
          xx + 3,
          yy + 1,
          r(0, 1, 26, 25, wood, 3) +
            r(4, 5, 18, 14, cream, 2) +
            p('M8 10h10m-10 5h7', 'none', 'stroke="#bba37d" stroke-width="1.4"'),
        );
      if (x % 13 === 6 && (y === 0 || y === rows.length - 1) && !cave)
        a += plant(xx + 16, yy + 12, 0.65);
    }),
  );
  if (cave) a += landscapeFixtures(map, sources);
  return `<g data-furnished-scene="${map}">${a}</g>`;
}

/** Continuous ripples, stone banks and underwater shelves replace square pools of repeated dashes. */
export function illustratedWaterDepth(map: MapId, shore: string) {
  if (MAPS[map].interior) return '';
  const theme = battleTheme(map);
  let a = `<defs><clipPath id="water-shore-${map}"><path d="${shore}" fill-rule="evenodd"/></clipPath></defs><g clip-path="url(#water-shore-${map})">`;
  const waterPatches = patches(map, (t) => t === '~' || t === 'W' || t === 'L');
  waterPatches.forEach((patch, i) => {
    const id = `basin-${map}-${i}`,
      lava = MAPS[map].rows[patch.cells[0]![1]]![patch.cells[0]![0]] === 'L';
    a += clip(id, patch.cells) + `<g clip-path="url(#${id})">`;
    a += p(
      `M${patch.x} ${patch.y + 8}q${patch.w * 0.3} ${Math.min(38, patch.h * 0.2)} ${patch.w} 9v${Math.max(1, patch.h - 12)}H${patch.x}Z`,
      lava ? '#dbb37d' : '#b2cfca',
      'stroke="none"',
    );
    a += p(
      `M${patch.x} ${patch.y + patch.h * 0.6}q${patch.w * 0.4} ${-patch.h * 0.2} ${patch.w} ${-patch.h * 0.15}v${patch.h * 0.6}H${patch.x}Z`,
      lava ? '#d3a370' : '#9dbebc',
      'stroke="none" opacity=".42"',
    );
    for (let y = patch.y + 23; y < patch.y + patch.h; y += 37)
      for (
        let x = patch.x + 12 + (Math.floor(y / 37) % 3) * 15;
        x < patch.x + patch.w - 12;
        x += 78
      )
        a += p(
          `M${x} ${y}q12 5 28 0m11 8 16-1`,
          'none',
          `stroke="${lava ? '#ffe2ad' : '#e7eee1'}" stroke-width="1.7" opacity=".75"`,
        );
    if (!lava && patch.w > 90 && patch.h > 90) {
      for (let j = 0; j < Math.min(8, Math.floor((patch.w * patch.h) / 14000)); j++) {
        const x = patch.x + 18 + ((j * 79) % (patch.w - 36)),
          y = patch.y + 24 + ((j * 103) % (patch.h - 48));
        a +=
          e(x, y, 12, 4, '#9cb7aa', 'stroke="#c0d1bd" stroke-width="1"') +
          p(
            `M${x - 3} ${y}q-6-14 3-18 6 12-3 18Z`,
            theme === 'lake' ? '#b4c7a0' : '#a0bc9b',
            'stroke="#849e84" stroke-width=".8"',
          );
      }
    }
    a += '</g>';
    if (hasArchitecturalScene(map) && patch.w > 64)
      a +=
        p(
          `M${patch.x + 6} ${patch.y - 1}h${patch.w - 12}m0 ${patch.h + 2}H${patch.x + 6}`,
          'none',
          'stroke="#a79575" stroke-width="5"',
        ) +
        p(
          `M${patch.x + 6} ${patch.y - 3}h${patch.w - 12}`,
          'none',
          'stroke="#f1dfb9" stroke-width="2"',
        );
  });
  return `<g data-illustrated-water="${map}">${a}</g></g>`;
}

type LandscapeProp = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'rocks' | 'grove' | 'cloister';
  rise: number;
};
function landscapePlan(map: MapId): LandscapeProp[] {
  if (MAPS[map].interior || (isIndoor(map) && map !== 'mine' && map !== 'mineDepths')) return [];
  const rows = MAPS[map].rows,
    theme = battleTheme(map),
    used = new Set<string>(),
    result: LandscapeProp[] = [];
  const rocky =
    ['mine', 'mineDepths'].includes(map) || ['highlands', 'furnace', 'coast'].includes(theme);
  const kind = map === 'mirrorRuins' ? 'cloister' : rocky ? 'rocks' : 'grove';
  const free = (x: number, y: number, w: number, h: number) =>
    Array.from({ length: h }, (_, dy) =>
      Array.from(
        { length: w },
        (_, dx) => rows[y + dy]?.[x + dx] === '#' && !used.has(`${x + dx},${y + dy}`),
      ).every(Boolean),
    ).every(Boolean);
  const add = (x: number, y: number, w: number, h: number, rise: number) => {
    result.push({ x, y, w, h, kind, rise });
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) used.add(`${x + dx},${y + dy}`);
  };
  for (let y = 0; y < rows.length - 2; y++)
    for (let x = 0; x < rows[0]!.length - 3; x++) if (free(x, y, 4, 3)) add(x, y, 4, 3, 0);
  const occupied = [...MAPS[map].npcs, ...MAPS[map].portals];
  for (let y = 0; y < rows.length; y++)
    for (let x = 2; x < rows[0]!.length - 4; x += 5) {
      // Tree canopies rise behind their solid bases. The opening border trees already match
      // the reference and stay intact where a tall canopy would be cropped by the map edge.
      if (y === 0 && !rocky) continue;
      if (
        !free(x, y, 3, 1) ||
        ![0, 1, 2].some((dx) => rows[y - 1]?.[x + dx] !== '#' || rows[y + 1]?.[x + dx] !== '#')
      )
        continue;
      if (occupied.some((npc) => Math.abs(npc.x - x - 1) < 3 && Math.abs(npc.y - y) < 3)) continue;
      add(x, y, 3, 1, rocky ? 20 : 36);
    }
  return result;
}
export function landscapeCoveredCells(map: MapId) {
  return new Set(
    landscapePlan(map).flatMap((prop) =>
      Array.from({ length: prop.h }, (_, dy) =>
        Array.from({ length: prop.w }, (_, dx) => `${prop.x + dx},${prop.y + dy}`),
      ).flat(),
    ),
  );
}
/** Natural outcrops, groves and ruined garden walls use the existing solid footprints. */
export function landscapeFixtures(map: MapId, sources: SceneSpriteSources) {
  return `<g data-landscape-scene="${map}">${landscapePlan(map)
    .map(
      ({ x, y, w, h, kind, rise }) =>
        `<g ${rise ? 'data-edge-footprint' : 'data-solid-footprint'}="${x},${y},${w},${h}">${sceneSprite(sources, kind, x * 32, y * 32 - rise, w * 32, h * 32 + rise)}</g>`,
    )
    .join('')}</g>`;
}
