import { habitatZones, landEncounters } from '../habitats';
import { Direction, MapId, StoryEvent, TownId, WorldMapId } from '../../game/model';
import { HIGHLAND_MAPS } from '../highlands';
import { COAST_MAPS } from '../coast';
import { expandCityDistricts, type CityScenery, type CityBuildingKind } from '../cityDistricts';
import {
  BuildingEntrance,
  installBuildingInteriors,
  InteriorCounter,
  RoomKind,
  worldMapFor,
} from '../buildings';
import {
  ADVENTURE_CHAPTERS,
  ADVENTURE_STORY_CONTENT,
  ADVENTURE_GYMS,
  ADVENTURE_MAPS,
  ADVENTURE_TRAINERS,
  adventureObjective,
} from '../adventure';

export interface Npc {
  artSpeciesId?: string;
  visibleWhen?: string[];
  hiddenWhen?: string[];
  id: string;
  x: number;
  y: number;
  name: string;
  role:
    | 'professor'
    | 'home'
    | 'distressedProfessor'
    | 'professorBag'
    | 'openingWild'
    | 'rival'
    | 'healer'
    | 'shop'
    | 'quest'
    | 'trainer'
    | 'leader'
    | 'sign'
    | 'resident'
    | 'clue'
    | 'log'
    | 'switch'
    | 'rescue'
    | 'chest'
    | 'gate'
    | 'echo'
    | 'rock'
    | 'mechanism'
    | 'discovery';
  patrol?: [number, number][];
  facing?: Direction;
  steps?: number;
  defeatedPosition?: [number, number];
  lines?: string[];
  event?: StoryEvent;
  color?: string;
}
export interface Encounter {
  speciesId: string;
  min: number;
  max: number;
  weight: number;
}
export interface GameMap {
  id: MapId;
  name: string;
  subtitle: string;
  rows: string[];
  npcs: Npc[];
  entrances?: BuildingEntrance[];
  interior?: { exterior: MapId; kind: RoomKind; style?: CityBuildingKind };
  counters?: InteriorCounter[];
  scenery?: CityScenery[];
  portals: {
    x: number;
    y: number;
    map: MapId;
    toX: number;
    toY: number;
    flag?: string;
    blockedText?: string;
  }[];
  encounters: Encounter[];
  zones?: { name: string; bounds: [number, number, number, number]; encounters: Encounter[] }[];
}
// # trees/walls, . lawn, : path, g tall grass, ~ water, H home, C healing centre,
// S shop, G gym, = bridge, ^ flowers, K solid service counter (talk across one tile).
const WORLD_MAPS: Record<WorldMapId, GameMap> = {
  dawn: {
    id: 'dawn',
    name: '晨芽镇',
    subtitle: '旅程从一片新叶开始',
    rows: [
      '##############################',
      '#...^^......#......^^........#',
      '#..HHHH.....#..HHHH.....^^^^.#',
      '#..HHHH.....#..HHHH.....^^^^.#',
      '#..HHHH.....#..HHHH.....^^^^.#',
      '#....:......#....:...........#',
      '#....::::::::::::::::::::::..#',
      '#....:............:...#...:..#',
      '#....:...^^.......:...#...:..#',
      '#..CCCC...........:...#...:..#',
      '#..CCCC...........::::::::::::',
      '#..CCCC...........:...#...:..#',
      '#....:....~~~.....:...#...:..#',
      '#....:::::~~~::::::...#...:..#',
      '#.........~~~.....:...#...:..#',
      '#.................:.......:..#',
      '#..^^^^^^.........:..^^^..:..#',
      '#..^^::::::::::::::::::::::..#',
      '#............................#',
      '##############################',
    ],
    npcs: [
      { id: 'home', x: 7, y: 8, name: '妈妈', role: 'home' },
      { id: 'professor', x: 8, y: 6, name: '岚博士', role: 'professor' },
      { id: 'rival', x: 17, y: 7, name: '阿澈', role: 'rival' },
      { id: 'dawnHeal', x: 5, y: 12, name: '治疗员', role: 'healer' },
      {
        id: 'dawnView',
        x: 25,
        y: 17,
        name: '花园旅行商',
        role: 'shop',
      },
      { id: 'dawnSign', x: 13, y: 10, name: '路牌', role: 'sign' },
    ],
    portals: [
      {
        x: 29,
        y: 10,
        map: 'route',
        toX: 1,
        toY: 10,
      },
    ],
    encounters: [],
  },
  route: {
    id: 'route',
    name: '晨光一号路',
    subtitle: '草丛里传来细碎的脚步',
    rows: [
      '##############################',
      '#..ggggg..#...gggggg.........#',
      '#..ggggg..#...gggggg..^^^^...#',
      '#..ggggg......gggggg..^^^^...#',
      '#..:::::........:.:::::::::..#',
      '#..:...::::::::::.....#...:..#',
      '#..:.........:.....^^.#...:..#',
      '#..:..~~~....:..gggg..#...:..#',
      '#..:..~~~....:..gggg..#...:..#',
      '#..:..~~~....:..gggg..#...:..#',
      '::::..~~~....:::::::::::::::::',
      '#..:..~~~....:........#...:..#',
      '#..:gg~~~gg..:..^^....#.gg:gg#',
      '#..:gg~~~gg..:........#.gg:gg#',
      '#..:ggggggg..:........#.gg:gg#',
      '#..:....................gg:gg#',
      '#..:....~~~.gggggg........:..#',
      '#..:....~~~.gggggg........:..#',
      '#..::::::::::::::::::::::::..#',
      '##############################',
    ],
    npcs: [
      { id: 'fieldProfessor', x: 5, y: 12, name: '岚博士', role: 'distressedProfessor' },
      { id: 'professorBag', x: 4, y: 11, name: '博士的背包', role: 'professorBag' },
      { id: 'openingWild', x: 4, y: 12, name: '躁动的绒团鼠', role: 'openingWild' },
      { id: 'routeRival', x: 18, y: 5, name: '阿澈', role: 'rival' },
      { id: 'catchGuide', x: 4, y: 9, name: '阿澈', role: 'quest', event: 'catchTutorial' },
      {
        id: 'routeTrainer',
        x: 13,
        y: 7,
        name: '巡路员',
        role: 'trainer',
        event: 'training',
        patrol: [
          [13, 7],
          [13, 8],
          [13, 9],
          [13, 8],
        ],
      },
      {
        id: 'routeLookout',
        x: 26,
        y: 17,
        name: '草甸路牌',
        role: 'sign',
        lines: ['东侧高草区更常见石壳虫，北坡草地常见风翎雀；南岸步道可以绕回镇口。'],
      },
      { id: 'routeChest', x: 19, y: 3, name: '旅行补给', role: 'chest' },
    ],
    portals: [
      { x: 0, y: 10, map: 'dawn', toX: 28, toY: 10 },
      { x: 29, y: 10, map: 'moss', toX: 1, toY: 10 },
    ],
    zones: habitatZones('route'),
    encounters: landEncounters('route'),
  },
  moss: {
    id: 'moss',
    name: '苔丘镇',
    subtitle: '枝叶徽章 · 森林的守望者',
    rows: [
      '###########::#################',
      '#...^^.....::....^^..........#',
      '#..CCCC....::..GGGGGG.^^^^^..#',
      '#..CCCC....::..GGGGGG.^^^^^..#',
      '#..CCCC....::..GGGGGG........#',
      '#....:.....::.....:.......:..#',
      '#....::::::::::::::::::::::..#',
      '#.........::......:.......:..#',
      '#..SSSS...::...HHH:.......:..#',
      '#..SSSS...::...HHH:.......:..#',
      '::::::::::::.....::::::::::..#',
      '#....:....::.....::..........#',
      '#....::::::::::::::.....~~~~.#',
      '#.......~~~~~~....:.....~~~~.#',
      '#..^^...~~~~~~....:^..#.~~~~.#',
      '#.................:..........#',
      '#..^^^^^..........:..........#',
      '#..^^::::::::::::::::::::::..#',
      '#............................#',
      '##############################',
    ],
    npcs: [
      { id: 'mossHeal', x: 5, y: 5, name: '治疗员', role: 'healer' },
      { id: 'shop', x: 5, y: 11, name: '补给商人', role: 'shop' },
      { id: 'researcher', x: 13, y: 6, name: '研究员穗禾', role: 'quest' },
      { id: 'gymGate', x: 18, y: 5, name: '道馆入口', role: 'gate' },
      {
        id: 'mossTraining',
        x: 17,
        y: 12,
        name: '训练场教练',
        role: 'trainer',
        event: 'training',
        patrol: [
          [17, 12],
          [18, 12],
          [19, 12],
          [18, 12],
        ],
      },
    ],
    portals: [
      { x: 0, y: 10, map: 'route', toX: 28, toY: 10 },
      { x: 11, y: 0, map: 'forest', toX: 11, toY: 18 },
      { x: 12, y: 0, map: 'forest', toX: 12, toY: 18 },
    ],
    encounters: [],
  },
  forest: {
    id: 'forest',
    name: '苔影森林',
    subtitle: '跟随断枝与微光寻找失踪精灵',
    rows: [
      '##############################',
      '#..ggggg.......ggggg..#.ggggg#',
      '#..ggggg...^^..ggggg..#.ggggg#',
      '#..ggggg..:::::ggggg..#.ggggg#',
      '#....::::::..:......::::::::g#',
      '#....:.......:..~~~...#......#',
      '###########:##################',
      '#....:.....:....~~~...#..:...#',
      '#..gg:gg...:::::::....#..:...#',
      '#..gg:gg...:..ggggg...#..:...#',
      '#....:::::::.:::::::::::::::.#',
      '#.........:...ggggg...#..:...#',
      '#..^^.....:..........##..:...#',
      '#.........:::.......~~~~.:...#',
      ':::::::::::::.......~~~~.:...#',
      '#..........::.......~~~~.:...#',
      '#.ggggg....::...gggg.....:...#',
      '#.ggg:::::::::::::::::::::...#',
      '#..........::............:...#',
      '###########::#################',
    ],
    npcs: [
      { id: 'forestEntry', x: 11, y: 13, name: '林间告示', role: 'sign' },
      { id: 'clueOne', x: 8, y: 10, name: '折断的枝条', role: 'clue' },
      { id: 'forestScout', x: 5, y: 8, name: '采集员青弥', role: 'trainer', event: 'forestScout' },
      { id: 'clueTwo', x: 15, y: 8, name: '闪光脚印', role: 'clue' },
      { id: 'forestLog', x: 11, y: 6, name: '倒下的树干', role: 'log' },
      {
        id: 'forestGuard',
        x: 10,
        y: 4,
        name: '定序社调查员',
        role: 'trainer',
        event: 'forestGuard',
      },
      { id: 'mistClueOne', x: 25, y: 17, name: '溪岸回声', role: 'clue' },
      { id: 'mistClueTwo', x: 25, y: 3, name: '林冠回声', role: 'clue' },
      { id: 'mistShrine', x: 25, y: 10, name: '旧铃残碑', role: 'echo' },
      { id: 'lostCreature', x: 13, y: 3, name: '受困的萤灯蛾', role: 'rescue' },
    ],
    portals: [
      { x: 11, y: 19, map: 'moss', toX: 11, toY: 1 },
      { x: 12, y: 19, map: 'moss', toX: 12, toY: 1 },
      { x: 0, y: 14, map: 'stoneRoute', toX: 34, toY: 18 },
    ],
    zones: habitatZones('forest'),
    encounters: landEncounters('forest'),
  },
  gym: {
    id: 'gym',
    name: '苔丘道馆',
    subtitle: '让每一片叶子找到阳光',
    rows: [
      '########################',
      '#...^^............^^...#',
      '#........::::::........#',
      '#........:....:........#',
      '#..ggg...:....:...ggg..#',
      '#..ggg...::::::...ggg..#',
      '###########:############',
      '#..ggg.....:.....ggg...#',
      '#..ggg...::::::..ggg...#',
      '#........:....:........#',
      '#........:....:........#',
      '###########:############',
      '#..........:...........#',
      '#..........:...........#',
      '#..........:...........#',
      '###########:############',
    ],
    npcs: [
      { id: 'gymSwitchOne', x: 8, y: 13, name: '晨光石碑', role: 'switch' },
      { id: 'gymScout', x: 11, y: 10, name: '学徒芽芽', role: 'trainer', event: 'gymScout' },
      { id: 'gymSwitchTwo', x: 15, y: 8, name: '雨露石碑', role: 'switch' },
      { id: 'gymKeeper', x: 11, y: 5, name: '护林员石青', role: 'trainer', event: 'gymKeeper' },
      { id: 'leader', x: 11, y: 2, name: '馆主榆岚', role: 'leader', event: 'leader' },
    ],
    portals: [{ x: 11, y: 15, map: 'moss', toX: 18, toY: 6 }],
    encounters: [],
  },
  ...HIGHLAND_MAPS,
  ...COAST_MAPS,
  ...ADVENTURE_MAPS,
};
export const MAPS = WORLD_MAPS as Record<MapId, GameMap>;
// Every physical extension and its painted road use the same definition.
// Keep public interaction clearings safe to stand in; tall grass begins beyond the posts.
for (const chapter of ADVENTURE_STORY_CONTENT)
  for (const map of chapter.maps)
    for (const npc of map.npcs)
      for (let y = Math.max(1, npc.y - 1); y <= Math.min(map.rows.length - 2, npc.y + 1); y++)
        for (let x = Math.max(1, npc.x - 1); x <= Math.min(map.rows[0]!.length - 2, npc.x + 1); x++)
          if (map.rows[y]![x] === 'g')
            map.rows[y] = map.rows[y]!.slice(0, x) + '.' + map.rows[y]!.slice(x + 1);
