import campaign from '../../../docs/剧情规划/剧情规划.json';
import { MapId, TypeId } from '../../game/model';
import { TYPES } from '../catalog';
import { MAPS } from '../world';
import { ADVENTURE_CHAPTERS, ADVENTURE_GYMS } from '../adventure';

export const REGION_SIZE = { width: 600, height: 420 };
export interface RegionPlace {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: 'town' | 'route' | 'forest' | 'landmark' | 'league';
  map?: MapId;
  gym?: number;
  description: string;
  services: string;
}

const gymPositions = [
  [285, 350],
  [145, 195],
  [490, 345],
  [465, 240],
  [415, 75],
  [105, 90],
  [365, 170],
  [285, 80],
];
export const REGION_PLACES: RegionPlace[] = [
  {
    id: 'dawn',
    name: MAPS.dawn.name,
    x: 85,
    y: 350,
    kind: 'town',
    map: 'dawn',
    description: '晨光照进花园。岚博士的研究所和你的新家都在这里，东面的道路通往苔丘镇。',
    services: '研究所 · 免费治疗 · 仓库 · 技能回忆',
  },
  {
    id: 'route',
    name: MAPS.route.name,
    x: 185,
    y: 350,
    kind: 'route',
    map: 'route',
    description: '连接两座小镇的草甸道路。绕行东侧高草区，寻找不同的精灵和旅行补给。',
    services: '野生精灵 · 捕捉练习 · 巡路训练师',
  },
  ...campaign.gyms.map((gym, index): RegionPlace => ({
    id: index === 0 ? 'moss' : `town-${gym.number}`,
    name: gym.town,
    x: gymPositions[index]![0]!,
    y: gymPositions[index]![1]!,
    kind: 'town',
    ...(index < 3
      ? { map: (index === 0 ? 'moss' : index === 1 ? 'stone' : 'harbor') as MapId }
      : ADVENTURE_GYMS.some((g) => g.number === gym.number)
        ? { map: ADVENTURE_GYMS.find((g) => g.number === gym.number)!.town }
        : {}),
    gym: gym.number,
    description:
      index === 0
        ? '林边的小镇，北方通往苔影森林。完成入门练习后，可直接挑战本馆，或先调查森林。'
        : `${gym.leader}守护着${gym.badge}。完成本馆练习即可挑战，不要求其他道馆的徽章。`,
    services: `${gym.type ? TYPES[gym.type as TypeId] : '综合'}系道馆 · ${gym.badge}`,
  })),
  {
    id: 'forest',
    name: MAPS.forest.name,
    x: 285,
    y: 260,
    kind: 'forest',
    map: 'forest',
    description: '林冠、岔路与湿地交错。采集员的踪迹与旧铃回声，都藏在这片森林里。',
    services: '森林救援 · 旧铃调查 · 林冠与南岸生境',
  },
  {
    id: 'stoneRoute',
    name: MAPS.stoneRoute.name,
    x: 215,
    y: 225,
    kind: 'route',
    map: 'stoneRoute',
    description: '苔影森林西侧通向山城的绕行路。南北路线环绕中央岩脊，碎岩只打开捷径，不影响通行。',
    services: '山道训练 · 栖地清理 · 分区遭遇',
  },
  {
    id: 'mine',
    name: '旧矿山',
    x: 80,
    y: 265,
    kind: 'landmark',
    map: 'mine',
    description: '环形矿道回荡着异常共鸣。矿长的调查接续森林事件；矿车工牌还藏着另一段同行旧约。',
    services: '共鸣调查 · 工牌旧约 · 鸣钟石相遇',
  },
  {
    id: 'coastRoute',
    name: MAPS.coastRoute.name,
    x: 340,
    y: 305,
    kind: 'route',
    map: 'coastRoute',
    description:
      '三座桥串起河口与海崖，草滩、急流和外海各有精灵。西回石脊城，南到潮汐港，全程不需徽章或工具。',
    services: '滨海训练 · 漂流瓶 · 河口观察 · 草滩与水域遭遇',
  },
  {
    id: 'tideworks',
    name: MAPS.tideworks.name,
    x: 540,
    y: 270,
    kind: 'landmark',
    map: 'tideworks',
    description:
      '北侧陆上维修桥连接潮闸、灯塔与浅礁；南侧渡水装备只打开捷径。独立调查让三位稀有伙伴愿意同行。',
    services: '潮闸调查 · 旧灯塔维修 · 潮池保育 · 三段稀有相遇',
  },
  {
    id: 'ruins',
    name: MAPS.starCore.name,
    map: 'starCore',
    x: 515,
    y: 130,
    kind: 'landmark',
    description: '古老记录将零散的异象连在一起。传说精灵的相遇需要完成相应调查。',
    services: '遗迹调查 · 传说线索',
  },
  {
    id: 'powerRoute',
    name: MAPS.powerRoute.name,
    x: 500,
    y: 300,
    kind: 'route',
    map: 'powerRoute',
    description:
      '滨海栈道与生态湿地有两条环路，桥梁、草甸与电站各自独立。普通通行不要求港口结案或徽章。',
    services: '电系与钢系生态 · 栈道训练 · 花园引水',
  },
  {
    id: 'powerStation',
    name: MAPS.powerStation.name,
    x: 550,
    y: 230,
    kind: 'landmark',
    map: 'powerStation',
    description: 'E-04 运单指向的能源站。公共检修桥与值班记录独立开放，非法分流调查接续港口报告。',
    services: '设备与晶丝取证 · 双路检修 · 值班簿',
  },
  {
    id: 'league',
    map: 'league',
    name: '星苔联盟',
    x: 210,
    y: 25,
    kind: 'league',
    description: '集齐八枚不同徽章后，挑战四位精英与冠军。',
    services: '八徽章认证 · 精英四天王 · 冠军',
  },
];

