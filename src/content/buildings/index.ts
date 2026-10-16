import type { InteriorMapId, MapId, WorldMapId } from '../../game/model';
import type { GameMap, Npc } from '../world';

export type RoomKind = 'home' | 'center' | 'shop' | 'lobby';
export const ROOM_SITES = [
  'dawn_3_2',
  'dawn_15_2',
  'dawn_3_9',
  'moss_3_2',
  'moss_3_8',
  'moss_15_8',
  'stone_3_2',
  'stone_4_9',
  'stone_18_10',
  'harbor_2_2',
  'harbor_28_7',
  'harbor_4_10',
  'harbor_13_10',
  'harbor_2_18',
  'tideworks_2_2',
  'league_2_2',
  'league_13_2',
  'league_2_12',
  'league_29_22',
  'volt_2_2',
  'volt_19_10',
  'volt_3_11',
  'volt_29_19',
  'wind_3_2',
  'wind_3_12',
  'wind_7_12',
  'wind_22_19',
  'wind_2_22',
  'furnace_2_2',
  'furnace_2_12',
  'furnace_6_12',
  'furnace_24_21',
  'furnace_3_23',
  'lake_2_2',
  'lake_2_12',
  'lake_6_12',
  'lake_11_22',
  'lake_25_22',
  'star_3_2',
  'star_3_12',
  'star_26_22',
  'star_4_24',
] as const;
export interface BuildingDoorway {
  x: number;
  y: number;
  width: number;
  height: number;
  raster: boolean;
  windows: { x: number; y: number }[];
}
// Door leaves and windows are authored in source-image pixels, beside their building.
// The original closed door stays in the scene; only its own pixels animate on crossing.
const PAINTED_BUILDINGS: Record<
  string,
  {
    size: [number, number];
    doors: Record<string, [number, number, number, number, number, number, number]>;
  }
> = {
  dawn: {
    size: [1536, 1024],
    doors: {
      interior_dawn_3_2: [249, 206, 30, 42, 198, 330, 211],
      interior_dawn_15_2: [851, 206, 30, 42, 803, 930, 211],
      interior_dawn_3_9: [249, 560, 30, 42, 198, 330, 566],
    },
  },
  moss: {
    size: [1536, 1024],
    doors: {
      interior_moss_3_2: [264, 205, 29, 43, 205, 349, 210],
      gym: [902, 204, 35, 45, 827, 1013, 210],
      interior_moss_3_8: [262, 474, 31, 44, 205, 348, 478],
      interior_moss_15_8: [819, 475, 27, 42, 779, 875, 478],
    },
  },
  stone: {
    size: [1465, 1073],
    doors: {
      interior_stone_3_2: [252, 194, 31, 47, 175, 355, 194],
      rockGym: [985, 194, 32, 47, 859, 1142, 194],
      interior_stone_4_9: [273, 510, 29, 43, 211, 361, 508],
      interior_stone_18_10: [971, 560, 27, 43, 914, 1052, 562],
    },
  },
  harbor: {
    size: [1476, 1065],
    doors: {
      interior_harbor_2_2: [191, 168, 31, 47, 118, 292, 169],
      waterGym: [964, 168, 33, 47, 855, 1107, 170],
      interior_harbor_28_7: [1227, 352, 28, 47, 1169, 1310, 352],
      interior_harbor_4_10: [265, 453, 29, 47, 205, 350, 452],
      interior_harbor_13_10: [653, 452, 28, 47, 584, 748, 452],
      interior_harbor_2_18: [173, 741, 28, 47, 112, 259, 740],
    },
  },
  tideworks: {
    size: [1500, 1049],
    doors: {
      interior_tideworks_2_2: [193, 164, 27, 40, 127, 258, 166],
    },
  },
};
function buildingDoorway(
  outside: GameMap,
  destination: MapId,
  x: number,
  y: number,
): BuildingDoorway {
  const art = PAINTED_BUILDINGS[outside.id];
  const rect = art?.doors[destination];
  if (art && !rect) throw new Error(`缺少建筑门洞标定：${destination}`);
  if (art && rect) {
    const sx = (outside.rows[0]!.length * 32) / art.size[0];
    const sy = (outside.rows.length * 32) / art.size[1];
    return {
      x: rect[0] * sx,
      y: rect[1] * sy,
      width: rect[2] * sx,
      height: rect[3] * sy,
      raster: true,
      windows: [rect[4], rect[5]].map((wx) => ({ x: wx * sx, y: rect[6] * sy })),
    };
  }
  return {
    x: x * 32 + 8,
    y: y * 32 + 16,
    width: 16,
    height: 16,
    raster: false,
    windows: [-20, 20].map((dx) => ({ x: x * 32 + 16 + dx, y: y * 32 + 20 })),
  };
}
export interface BuildingEntrance {
  x: number;
  y: number;
  map: MapId;
  name: string;
  doorway: BuildingDoorway;
}
export const worldMapFor = (map: MapId): WorldMapId =>
  (map.startsWith('interior_') ? map.split('_')[1] : map) as WorldMapId;

