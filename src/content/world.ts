import { MapId, StoryEvent } from '../game/model';

export interface Npc {
  id: string;
  x: number;
  y: number;
  name: string;
  role:
    | 'professor'
    | 'rival'
    | 'healer'
    | 'shop'
    | 'quest'
    | 'trainer'
    | 'leader'
    | 'sign'
    | 'clue'
    | 'log'
    | 'switch'
    | 'rescue'
    | 'chest'
    | 'gate';
  event?: StoryEvent;
  color?: string;
}
export interface GameMap {
  id: MapId;
  name: string;
  subtitle: string;
  rows: string[];
  npcs: Npc[];
  portals: {
    x: number;
    y: number;
    map: MapId;
    toX: number;
    toY: number;
    flag?: string;
    blockedText?: string;
  }[];
  encounters: { speciesId: string; min: number; max: number; weight: number }[];
}
// # trees/walls, . lawn, : path, g tall grass, ~ water, H home, C healing centre,
// S shop, G gym, = bridge, ^ flowers. NPCs are stable interactive tiles.
export const MAPS: Record<MapId, GameMap> = {
  dawn: {
    id: 'dawn',
    name: '晨芽镇',
    subtitle: '旅程从一片新叶开始',
    rows: [
      '########################',
      '#...^^......#......^^..#',
      '#..HHHH.....#..HHHH....#',
      '#..HHHH.....#..HHHH....#',
      '#..HHHH.....#..HHHH....#',
      '#....:......#....:.....#',
      '#....:::::::::::::....#',
      '#....:............:...#',
      '#....:...^^.......:...#',
      '#..CCCC...........:...#',
      '#..CCCC...........::::::',
      '#..CCCC...........:...#',
      '#....:....~~~.....:...#',
      '#....:::::~~~::::::...#',
      '#.........~~~.........#',
      '########################',
    ],
    npcs: [
      { id: 'professor', x: 8, y: 6, name: '岚博士', role: 'professor' },
      { id: 'rival', x: 17, y: 7, name: '阿澈', role: 'rival' },
      { id: 'dawnHeal', x: 5, y: 12, name: '治疗员', role: 'healer' },
      { id: 'dawnSign', x: 13, y: 10, name: '路牌', role: 'sign' },
    ],
    portals: [
      {
        x: 23,
        y: 10,
        map: 'route',
        toX: 1,
        toY: 10,
        flag: 'rival',
        blockedText: '阿澈在东边等你。先完成伙伴的第一场练习吧。',
      },
    ],
    encounters: [],
  },
  route: {
    id: 'route',
    name: '晨光一号路',
    subtitle: '草丛里传来细碎的脚步',
    rows: [
      '########################',
      '#..ggggg..#...gggggg...#',
      '#..ggggg..#...gggggg...#',
      '#..ggggg......gggggg...#',
      '#..:::::........:.....#',
      '#..:...::::::::::.....#',
      '#..:.........:.....^^.#',
      '#..:..~~~....:..gggg..#',
      '#..:..~~~....:..gggg..#',
      '#..:..~~~....:..gggg..#',
      '::::..~~~....:::::::::::',
      '#.....~~~....:........#',
      '#..ggg~~~gg..:..^^....#',
      '#..ggg~~~gg..:........#',
      '#..gggggggg..:........#',
      '########################',
    ],
    npcs: [
      { id: 'catchGuide', x: 4, y: 9, name: '阿澈', role: 'quest', event: 'catchTutorial' },
      { id: 'routeTrainer', x: 13, y: 7, name: '巡路员', role: 'trainer', event: 'training' },
      { id: 'routeChest', x: 19, y: 3, name: '旅行补给', role: 'chest' },
    ],
    portals: [
      { x: 0, y: 10, map: 'dawn', toX: 22, toY: 10 },
      { x: 23, y: 10, map: 'moss', toX: 1, toY: 10 },
    ],
    encounters: [
      { speciesId: 'creature_037', min: 3, max: 6, weight: 35 },
      { speciesId: 'creature_040', min: 4, max: 7, weight: 25 },
      { speciesId: 'creature_010', min: 4, max: 6, weight: 25 },
      { speciesId: 'creature_013', min: 5, max: 7, weight: 15 },
    ],
  },
  moss: {
    id: 'moss',
    name: '苔丘镇',
    subtitle: '枝叶徽章 · 森林的守望者',
    rows: [
      '###########::###########',
      '#...^^.....::....^^....#',
      '#..CCCC....::..GGGGGG..#',
      '#..CCCC....::..GGGGGG..#',
      '#..CCCC....::..GGGGGG..#',
      '#....:.....::.....:....#',
      '#....::::::::::::::....#',
      '#.........::...........#',
      '#..SSSS...::...HHHH....#',
      '#..SSSS...::...HHHH....#',
      '::::::::::::.....:.....#',
      '#....:....::.....:.....#',
      '#....:::::::::::::.....#',
      '#.......~~~~~~.........#',
      '#..^^...~~~~~~....^^..#',
      '########################',
    ],
    npcs: [
      { id: 'mossHeal', x: 5, y: 5, name: '治疗员', role: 'healer' },
      { id: 'shop', x: 5, y: 11, name: '补给商人', role: 'shop' },
      { id: 'researcher', x: 13, y: 6, name: '研究员穗禾', role: 'quest' },
      { id: 'gymGate', x: 18, y: 5, name: '道馆入口', role: 'gate' },
      { id: 'mossTraining', x: 17, y: 12, name: '训练场教练', role: 'trainer', event: 'training' },
    ],
    portals: [
      { x: 0, y: 10, map: 'route', toX: 22, toY: 10 },
      { x: 11, y: 0, map: 'forest', toX: 11, toY: 14 },
      { x: 12, y: 0, map: 'forest', toX: 12, toY: 14 },
    ],
    encounters: [],
  },
  forest: {
    id: 'forest',
    name: '苔影森林',
    subtitle: '跟随断枝与微光寻找失踪精灵',
    rows: [
      '########################',
      '#..ggggg.......ggggg..#',
      '#..ggggg...^^..ggggg..#',
      '#..ggggg..:::::ggggg..#',
      '#....::::::..:.......##',
      '#....:.......:..~~~...#',
      '###########:####~~~####',
      '#....:.....:....~~~...#',
      '#..gg:gg...:::::::....#',
      '#..gg:gg...:..ggggg...#',
      '#....:::::::..ggggg...#',
      '#.........:...ggggg...#',
      '#..^^.....:..........#',
      '#.........:::........#',
      '#..........::........#',
      '###########::###########',
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
      { id: 'lostCreature', x: 13, y: 3, name: '受困的萤灯蛾', role: 'rescue' },
    ],
    portals: [
      { x: 11, y: 15, map: 'moss', toX: 11, toY: 1 },
      { x: 12, y: 15, map: 'moss', toX: 12, toY: 1 },
    ],
    encounters: [
      { speciesId: 'creature_013', min: 6, max: 8, weight: 30 },
      { speciesId: 'creature_016', min: 6, max: 9, weight: 25 },
      { speciesId: 'creature_010', min: 7, max: 9, weight: 20 },
      { speciesId: 'creature_027', min: 7, max: 9, weight: 15 },
      { speciesId: 'creature_025', min: 8, max: 10, weight: 10 },
    ],
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
};
// Pad hand-authored rows so camera/collision share one rectangular grid.
for (const map of Object.values(MAPS))
  map.rows = map.rows.map((row) => row.padEnd(24, '#').slice(0, 24));
export function npcVisible(
  state: { progress: { flags: Record<string, boolean> } },
  npc: Npc,
): boolean {
  if (npc.id === 'forestLog' && state.progress.flags.logMoved) return false;
  if (npc.id === 'lostCreature' && state.progress.flags.rescued) return false;
  if (npc.role === 'trainer' && npc.event !== 'training' && state.progress.flags[npc.event!])
    return false;
  return true;
}
export function terrainPassable(
  mapId: MapId,
  x: number,
  y: number,
  flags: Record<string, boolean>,
): boolean {
  const tile = MAPS[mapId]?.rows[y]?.[x];
  if (!tile || '#~HCSG'.includes(tile)) return false;
  if (mapId === 'gym' && y === 11 && x === 11 && !flags.gymSwitchOne) return false;
  if (mapId === 'gym' && y === 6 && x === 11 && !flags.gymSwitchTwo) return false;
  return true;
}
export const TRAINERS: Record<
  Exclude<StoryEvent, 'rescue' | 'catchTutorial'>,
  { name: string; team: [string, number][]; reward: number }
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
};
export function objective(flags: Record<string, boolean>, badges: number): string {
  if (badges) return '第一章完成！剪藤工具已获得。可以继续探索、捕捉和培养伙伴。';
  if (!flags.rival) return '与晨芽镇东侧的阿澈进行第一次练习战。';
  if (!flags.catchTutorial) return '前往一号路，和阿澈学习捕捉。';
  if (!flags.quest) return '到苔丘镇广场，向研究员穗禾了解森林求助。';
  if (!flags.clueOne || !flags.clueTwo) return '在苔影森林调查两处线索：断枝与微光脚印。';
  if (!flags.forestScout) return '请采集员青弥协助：完成他的对战考验。';
  if (!flags.logMoved) return '从南侧推动森林北部通道的倒木。';
  if (!flags.forestGuard) return '向森林深处前进，击退定序社调查员。';
  if (!flags.rescued) return '与深处受困的萤灯蛾互动，完成救援。';
  if (!flags.questReward) return '回苔丘镇向穗禾报告，领取救援奖励。';
  if (!flags.gymSwitchOne) return '进入苔丘道馆，触碰晨光石碑。';
  if (!flags.gymScout) return '挑战道馆第一位学徒。';
  if (!flags.gymSwitchTwo) return '触碰道馆中段的雨露石碑。';
  if (!flags.gymKeeper) return '挑战护林员石青，前往馆主的庭院。';
  return '挑战馆主榆岚，赢得枝叶徽章！';
}