// Each new playable location is recorded from its actual map, alongside the campaign overview.
for (const [map, x, y] of [
  ['deepwood', 350, 375],
  ['echoMeadow', 125, 150],
  ['mineDepths', 45, 300],
  ['kelpCove', 560, 365],
] as const)
  REGION_PLACES.push({
    id: map,
    name: MAPS[map].name,
    map,
    x,
    y,
    kind: 'landmark',
    description: MAPS[map].subtitle,
    services: '保育观察 · 分区生态 · 剧情旧约 · 可选工具捷径',
  });
for (const [map, x, y] of [
  ['championRoad', 240, 45],
  ['leagueHall', 155, 30],
  ['hallOfFame', 200, 60],
] as const)
  REGION_PLACES.push({
    id: map,
    name: MAPS[map].name,
    map,
    x,
    y,
    kind: 'landmark',
    description: MAPS[map].subtitle,
    services: '联盟挑战 · 冠军记录',
  });
for (const chapter of ADVENTURE_CHAPTERS) {
  let offset = 0;
  for (const map of chapter.maps) {
    if (
      map.id === chapter.town ||
      map.id === chapter.gym.map ||
      REGION_PLACES.some((p) => p.map === map.id)
    )
      continue;
    const cx = gymPositions[chapter.number - 1]![0]!,
      cy = gymPositions[chapter.number - 1]![1]!;
    REGION_PLACES.push({
      id: map.id,
      name: map.name,
      map: map.id,
      x: Math.min(570, Math.max(30, cx + (offset % 2 ? 50 : -40))),
      y: Math.min(390, Math.max(35, cy + 40 + Math.floor(offset / 2) * 30)),
      kind: map.id.toLowerCase().includes('route') ? 'route' : 'landmark',
      description: map.subtitle,
      services: '自由步道 · 生态观察 · 剧情调查',
    });
    offset++;
  }
}
export const REGION_ROADS: (readonly [string, string])[] = [
  ['dawn', 'route'],
  ['route', 'moss'],
  ['moss', 'forest'],
  ['forest', 'stoneRoute'],
  ['stoneRoute', 'town-2'],
  ['town-2', 'mine'],
  ['town-2', 'coastRoute'],
  ['coastRoute', 'town-3'],
  ['town-3', 'tideworks'],
  ['town-2', 'town-6'],
  ['town-6', 'town-8'],
  ['town-8', 'town-5'],
  ['town-8', 'town-7'],
  ['town-7', 'town-4'],
  ['town-4', 'town-3'],
  ['town-3', 'moss'],
  ['forest', 'town-7'],
  ['town-5', 'ruins'],
  ['ruins', 'town-4'],
  ['town-8', 'league'],
  ['town-3', 'powerRoute'],
  ['powerRoute', 'town-4'],
  ['powerRoute', 'powerStation'],
];

export function regionPlaceForMap(map: MapId): RegionPlace {
  return REGION_PLACES.find(
    (place) =>
      place.map ===
      (map === 'gym'
        ? 'moss'
        : map === 'rockGym'
          ? 'stone'
          : map === 'waterGym'
            ? 'harbor'
            : (ADVENTURE_GYMS.find((g) => g.map === map)?.town ?? map)),
  )!;
}

/** Planned connections remain dotted even when both endpoint towns are playable. */
export function regionRoadOpen(from: string, to: string): boolean {
  const start = REGION_PLACES.find((place) => place.id === from)?.map;
  const end = REGION_PLACES.find((place) => place.id === to)?.map;
  return !!start && !!end && MAPS[start].portals.some((p) => regionPlaceForMap(p.map).id === to);
}

/** Tile centres match the complete local map image, including its boundary. */
export function localMapPoint(map: MapId, x: number, y: number) {
  const rows = MAPS[map].rows;
  return { x: (x + 0.5) / rows[0]!.length, y: (y + 0.5) / rows.length };
}
for (const map of Object.values(MAPS))
  for (const portal of map.portals) {
    const a = regionPlaceForMap(map.id),
      b = regionPlaceForMap(portal.map);
    if (
      a.id !== b.id &&
      !REGION_ROADS.some(([x, y]) => (x === a.id && y === b.id) || (y === a.id && x === b.id))
    )
      REGION_ROADS.push([a.id, b.id]);
  }
