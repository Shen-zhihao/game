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
export interface BuildingEntrance {
  x: number;
  y: number;
  map: MapId;
  name: string;
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
        const doorX = gate?.x ?? Math.floor((left + right + 1) / 2);
        const doorY = bottom;
        const porchY = bottom + 1;
        // Only the landing tile is cleared; surrounding walls and water stay intact.
        outside.rows[porchY] =
          outside.rows[porchY]!.slice(0, doorX) + ':' + outside.rows[porchY]!.slice(doorX + 1);
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
          });
          continue;
        }
        const key = `${outside.id}_${left}_${top}`;
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
        (outside.entrances ??= []).push({ x: doorX, y: doorY, map: id, name });
      }
  }
}