// Residents and their story IDs move together, so quests keep the same checkpoints.
const RESIDENTS: Record<string, { name: string; ids: string[] }> = {
  dawn_3_2: { name: '旅人的家', ids: ['home'] },
  dawn_15_2: { name: '岚博士研究所', ids: ['professor', 'rival'] },
  moss_15_8: { name: '森林研究室', ids: ['researcher'] },
  stone_18_10: { name: '矿工之家', ids: ['mineForeman', 'retiredMiner'] },
  harbor_28_7: { name: '港口仓库', ids: ['cargoManifest'] },
  harbor_13_10: { name: '港务所', ids: ['harborMaster'] },
  harbor_2_18: { name: '青帆的家', ids: ['postkeeper'] },
  tideworks_2_2: { name: '旧灯塔检修室', ids: ['oldLighthouse', 'lensCase'] },
  volt_19_10: { name: '电桥事务所', ids: ['powerEngineer', 'lostClerk'] },
  volt_29_19: { name: '值班员休息室', ids: ['shiftClerk'] },
  wind_22_19: { name: '气象员的家', ids: ['windScientist', 'migrationKeeper'] },
  wind_2_22: { name: '风筝工坊', ids: ['kiteChild', 'pactKeeper'] },
  furnace_24_21: { name: '温泉休息所', ids: ['springKeeper'] },
  furnace_3_23: { name: '工匠之家', ids: ['toolMaker', 'oldForeman'] },
  lake_11_22: { name: '湖岸画室', ids: ['memoryPainter'] },
  lake_25_22: { name: '拓片研究室', ids: ['rubbingScholar'] },
};

function roomRows(kind: RoomKind): string[] {
  const cells: string[][] = Array.from({ length: 12 }, (_, y) =>
    Array.from({ length: 14 }, (_, x) => (x === 0 || x === 13 || y === 0 || y === 11 ? '#' : ':')),
  );
  // Shelves, beds and counters leave the central aisle and every NPC approachable.
  for (const [x, y] of kind === 'home'
    ? [
        [2, 2],
        [3, 2],
        [10, 2],
        [11, 2],
        [2, 7],
        [3, 7],
      ]
    : [
        [2, 2],
        [3, 2],
        [10, 2],
        [11, 2],
        [2, 8],
        [11, 8],
      ])
    cells[y!]![x!] = 'F';
  cells[10]![7] = 'E';
  cells[11]![7] = 'E';
  return cells.map((r) => r.join(''));
}