for (const chapter of ADVENTURE_STORY_CONTENT)
  for (const link of chapter.links) {
    const map = MAPS[link.from];
    for (const [x, y, w, h] of link.paths)
      for (let yy = y; yy < y + h; yy++) {
        const row = map.rows[yy]!;
        map.rows[yy] = row.slice(0, x) + ':'.repeat(w) + row.slice(x + w);
      }
    map.portals.push(link.exit);
  }
MAPS.star.rows[18] = ':' + MAPS.star.rows[18]!.slice(1);
MAPS.star.portals.push({ x: 0, y: 18, map: 'championRoad', toX: 46, toY: 36 });
export const TOWN_REST: Record<TownId, { x: number; y: number }> = {
  dawn: { x: 6, y: 12 },
  moss: { x: 6, y: 5 },
  stone: { x: 6, y: 5 },
  harbor: { x: 6, y: 6 },
  league: { x: 6, y: 6 },
  ...Object.fromEntries(ADVENTURE_CHAPTERS.map((c) => [c.town, c.rest])),
} as Record<TownId, { x: number; y: number }>;
export function isTown(map: MapId): map is TownId {
  return Object.hasOwn(TOWN_REST, map);
}
export const GYM_BARRIERS: Partial<Record<MapId, [number, number, string][]>> = {
  gym: [
    [11, 11, 'gymSwitchOne'],
    [11, 6, 'gymSwitchTwo'],
  ],
  waterGym: [
    [13, 14, 'waterSwitchOne'],
    [13, 7, 'waterSwitchTwo'],
  ],
  rockGym: [
    [13, 13, 'rockSwitchOne'],
    [13, 7, 'rockSwitchTwo'],
  ],
};
for (const gym of ADVENTURE_GYMS) GYM_BARRIERS[gym.map] = gym.barriers;
GYM_BARRIERS.leagueHall = [
  [18, 51, 'leagueIce'],
  [18, 38, 'leagueGhost'],
  [18, 25, 'leagueDark'],
  [18, 12, 'leagueDragon'],
];
// Each map owns its dimensions; collision, camera and layout guides share them.
for (const map of Object.values(MAPS)) {
  const width = Math.max(...map.rows.map((row) => row.length));
  map.rows = map.rows.map((row) => row.padEnd(width, '#'));
}
expandCityDistricts(MAPS);
installBuildingInteriors(MAPS, [
  { town: 'moss', map: 'gym', gate: 'gymGate', entrance: { x: 11, y: 14 } },
  { town: 'stone', map: 'rockGym', gate: 'rockGymGate', entrance: { x: 13, y: 18 } },
  { town: 'harbor', map: 'waterGym', gate: 'waterGymGate', entrance: { x: 13, y: 20 } },
  ...ADVENTURE_GYMS,
]);
export function townForMap(map: MapId): TownId | undefined {
  const outside = worldMapFor(map);
  return isTown(outside) ? outside : undefined;
}
export const isTownLocation = (map: MapId) => !!townForMap(map);
export function npcLocation(id: string) {
  for (const map of Object.values(MAPS)) {
    const npc = map.npcs.find((n) => n.id === id);
    if (npc) return { map: map.id, npc };
  }
  return undefined;
}
export function mapSize(id: MapId) {
  return { width: MAPS[id].rows[0]!.length * 32, height: MAPS[id].rows.length * 32 };
}
export function npcVisible(
  state: { progress: { flags: Record<string, boolean> } },
  npc: Npc,
): boolean {
  const f = state.progress.flags;
  if (npc.visibleWhen?.some((flag) => !f[flag]) || npc.hiddenWhen?.some((flag) => f[flag]))
    return false;
  if (npc.role === 'rock' && f[npc.id]) return false;
  if (['home', 'distressedProfessor', 'professorBag', 'openingWild'].includes(npc.role))
    return !!f.opening && (npc.role === 'home' || !f.professorRescued);
  if (npc.id === 'professor' && f.opening && !f.professorRescued) return false;
  if (npc.id === 'rival' && f.opening && f.neighborMet) return false;
  // 阿澈 moves from the first battle to the capture lesson after the field kit is issued.
  if (npc.id === 'routeRival')
    return !!f.opening && !!f.partnerReceived && !f.fieldKitReceived && !f.catchTutorial;
  if (npc.id === 'catchGuide' && f.opening && !f.fieldKitReceived && !f.catchTutorial) return false;
  if (npc.id === 'routeChest' && f.opening && !f.catchTutorial) return false;
  if (npc.id === 'forestLog' && state.progress.flags.logMoved) return false;
  if (npc.id === 'lostCreature' && state.progress.flags.rescued) return false;
  return true;
}
export function terrainPassable(
  mapId: MapId,
  x: number,
  y: number,
  flags: Record<string, boolean>,
): boolean {
  const tile = MAPS[mapId]?.rows[y]?.[x];
  if (MAPS[mapId]?.entrances?.some((e) => e.x === x && e.y === y)) return true;
  if (!tile || '#HCSGLFKT'.includes(tile)) return false;
  if ((tile === '~' || tile === 'W') && !flags.waterRig && !flags.lighthouseRepaired) return false;
  if (tile === 'R' && !flags[mapId === 'stoneRoute' ? 'foothillRock' : 'mineRock']) return false;
  if (GYM_BARRIERS[mapId]?.some(([xx, yy, flag]) => x === xx && y === yy && !flags[flag]))
    return false;
  return true;
}
export const TRAINERS: Record<
  | 'rival'
  | 'forestScout'
  | 'forestGuard'
  | 'gymScout'
  | 'gymKeeper'
  | 'leader'
  | 'training'
  | 'rockScout'
  | 'rockKeeper'
  | 'rockLeader'
  | 'highlandTraining'
  | 'mineGuard'
  | 'coastTraining'
  | 'waterScout'
  | 'waterKeeper'
  | 'waterLeader'
  | 'tideGuard'
  | import('../../game/model').AdventureBattleEvent,
  { name: string; team: [string, number][]; reward: number; practice?: boolean }
