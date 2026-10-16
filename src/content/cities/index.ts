import campaign from '../../../docs/剧情规划/剧情规划.json';
import { ITEMS, isOrdinarySpecies, SPECIES } from '../catalog';
import { GameState, MapId, TownId, TypeId } from '../../game/model';
import { sumStats, trainingFor } from '../../game/growth';
import { ADVENTURE_CHAPTERS } from '../adventure';

export interface CityQuest {
  id: string;
  cityId: string;
  name: string;
  client: string;
  story: string;
  condition:
    | { kind: 'collection'; types: TypeId[]; target: number }
    | { kind: 'delivery'; items: Record<string, number> }
    | { kind: 'training'; target: number }
    | { kind: 'flag'; flag: string; label: string };
  reward: { money: number; merit: number; items: Record<string, number> };
}
export interface CityService {
  id: string;
  name: string;
  map: TownId | null;
  merchant: string;
  implemented: boolean;
  stock: string[];
  quests: CityQuest[];
  exchanges: { id: string; cityId: string; itemId: string; quantity: number; cost: number }[];
}
const supplies = [
  'ball',
  'great_ball',
  'ultra_ball',
  'potion',
  'super_potion',
  'hyper_potion',
  'revive',
  'antidote',
  'ether',
  'candy',
  'respec',
  'skill_copy',
];
function city(
  id: string,
  name: string,
  map: TownId | null,
  merchant: string,
  specialties: string[],
  quests: Omit<CityQuest, 'cityId'>[],
): CityService {
  return {
    id,
    name,
    map,
    merchant,
    implemented: map !== null,
    stock: [...supplies, ...specialties],
    quests: quests.map((q) => ({ ...q, cityId: id })),
    exchanges: ['respec', ...specialties, 'candy', 'skill_copy'].map((itemId) => ({
      id: `${id}_${itemId}`,
      cityId: id,
      itemId,
      quantity: 1,
      cost: itemId === 'respec' || itemId === 'candy' ? 2 : 3,
    })),
  };
}
export const CITIES: CityService[] = [
  city(
    'dawn',
    '晨芽镇',
    'dawn',
    '花园旅行商',
    ['growth_seed'],
    [
      {
        id: 'dawn_field',
        name: '初次野外笔记',
        client: '岚博士',
        story: '记录两种普通野生精灵。只查阅图鉴，不带走你的伙伴；以前的捕获也算数。',
        condition: { kind: 'collection', types: [], target: 2 },
        reward: { money: 180, merit: 2, items: { ball: 3 } },
      },
      {
        id: 'dawn_care',
        name: '花园的急救箱',
        client: '花园管理员',
        story: '给公共急救箱补上两份草露药。领取奖励时一次性交付。',
        condition: { kind: 'delivery', items: { potion: 2 } },
        reward: { money: 100, merit: 2, items: { antidote: 2 } },
      },
      {
        id: 'dawn_training',
        name: '伙伴的第一份计划',
        client: '培养教练',
        story:
          '为任意一只伙伴分配至少 10 点能力点，尝试自己的培养方向。奖励的重塑药剂可以帮助你重新选择。',
        condition: { kind: 'training', target: 10 },
        reward: { money: 150, merit: 2, items: { respec: 1, skill_copy: 1 } },
      },
    ],
  ),
  city(
    'moss',
    '苔丘镇',
    'moss',
    '林间补给商',
    ['growth_seed', 'echo_bell', 'amber_drop'],
    [
      {
        id: 'moss_ecology',
        name: '叶间的小住客',
        client: '研究员穗禾',
        story: '记录两种草系或虫系的普通野生精灵，帮助补全森林栖地手册。',
        condition: { kind: 'collection', types: ['grass', 'bug'], target: 2 },
        reward: { money: 250, merit: 3, items: { candy: 1 } },
      },
      {
        id: 'moss_rescue',
        name: '回到灯火下',
        client: '护林站',
        story: '帮助穗禾找到森林里的萤灯蛾。森林调查可随时开展，不限制道馆挑战顺序。',
        condition: { kind: 'flag', flag: 'rescued', label: '完成森林救援' },
        reward: { money: 280, merit: 3, items: { growth_seed: 1 } },
      },
      {
        id: 'moss_aid',
        name: '护林员的药袋',
        client: '巡林员',
        story: '准备三份清醒露，让巡林员不用为草丛中的异常状态担心。',
        condition: { kind: 'delivery', items: { antidote: 3 } },
        reward: { money: 160, merit: 2, items: { super_potion: 2 } },
      },
    ],
  ),
  city(
    'stone',
    '石脊城',
    'stone',
    '山城补给商',
    ['old_inscription', 'dragon_scale', 'moon_shard'],
    [
      {
        id: 'stone_ecology',
        name: '岩层里的邻居',
        client: '山地调查员',
        story: '记录三种岩石系或地面系的普通野生精灵。不需要交付或放生伙伴。',
        condition: { kind: 'collection', types: ['rock', 'ground'], target: 3 },
        reward: { money: 350, merit: 3, items: { ball: 5 } },
      },
      {
        id: 'stone_mine',
        name: '矿灯重新亮起',
        client: '矿长砚叔',
        story: '查清旧矿山的异常并关闭共鸣装置。矿山调查线沿用原有线索与报告进度。',
        condition: { kind: 'flag', flag: 'mineStabilized', label: '关闭旧矿山异常装置' },
        reward: { money: 400, merit: 4, items: { candy: 2 } },
      },
      {
        id: 'stone_aid',
        name: '矿队的归途',
        client: '矿队医护员',
        story: '向矿队交付草露药三份、清醒露一份，给返程工人留好补给。',
        condition: { kind: 'delivery', items: { potion: 3, antidote: 1 } },
        reward: { money: 250, merit: 3, items: { respec: 1, ether: 1 } },
      },
    ],
  ),
];
const futureSpecialties = [
  ['tide_pearl', 'frost_crystal'],
  ['thunder_core'],
  ['wind_plume', 'frost_crystal'],
  ['forged_heart'],
  ['moon_shard', 'dusk_veil'],
  ['old_inscription', 'dragon_scale'],
];
const futureTypes: TypeId[][] = [
  ['water', 'ice'],
  ['electric', 'steel'],
  ['flying'],
  ['fire', 'steel'],
  ['psychic', 'ghost'],
  ['dragon', 'fairy'],
];
for (const [index, gym] of campaign.gyms.slice(2).entries()) {
  const id = `city_${gym.number}`;
  CITIES.push(
    city(
      id,
      gym.town,
      index === 0
        ? 'harbor'
        : (ADVENTURE_CHAPTERS.find((c) => c.number === gym.number)?.town ?? null),
      `${gym.town}补给行`,
      futureSpecialties[index]!,
      [
        {
          id: `${id}_ecology`,
          name: `${gym.town}生态手册`,
          client: `${gym.town}调查站`,
          story: '记录本地普通精灵，丰富地区图鉴。在开放的城镇可接受并领取。',
          condition: { kind: 'collection', types: futureTypes[index]!, target: 3 },
          reward: { money: 400, merit: 3, items: { candy: 1 } },
        },
        {
          id: `${id}_aid`,
          name: `${gym.town}旅人补给`,
          client: '旅人协会',
          story: '为当地旅行者准备恢复品。在开放的城镇可接受并领取。',
          condition: { kind: 'delivery', items: { super_potion: 2, ether: 1 } },
          reward: { money: 350, merit: 3, items: { [futureSpecialties[index]![0]!]: 1 } },
        },
        {
          id: `${id}_training`,
          name: `${gym.leader}的培养建议`,
          client: gym.leader,
          story:
            '培养一位伙伴并交流加点经验；只作可选委托，不作为入馆条件。在开放的城镇可接受并领取。',
          condition: { kind: 'training', target: 50 + index * 20 },
          reward: { money: 450, merit: 4, items: { respec: 1 } },
        },
      ],
    ),
  );
}
export const CITY_QUESTS = Object.fromEntries(
  CITIES.flatMap((c) => c.quests.map((q) => [q.id, q])),
);
export const CITY_EXCHANGES = Object.fromEntries(
  CITIES.flatMap((c) => c.exchanges.map((o) => [o.id, o])),
);
export const cityFor = (map: MapId) =>
  CITIES.find((c) => c.map === (map === 'league' ? 'star' : map));
