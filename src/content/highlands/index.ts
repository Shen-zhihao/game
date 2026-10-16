import { habitatZones, landEncounters } from '../habitats';
import type { GameMap } from '../world';

/** Named areas and looped paths are authored once, shared by art guides and collision. */
function terrain(width: number, height: number) {
  const cells: string[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? '#' : '.',
    ),
  );
  const fill = (x: number, y: number, w: number, h: number, tile: string) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) cells[yy]![xx] = tile;
  };
  return { fill, rows: () => cells.map((row) => row.join('')) };
}
const foothills = terrain(36, 24);
foothills.fill(15, 3, 5, 13, '#');
foothills.fill(3, 9, 4, 5, '~');
foothills.fill(10, 7, 4, 7, 'g');
foothills.fill(25, 10, 4, 6, 'g');
foothills.fill(4, 19, 4, 3, 'g');
foothills.fill(8, 3, 1, 18, ':');
foothills.fill(8, 3, 17, 1, ':');
foothills.fill(8, 0, 1, 4, ':');
foothills.fill(24, 3, 1, 6, ':');
foothills.fill(24, 8, 7, 1, ':');
foothills.fill(30, 8, 1, 11, ':');
foothills.fill(8, 18, 28, 1, ':');
foothills.fill(8, 20, 7, 1, ':');
foothills.fill(30, 4, 4, 1, ':');
foothills.fill(30, 4, 1, 5, ':');
foothills.fill(8, 11, 23, 1, ':');
foothills.fill(17, 11, 1, 1, 'R');

const city = terrain(30, 22);
city.fill(3, 2, 5, 3, 'C');
city.fill(17, 2, 7, 3, 'G');
city.fill(4, 9, 4, 3, 'S');
city.fill(18, 10, 4, 3, 'H');
city.fill(23, 14, 5, 4, '~');
city.fill(5, 5, 1, 4, ':');
city.fill(5, 12, 1, 7, ':');
city.fill(5, 6, 20, 1, ':');
city.fill(24, 6, 1, 8, ':');
city.fill(20, 5, 1, 2, ':');
city.fill(0, 14, 15, 1, ':');
city.fill(14, 6, 1, 16, ':');
city.fill(5, 18, 18, 1, ':');
city.fill(22, 13, 1, 6, ':');
city.fill(18, 13, 5, 1, ':');
city.fill(22, 18, 8, 1, ':');
city.fill(8, 16, 4, 1, '^');

const mine = terrain(36, 24);
mine.fill(12, 8, 12, 8, '#');
mine.fill(3, 7, 2, 5, '#');
mine.fill(30, 8, 3, 7, '#');
mine.fill(14, 17, 7, 4, '~');
mine.fill(25, 2, 6, 5, 'g');
mine.fill(3, 14, 8, 5, 'g');
mine.fill(6, 4, 23, 1, ':');
mine.fill(6, 4, 1, 16, ':');
mine.fill(28, 4, 1, 16, ':');
mine.fill(6, 19, 30, 1, ':');
mine.fill(14, 19, 7, 1, '=');
mine.fill(6, 11, 23, 1, ':');
mine.fill(17, 11, 1, 1, 'R');

const gym = terrain(26, 20);
gym.fill(1, 7, 24, 1, '#');
gym.fill(1, 13, 24, 1, '#');
gym.fill(13, 2, 1, 18, ':');
gym.fill(7, 16, 14, 1, ':');
gym.fill(8, 10, 12, 1, ':');
gym.fill(8, 4, 12, 1, ':');
gym.fill(3, 2, 4, 3, '#');
gym.fill(19, 15, 4, 3, '#');