> = {
  rival: { name: '阿澈', team: [['creature_037', 5]], reward: 120 },
  forestScout: { name: '采集员青弥', team: [['creature_013', 7]], reward: 180 },
  forestGuard: {
    name: '定序社调查员',
    team: [
      ['creature_037', 8],
      ['creature_040', 8],
    ],
    reward: 260,
  },
  gymScout: { name: '学徒芽芽', team: [['creature_010', 9]], reward: 220 },
  gymKeeper: { name: '护林员石青', team: [['creature_027', 10]], reward: 260 },
  leader: {
    name: '馆主榆岚',
    team: [
      ['creature_010', 10],
      ['creature_001', 12],
    ],
    reward: 1000,
  },
  training: { name: '训练场教练', team: [['creature_037', 7]], reward: 120 },
  highlandTraining: { name: '山道向导', team: [['creature_049', 9]], reward: 150 },
  rockScout: { name: '学徒砾砾', team: [['creature_059', 9]], reward: 220 },
  rockKeeper: { name: '测量员棱子', team: [['creature_062', 10]], reward: 260 },
  rockLeader: {
    name: '馆主岳砾',
    team: [
      ['creature_062', 10],
      ['creature_075', 12],
    ],
    reward: 1000,
  },
  coastTraining: { name: '滨海巡路员', team: [['creature_190', 11]], reward: 170 },
  waterScout: { name: '学徒小澜', team: [['creature_082', 9]], reward: 220 },
  waterKeeper: { name: '领航员澄雨', team: [['creature_079', 10]], reward: 260 },
  waterLeader: {
    name: '馆主汐遥',
    team: [
      ['creature_187', 10],
      ['creature_190', 12],
    ],
    reward: 1000,
  },
  tideGuard: {
    name: '定序社货运员',
    team: [
      ['creature_083', 14],
      ['creature_088', 15],
    ],
    reward: 450,
  },
  mineGuard: {
    name: '定序社勘测员',
    team: [
      ['creature_068', 11],
      ['creature_071', 12],
    ],
    reward: 400,
  },
  ...ADVENTURE_TRAINERS,
};
export const GYM_TRAINERS = new Set([
  'gymScout',
  'gymKeeper',
  'leader',
  'rockScout',
  'rockKeeper',
  'rockLeader',
  'waterScout',
  'waterKeeper',
  'waterLeader',
  ...ADVENTURE_GYMS.flatMap((g) => [g.scout, g.keeper, g.leader]),
]);
// Apprentices step aside after a victory so the single-tile approach stays open.
for (const map of Object.values(MAPS))
  for (const npc of map.npcs)
    if (npc.role === 'trainer' && GYM_TRAINERS.has(npc.event!)) {
      const point = [
        [npc.x + 1, npc.y],
        [npc.x - 1, npc.y],
      ].find(
        ([x, y]) =>
          terrainPassable(map.id, x!, y!, {}) && !map.npcs.some((n) => n.x === x && n.y === y),
      );
      if (point) npc.defeatedPosition = point as [number, number];
    }