export const servicesUnlocked = (game: GameState) => !!game.progress.flags.catchTutorial;
export function shopStock(game: GameState): string[] {
  const c = cityFor(game.player.map);
  if (!c || !servicesUnlocked(game)) return [];
  // Keep the previous forest-report shop source for all evolution items available.
  const backup = game.progress.flags.questReward
    ? Object.keys(ITEMS).filter(
        (id) => !supplies.includes(id) && id !== 'master_ball' && ITEMS[id]!.pocket !== 'key',
      )
    : [];
  return [...new Set([...c.stock, ...backup])];
}
export function questProgress(game: GameState, quest: CityQuest) {
  const condition = quest.condition;
  switch (condition.kind) {
    case 'collection': {
      const current = game.dex.caught.filter(
        (id) =>
          isOrdinarySpecies(id) &&
          (!condition.types.length || SPECIES[id]!.types.some((t) => condition.types.includes(t))),
      ).length;
      return {
        current: Math.min(current, condition.target),
        target: condition.target,
        ready: current >= condition.target,
        label: '已登记普通野生精灵',
      };
    }
    case 'training': {
      const current = Math.max(
        0,
        ...Object.values(game.creatures).map((c) => sumStats(trainingFor(c).allocated)),
      );
      return {
        current: Math.min(current, condition.target),
        target: condition.target,
        ready: current >= condition.target,
        label: '单只伙伴已分配能力点',
      };
    }
    case 'flag':
      return {
        current: game.progress.flags[condition.flag] ? 1 : 0,
        target: 1,
        ready: !!game.progress.flags[condition.flag],
        label: condition.label,
      };
    case 'delivery': {
      const target = Object.values(condition.items).reduce((sum, n) => sum + n, 0);
      const current = Object.entries(condition.items).reduce(
        (sum, [id, n]) => sum + Math.min(n, game.inventory[id] ?? 0),
        0,
      );
      return {
        current,
        target,
        ready: current === target,
        label: Object.entries(condition.items)
          .map(([id, n]) => `${ITEMS[id]!.name} ${Math.min(n, game.inventory[id] ?? 0)}/${n}`)
          .join(' · '),
      };
    }
  }
}
