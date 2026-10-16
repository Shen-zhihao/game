import { habitatZones, landEncounters } from '../habitats';
import type { GameMap } from '../world';

function terrain(width: number, height: number, ground = '.') {
  const cells = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? '#' : ground,
    ),
  );
  const fill = (x: number, y: number, w: number, h: number, tile: string) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) cells[yy]![xx] = tile;
  };
  return { fill, rows: () => cells.map((row) => row.join('')) };
}

const road = terrain(40, 26);
road.fill(14, 2, 3, 22, '~');
road.fill(30, 1, 9, 24, '~');
road.fill(21, 7, 5, 7, '#');
road.fill(3, 11, 6, 5, 'g');
road.fill(20, 18, 7, 5, 'g');
road.fill(3, 21, 6, 3, 'g');
road.fill(0, 6, 31, 1, ':');
road.fill(14, 6, 3, 1, '=');
road.fill(6, 6, 1, 15, ':');
road.fill(6, 20, 24, 1, ':');
road.fill(14, 20, 3, 1, '=');
road.fill(28, 6, 1, 20, ':');
road.fill(10, 6, 1, 15, ':');
road.fill(10, 12, 11, 1, ':');
road.fill(14, 12, 3, 1, '=');
road.fill(17, 16, 12, 1, ':');
road.fill(23, 3, 6, 1, ':');

const town = terrain(36, 26);
town.fill(24, 13, 11, 12, '~');
town.fill(2, 2, 6, 4, 'C');
town.fill(20, 2, 8, 4, 'G');
town.fill(4, 10, 5, 4, 'S');
town.fill(13, 10, 6, 4, 'H');
town.fill(2, 18, 5, 4, 'H');
town.fill(28, 7, 5, 4, 'H');
town.fill(10, 0, 1, 10, ':');
town.fill(5, 6, 25, 1, ':');
town.fill(24, 6, 1, 7, ':');
town.fill(10, 6, 1, 18, ':');
town.fill(10, 16, 26, 1, ':');
town.fill(24, 16, 11, 1, '=');
town.fill(10, 23, 12, 1, ':');
town.fill(21, 16, 1, 8, ':');
town.fill(18, 20, 10, 1, '=');
town.fill(5, 14, 6, 1, ':');

const works = terrain(40, 28);
works.fill(12, 2, 5, 19, '~');
works.fill(26, 9, 3, 18, '~');
works.fill(29, 17, 10, 10, '~');
works.fill(2, 2, 6, 4, 'H');
works.fill(20, 8, 4, 6, '#');
works.fill(3, 20, 6, 5, 'g');
works.fill(18, 19, 6, 5, 'g');
works.fill(0, 16, 13, 1, ':');
works.fill(8, 6, 1, 15, ':');
works.fill(5, 6, 30, 1, ':');
works.fill(12, 6, 5, 1, '=');
works.fill(19, 6, 1, 12, ':');
works.fill(8, 16, 18, 1, ':');
works.fill(12, 16, 5, 1, '=');
works.fill(24, 6, 1, 19, ':');
works.fill(24, 24, 5, 1, ':');
works.fill(26, 24, 3, 1, 'W');
works.fill(34, 6, 1, 18, ':');
works.fill(29, 17, 9, 8, '.');
works.fill(29, 20, 9, 1, ':');
works.fill(3, 12, 5, 1, ':');

const gym = terrain(26, 22);
gym.fill(1, 7, 24, 1, '~');
gym.fill(1, 14, 24, 1, '~');
gym.fill(13, 2, 1, 20, ':');
gym.fill(5, 18, 15, 1, ':');
gym.fill(5, 11, 15, 1, ':');
gym.fill(5, 4, 15, 1, ':');
gym.fill(13, 7, 1, 1, '=');
gym.fill(13, 14, 1, 1, '=');