export const GYM_REWARDS = [
  { leader: 'leader', tool: 'vineCut', badge: '枝叶徽章', toolName: '剪藤工具' },
  { leader: 'rockLeader', tool: 'rockBreaker', badge: '砾岩徽章', toolName: '碎岩工具' },
  { leader: 'waterLeader', tool: 'waterRig', badge: '潮汐徽章', toolName: '渡水装备' },
  ...ADVENTURE_GYMS,
];
export const PRACTICE_TRAINERS = new Set<string>([
  'training',
  'highlandTraining',
  'coastTraining',
  ...Object.entries(ADVENTURE_TRAINERS)
    .filter(([, t]) => t!.practice)
    .map(([id]) => id),
]);
export const npcVictoryFlag = (id: string) => `defeatedNpc_${id}`;
export function npcDefeated(flags: Record<string, boolean>, npc: Npc): boolean {
  return (
    !!npc.event &&
    npc.event in TRAINERS &&
    (!!flags[npcVictoryFlag(npc.id)] || (!PRACTICE_TRAINERS.has(npc.event) && !!flags[npc.event]))
  );
}
export function badgeCount(flags: Record<string, boolean>) {
  return GYM_REWARDS.filter((gym) => flags[gym.leader]).length;
}
export function objective(flags: Record<string, boolean>, badges: number, mapId?: MapId): string {
  if (flags.opening) {
    if (!flags.neighborMet) return '刚搬来晨芽镇：去镇子东侧研究所拜访邻居阿澈。';
    if (!flags.professorCall) return '博士正在镇外调查。沿东侧出口前往一号路。';
    if (!flags.professorRescued) return '岚博士正被追赶！调查他落在路边的背包，借用精灵救人。';
    if (!flags.partnerReceived) return '回晨芽镇研究所，和岚博士交谈，正式获得伙伴。';
    if (!flags.rival) return '在一号路东部找到阿澈，完成第一场训练师对战。';
    if (!flags.fieldKitReceived) return '回研究所向岚博士报告，领取图鉴与捕捉补给。';
  }
  if (!flags.rival) return '与晨芽镇东侧研究所的阿澈进行第一次练习战。';
  if (!flags.catchTutorial) return '前往一号路，和阿澈学习捕捉。';
  if (mapId === 'leagueHall')
    return !flags.leagueIce
      ? '本轮连战：冰之精英霜岑。'
      : !flags.leagueGhost
        ? '本轮连战：幽灵精英灯隐。'
        : !flags.leagueDark
          ? '本轮连战：恶之精英夜准。'
          : !flags.leagueDragon
            ? '本轮连战：龙之精英澜脊。'
            : '本轮连战：挑战六位伙伴组成队伍的冠军望野。';
  if (mapId === 'league')
    return badges < 8
      ? '联盟资格只检查八枚不同徽章，随时可回各城自由挑战。'
      : !flags.rivalLeague
        ? '徽章齐全。与大厅南侧阿澈完成巡礼终场，再向登记员开启五场连战。'
        : '向登记员开启五场连战；本轮离场或战败后重置，成长与历史保留。';
  if (mapId === 'hallOfFame')
    return '查看首次与最近冠军队伍，和博士、阿澈交谈，再离开名录继续冒险。';
  if (mapId === 'championRoad')
    return '沿公共回环到北方联盟。八枚不同徽章是资格，支线、地区调查与神兽不影响登记。';
  if (flags.postgameComplete)
    return '地区主线、联盟与居民故事已全部结案。继续探索生境、培养伙伴与补全图鉴，或回联盟再次挑战。';
  if (flags.journeyComplete)
    return '八徽章与星流危机的完整旅程已完成。可回晨芽镇研究所开展保育研究，继续居民故事与传说相遇。';
  if (mapId) {
    const current = adventureObjective(flags, mapId);
    if (current) return current;
  }
  if (mapId === 'forest' && flags.quest && !flags.questReward) {
    if (!flags.clueOne || !flags.clueTwo)
      return '森林调查：寻找断枝与微光脚印。可随时回城挑战道馆。';
    if (!flags.forestScout) return '森林调查：请采集员青弥协助。';
    if (!flags.logMoved) return '森林调查：从南侧推动倒木。';
    if (!flags.forestGuard) return '森林调查：击退深处的定序社调查员。';
    if (!flags.rescued) return '森林调查：帮助受困的萤灯蛾。';
    return '森林调查：回镇向穗禾报告。';
  }
  if (mapId === 'forest' && flags.questReward && !flags.mistCaught)
    return flags.mistClueOne && flags.mistClueTwo
      ? '旧铃回声：到东部残碑回应旧约，开启雾铃灵的相遇。'
      : '旧铃回声：调查东南溪岸与东北林冠的两段铃声。';
  if (mapId === 'gym' && !flags.leader) {
    if (!flags.gymSwitchOne) return '触碰晨光石碑，进入本馆练习区。';
    if (!flags.gymScout) return '完成学徒芽芽的练习。';
    if (!flags.gymSwitchTwo) return '触碰雨露石碑，前往庭院。';
    if (!flags.gymKeeper) return '完成护林员石青的练习。';
    return '挑战馆主榆岚，获得枝叶徽章！';
  }
  if (mapId === 'rockGym' && !flags.rockLeader) {
    if (!flags.rockSwitchOne) return '调整南侧配重，进入砾岩道馆练习区。';
    if (!flags.rockScout) return '完成学徒砾砾的练习。';
    if (!flags.rockSwitchTwo) return '调整北侧配重，打开上层石门。';
    if (!flags.rockKeeper) return '完成测量员棱子的练习。';
    return '挑战馆主岳砾，获得砾岩徽章！';
  }
  if (mapId === 'waterGym' && !flags.waterLeader) {
    if (!flags.waterSwitchOne) return '调查落潮阀门，让第一段浮桥归位。';
    if (!flags.waterScout) return '完成学徒小澜的水系练习。';
    if (!flags.waterSwitchTwo) return '调查回潮阀门，让第二段浮桥归位。';
    if (!flags.waterKeeper) return '完成领航员澄雨的练习。';
    return '挑战馆主汐遥，获得潮汐徽章与渡水装备！';
  }
  if ((mapId === 'harbor' || mapId === 'tideworks') && flags.harborQuest && !flags.harborReport) {
    if (!flags.cargoManifest || !flags.sluiceGauge)
      return '货运调查：核对仓库货运簿与潮间闸水位计。';
    if (!flags.tideGuard) return '货运调查：击退潮闸北侧的定序社货运员。';
    if (!flags.sluiceRepaired) return '货运调查：隔离控制台的非法供能回路，恢复潮闸。';
    return '普通航道恢复了！回港向沐舟报告并封存 E-04 运单。';
  }
  if (mapId === 'harbor' && !flags.waterLeader)
    return '北侧水系道馆可直接完成馆内练习并挑战；货运、家书和灯塔调查自由安排。';
  if (mapId === 'stone' && flags.mineReport && !flags.harborReport)
    return '矿山运单指向潮汐港。从城东三号矿港道出发，找港务员沐舟核对。';
  if (mapId === 'mine' && flags.mineQuest && !flags.mineReport) {
    if (!flags.mineClueOne || !flags.mineClueTwo)
      return '矿山调查：记录西北采掘痕迹与东侧异常晶矿。';
    if (!flags.mineGuard) return '矿山调查：击退北部的定序社勘测员。';
    if (!flags.mineStabilized) return '矿山调查：关闭北侧共鸣控制台。';
    return '矿山已恢复平静。回石脊城向砚叔报告。';
  }
  if (mapId === 'stone' && flags.mineStabilized && !flags.mineReport)
    return '回访矿长砚叔，报告矿山调查结果并领取补给。';
  if (mapId === 'stone' && !flags.rockLeader)
    return '城北是砾岩道馆，完成本馆配重与练习即可挑战；矿山调查可自行安排。';
  if (mapId === 'moss' && !flags.leader)
    return '苔丘道馆就在镇子东北侧。完成本馆练习即可挑战，无需岩石徽章或森林报告。';
  if (badges === GYM_REWARDS.length)
    return `已获 ${badges}/8 枚不同徽章！可回访区域调查与支线，继续补全伙伴图鉴。`;
  if (badges >= 1)
    return `已获 ${badges}/8 枚不同徽章。各城尚未获徽章的道馆均可自由挑战，先完成本馆机关与练习即可。`;
  return `自由选择 ${GYM_REWARDS.length} 座已开放道馆。普通道路无需徽章，馆内只要求本馆练习。`;
}