/** Install one real doorway for every connected painted building footprint. */
export function installBuildingInteriors(
  maps: Record<MapId, GameMap>,
  gyms: { town: MapId; map: MapId; gate: string; entrance: { x: number; y: number } }[],
): void {
  for (const outside of Object.values(maps)) {
    const visited = new Set<string>();
    const occupants = [...outside.npcs];
    for (let y = 0; y < outside.rows.length; y++)
      for (let x = 0; x < outside.rows[y]!.length; x++) {
        const tile = outside.rows[y]![x]!;
        if (!'HCSG'.includes(tile) || visited.has(`${x},${y}`)) continue;
        const queue: [number, number][] = [[x, y]];
        const cells: [number, number][] = [];
        while (queue.length) {
          const [xx, yy] = queue.pop()!;
          const key = `${xx},${yy}`;
          if (visited.has(key) || outside.rows[yy]?.[xx] !== tile) continue;
          visited.add(key);
          cells.push([xx, yy]);
          queue.push([xx - 1, yy], [xx + 1, yy], [xx, yy - 1], [xx, yy + 1]);
        }
        const left = Math.min(...cells.map(([xx]) => xx));
        const right = Math.max(...cells.map(([xx]) => xx));
        const bottom = Math.max(...cells.map(([, yy]) => yy));
        const top = Math.min(...cells.map(([, yy]) => yy));
        const gym = tile === 'G' ? gyms.find((g) => g.town === outside.id) : undefined;
        const gate = gym && occupants.find((n) => n.id === gym.gate);
        const key = `${outside.id}_${left}_${top}`;
        const destination = gym?.map ?? (`interior_${key}` as MapId);
        const visual = buildingDoorway(
          outside,
          destination,
          gate?.x ?? Math.floor((left + right + 1) / 2),
          bottom,
        );
        const doorX = visual.raster
          ? Math.floor((visual.x + visual.width / 2) / 32)
          : (gate?.x ?? Math.floor((left + right + 1) / 2));
        const doorY = visual.raster ? Math.round((visual.y + visual.height) / 32) - 1 : bottom;
        const porchY = doorY + 1;
        // An older collision footprint may extend below the painted threshold.
        // Connect its approach to the street, without moving the building or its room ID.
        for (let approachY = porchY; approachY <= Math.max(porchY, bottom + 1); approachY++) {
          outside.rows[approachY] =
            outside.rows[approachY]!.slice(0, doorX) +
            ':' +
            outside.rows[approachY]!.slice(doorX + 1);
        }
        if (gym) {
          outside.npcs = outside.npcs.filter((n) => n.id !== gym.gate);
          outside.portals.push({
            x: doorX,
            y: doorY,
            map: gym.map,
            toX: gym.entrance.x,
            toY: gym.entrance.y,
          });
          for (const exit of maps[gym.map].portals.filter((p) => p.map === outside.id))
            Object.assign(exit, { toX: doorX, toY: porchY });
          (outside.entrances ??= []).push({
            x: doorX,
            y: doorY,
            map: gym.map,
            name: maps[gym.map].name,
            doorway: visual,
          });
          continue;
        }
        if (!(ROOM_SITES as readonly string[]).includes(key)) throw new Error(`未登记建筑：${key}`);
        const id = `interior_${key}` as InteriorMapId;
        const kind: RoomKind =
          tile === 'C' ? 'center' : tile === 'S' ? 'shop' : tile === 'G' ? 'lobby' : 'home';
        const resident = RESIDENTS[key];
        let npcs: Npc[];
        if (kind === 'center' || kind === 'shop') {
          const role = kind === 'center' ? 'healer' : 'shop';
          const candidates = occupants.filter((n) => n.role === role && outside.npcs.includes(n));
          const nearest = candidates.sort(
            (a, b) =>
              Math.abs(a.x - doorX) +
              Math.abs(a.y - porchY) -
              Math.abs(b.x - doorX) -
              Math.abs(b.y - porchY),
          )[0];
          npcs = nearest
            ? [nearest]
            : [
                {
                  id: `${key}_${role}`,
                  x: 0,
                  y: 0,
                  role,
                  name: kind === 'center' ? '治疗员' : '补给商人',
                },
              ];
        } else {
          const ids = kind === 'lobby' ? ['leagueRegistrar'] : (resident?.ids ?? []);
          npcs = occupants.filter((n) => ids.includes(n.id));
        }
        outside.npcs = outside.npcs.filter((n) => !npcs.includes(n));
        npcs = npcs.map((n, i) => ({ ...n, x: 5 + i * 3, y: 4, patrol: undefined }));
        const name =
          resident?.name ??
          `${outside.name}${kind === 'center' ? '精灵中心' : kind === 'shop' ? '补给商店' : kind === 'lobby' ? '联盟接待大厅' : '民居'}`;
        if (!npcs.length)
          npcs.push({
            id: `${key}_resident`,
            x: 5,
            y: 4,
            role: 'resident',
            name: '居民',
            lines: [`欢迎来到${name}。旅途中记得常让伙伴休息，也去看看附近的居民有什么新消息。`],
          });
        maps[id] = {
          id,
          name,
          subtitle: '沿南侧门口离开，回到刚才的街道',
          interior: { exterior: outside.id, kind },
          rows: roomRows(kind),
          npcs,
          encounters: [],
          portals: [{ x: 7, y: 11, map: outside.id, toX: doorX, toY: porchY }],
        };
        outside.portals.push({ x: doorX, y: doorY, map: id, toX: 7, toY: 9 });
        (outside.entrances ??= []).push({ x: doorX, y: doorY, map: id, name, doorway: visual });
      }
  }
}