export const COAST_MAPS: Record<'coastRoute' | 'harbor' | 'tideworks' | 'waterGym', GameMap> = {
  coastRoute: {
    id: 'coastRoute',
    name: '三号矿港道',
    subtitle: '三座桥，通向海风与潮声',
    rows: road.rows(),
    npcs: [
      {
        id: 'coastTrainer',
        name: '滨海巡路员',
        role: 'trainer',
        event: 'coastTraining',
        x: 6,
        y: 10,
        patrol: [
          [6, 10],
          [6, 11],
          [6, 12],
          [6, 11],
        ],
      },
      { id: 'driftBottle', name: '沙洲上的漂流瓶', role: 'clue', x: 9, y: 22 },
      { id: 'shoreObservation', name: '河口观察点', role: 'clue', x: 18, y: 19 },
      { id: 'coastChest', name: '桥头补给', role: 'chest', x: 25, y: 3 },
      {
        id: 'coastSign',
        name: '矿港道路牌',
        role: 'sign',
        x: 27,
        y: 24,
        lines: [
          '西北回石脊城，南面到潮汐港。三座桥连通上下游，中央支路绕过海崖；道路不需要徽章或渡水装备。',
          '草滩有泡沫蟹、滩泥螺等精灵，河流与外海栖地不同。站在岸边朝水面按 A 调查。',
        ],
      },
    ],
    portals: [
      { x: 0, y: 6, map: 'stone', toX: 28, toY: 18 },
      { x: 28, y: 25, map: 'harbor', toX: 10, toY: 1 },
    ],
    encounters: landEncounters('coastRoute'),
    zones: habitatZones('coastRoute'),
  },
  harbor: {
    id: 'harbor',
    name: '潮汐港',
    subtitle: '潮汐徽章 · 来信与归航',
    rows: town.rows(),
    npcs: [
      { id: 'harborHeal', name: '港口治疗员', role: 'healer', x: 5, y: 6 },
      { id: 'harborShop', name: '航海补给商', role: 'shop', x: 6, y: 14 },
      { id: 'waterGymGate', name: '潮汐道馆入口', role: 'gate', x: 24, y: 6 },
      { id: 'harborMaster', name: '港务员沐舟', role: 'quest', x: 15, y: 15 },
      { id: 'cargoManifest', name: '仓库货运簿', role: 'clue', x: 30, y: 11 },
      { id: 'postkeeper', name: '收信人青帆', role: 'quest', x: 7, y: 22 },
      { id: 'tideChart', name: '港口潮汐历', role: 'clue', x: 12, y: 20 },
      {
        id: 'lighthouseKeeper',
        name: '灯塔守望员海棠',
        role: 'quest',
        x: 20,
        y: 15,
        patrol: [
          [20, 15],
          [20, 16],
          [20, 17],
          [20, 16],
        ],
      },
      {
        id: 'harborSign',
        name: '港口导览',
        role: 'sign',
        x: 11,
        y: 8,
        lines: [
          '北面回矿港道，东侧栈桥通往潮间闸与旧灯塔。大陆维修路始终开放。',
          '北侧水系道馆只要求基础训练与本馆练习；不要求矿山报告、修闸、灯塔或其他徽章。',
          '城镇菜单可购买补给、接受三份居民委托、用调查印记兑换潮汐珠和复刻药。',
        ],
      },
    ],
    portals: [
      { x: 10, y: 0, map: 'coastRoute', toX: 28, toY: 24 },
      { x: 35, y: 16, map: 'tideworks', toX: 1, toY: 16 },
    ],
    encounters: [],
  },
  tideworks: {
    id: 'tideworks',
    name: '潮间闸与旧灯塔',
    subtitle: '陆上维修路，绕过停止转动的潮汐闸',
    rows: works.rows(),
    npcs: [
      { id: 'sluiceGauge', name: '异常水位计', role: 'clue', x: 18, y: 8 },
      { id: 'tideGuard', name: '定序社货运员', role: 'trainer', event: 'tideGuard', x: 22, y: 5 },
      { id: 'sluiceConsole', name: '潮汐闸控制台', role: 'mechanism', x: 19, y: 3 },
      { id: 'lensCase', name: '检修镜片箱', role: 'chest', x: 4, y: 12 },
      { id: 'oldLighthouse', name: '旧灯塔灯座', role: 'mechanism', x: 5, y: 6 },
      { id: 'poolObservation', name: '潮池观察点', role: 'clue', x: 30, y: 18 },
      { id: 'reefCleanup', name: '缠住礁石的旧网', role: 'clue', x: 35, y: 19 },
      { id: 'coralFriend', name: '浅礁的珊枝鹿', role: 'echo', x: 32, y: 21 },
      { id: 'islandFriend', name: '休憩的浮岛龟', role: 'echo', x: 36, y: 22 },
      { id: 'tideShell', name: '回应潮声的贝壳', role: 'echo', x: 30, y: 23 },
      {
        id: 'rigLaunch',
        name: '渡水浮标',
        role: 'sign',
        x: 25,
        y: 23,
        lines: [
          '南侧浮标通道只是一条渡水捷径，取得潮汐徽章的渡水装备后可使用。',
          '没有装备也能沿北侧维修桥绕到浅礁。潮池观察和灯塔维修都不需要徽章。',
        ],
      },
    ],
    portals: [{ x: 0, y: 16, map: 'harbor', toX: 34, toY: 16 }],
    encounters: landEncounters('tideworks'),
    zones: habitatZones('tideworks'),
  },
  waterGym: {
    id: 'waterGym',
    name: '潮汐道馆',
    subtitle: '调整水闸，让两段浮桥归位',
    rows: gym.rows(),
    npcs: [
      { id: 'waterSwitchOne', name: '落潮阀门', role: 'switch', x: 6, y: 18 },
      { id: 'waterScout', name: '学徒小澜', role: 'trainer', event: 'waterScout', x: 13, y: 12 },
      { id: 'waterSwitchTwo', name: '回潮阀门', role: 'switch', x: 19, y: 11 },
      { id: 'waterKeeper', name: '领航员澄雨', role: 'trainer', event: 'waterKeeper', x: 13, y: 5 },
      { id: 'waterLeader', name: '馆主汐遥', role: 'leader', event: 'waterLeader', x: 13, y: 2 },
    ],
    portals: [{ x: 13, y: 21, map: 'harbor', toX: 24, toY: 7 }],
    encounters: [],
  },
};