export const HIGHLAND_MAPS: Record<'stoneRoute' | 'stone' | 'mine' | 'rockGym', GameMap> = {
  stoneRoute: {
    id: 'stoneRoute',
    name: '二号碎石道',
    subtitle: '绕过山脊，听见岩石的回声',
    rows: foothills.rows(),
    npcs: [
      {
        id: 'highlandTrainer',
        name: '山道向导',
        role: 'trainer',
        event: 'highlandTraining',
        x: 8,
        y: 10,
        patrol: [
          [8, 10],
          [8, 11],
          [8, 12],
          [8, 11],
        ],
      },
      {
        id: 'highlandSign',
        name: '山道路牌',
        role: 'sign',
        x: 29,
        y: 17,
        lines: [
          '北：石脊城与旧矿山。东：苔影森林与苔丘镇。两座道馆可自由选择先后。',
          '中央岩块只封住捷径，南北两条山道一直相通；取得碎岩工具后可以调查岩块。',
        ],
      },
      { id: 'highlandChest', name: '山间补给', role: 'chest', x: 33, y: 5 },
      { id: 'habitat', name: '石壳虫栖地', role: 'clue', x: 11, y: 17 },
      { id: 'foothillRock', name: '捷径岩块', role: 'rock', x: 17, y: 11 },
    ],
    portals: [
      { x: 35, y: 18, map: 'forest', toX: 1, toY: 14 },
      { x: 8, y: 0, map: 'stone', toX: 14, toY: 20 },
    ],
    encounters: landEncounters('stoneRoute'),
    zones: habitatZones('stoneRoute'),
  },
  stone: {
    id: 'stone',
    name: '石脊城',
    subtitle: '砾岩徽章 · 矿山脚下的约定',
    rows: city.rows(),
    npcs: [
      { id: 'stoneHeal', name: '山城治疗员', role: 'healer', x: 5, y: 5 },
      { id: 'stoneShop', name: '山城补给商', role: 'shop', x: 5, y: 12 },
      { id: 'rockGymGate', name: '砾岩道馆入口', role: 'gate', x: 20, y: 5 },
      { id: 'mineForeman', name: '矿长砚叔', role: 'quest', x: 13, y: 10 },
      { id: 'retiredMiner', name: '退休矿工砾伯', role: 'quest', x: 9, y: 15 },
      {
        id: 'stoneSign',
        name: '山城导览',
        role: 'sign',
        x: 15,
        y: 19,
        lines: [
          '西面是旧矿山，南面通往二号碎石道，东侧三号矿港道通往潮汐港。北侧砾岩道馆不要求枝叶徽章，也不要求完成矿山调查。',
          '本馆会根据你已有的徽章调整队伍。水与草系招式能帮助应对岩石系。',
        ],
      },
    ],
    portals: [
      { x: 14, y: 21, map: 'stoneRoute', toX: 8, toY: 1 },
      { x: 0, y: 14, map: 'mine', toX: 34, toY: 19 },
      { x: 29, y: 18, map: 'coastRoute', toX: 1, toY: 6 },
    ],
    encounters: [],
  },
  mine: {
    id: 'mine',
    name: '石脊旧矿山',
    subtitle: '矿车停下，晶矿仍在共鸣',
    rows: mine.rows(),
    npcs: [
      { id: 'miningPlaque', name: '矿车旁的旧牌', role: 'clue', x: 7, y: 16 },
      { id: 'mineClueOne', name: '采掘痕迹', role: 'clue', x: 8, y: 5 },
      { id: 'mineClueTwo', name: '异常晶矿', role: 'clue', x: 26, y: 8 },
      { id: 'mineGuard', name: '定序社勘测员', role: 'trainer', event: 'mineGuard', x: 25, y: 4 },
      { id: 'mineRegulator', name: '共鸣控制台', role: 'mechanism', x: 16, y: 5 },
      { id: 'bellStone', name: '回声钟石', role: 'echo', x: 9, y: 6 },
      { id: 'mineRock', name: '矿道岩块', role: 'rock', x: 17, y: 11 },
      {
        id: 'mineExitSign',
        name: '安全告示',
        role: 'sign',
        x: 31,
        y: 19,
        lines: [
          '东侧回石脊城，环形矿道可从南北两端通行。中央岩块后的通路只是一条捷径。',
          '碎石堆会遇到野生精灵；先在城里治疗、补给。',
        ],
      },
    ],
    portals: [{ x: 35, y: 19, map: 'stone', toX: 1, toY: 14 }],
    encounters: landEncounters('mine'),
    zones: habitatZones('mine'),
  },
  rockGym: {
    id: 'rockGym',
    name: '砾岩道馆',
    subtitle: '调整两座配重，找到稳定的重心',
    rows: gym.rows(),
    npcs: [
      { id: 'rockSwitchOne', name: '南侧配重', role: 'switch', x: 8, y: 16 },
      { id: 'rockScout', name: '学徒砾砾', role: 'trainer', event: 'rockScout', x: 13, y: 11 },
      { id: 'rockSwitchTwo', name: '北侧配重', role: 'switch', x: 18, y: 10 },
      { id: 'rockKeeper', name: '测量员棱子', role: 'trainer', event: 'rockKeeper', x: 13, y: 5 },
      { id: 'rockLeader', name: '馆主岳砾', role: 'leader', event: 'rockLeader', x: 13, y: 2 },
    ],
    portals: [{ x: 13, y: 19, map: 'stone', toX: 20, toY: 6 }],
    encounters: [],
  },
};
