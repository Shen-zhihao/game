import design from '../../../docs/精灵属性/精灵设计数据.json';
import acquisition from '../../../docs/精灵获取/稀有精灵获取.json';
import { EXPANSION_SPRITES } from '../sprites';
import { CombatStage, Curve, Species, TypeId } from '../../game/model';
import { KEY_ITEMS } from '../keyItems';
import { SIGNATURES, SIGNATURE_BY_SPECIES } from '../signatures';
import { HELD_ITEMS } from '../battleTraits';

export const CONTENT_VERSION = 'ch11.3';
export const supportsContentVersion = (version: string) =>
  version === CONTENT_VERSION ||
  version === 'ch11.2' ||
  version === 'ch11.1' ||
  version === 'ch11.0' ||
  version === 'ch10.6' ||
  version === 'ch10.5' ||
  version === 'ch10.4' ||
  version === 'ch10.3' ||
  version === 'ch10.2' ||
  version === 'ch10.1' ||
  version === 'ch10.0' ||
  version === 'ch9.0' ||
  version === 'ch8.0' ||
  version === 'ch7.0' ||
  version === 'ch6.0' ||
  version === 'ch5.0' ||
  version === 'ch4.0' ||
  version === 'ch3.1' ||
  version === 'ch3.0' ||
  version === 'ch2.3' ||
  version === 'ch2.2' ||
  version === 'ch2.1' ||
  version === 'ch2.0' ||
  version === 'ch1.3' ||
  version === 'ch1.2' ||
  version === 'ch1.1';
export const TYPE_IDS = design.types.map((type) => type.id as TypeId);
export const TYPES = Object.fromEntries(design.types.map((t) => [t.id, t.name])) as Record<
  TypeId,
  string
>;
export const TYPE_COLORS: Record<TypeId, string> = {
  normal: '#a7b2a5',
  grass: '#78c65b',
  fire: '#ee9256',
  water: '#64b8df',
  electric: '#e9cd58',
  bug: '#b1c96b',
  flying: '#9ebee2',
  rock: '#c6ac76',
  poison: '#c495cc',
  ground: '#c99d6e',
  ice: '#96dad9',
  fighting: '#d77d6d',
  psychic: '#ef97b5',
  ghost: '#a19cce',
  dragon: '#9789e6',
  dark: '#aa9f96',
  steel: '#9dbcc2',
  fairy: '#e8b2d1',
};
export const SPECIES: Record<string, Species> = {};
for (const family of design.families) {
  for (const form of family.forms) {
    SPECIES[form.id] = {
      ...form,
      types: form.types as TypeId[],
      experienceCurve: form.experienceCurve as Curve,
      familyId: family.id,
    } as Species;
  }
}
export const ALL_SPECIES = Object.values(SPECIES).sort((a, b) => a.dexNumber - b.dexNumber);
const STORY_FAMILIES = new Set(acquisition.families.map((f) => f.familyId));
export function isOrdinarySpecies(speciesId: string): boolean {
  const species = SPECIES[speciesId];
  return !!species && !STORY_FAMILIES.has(species.familyId);
}
export const TYPE_CHART = design.typeChart as Record<TypeId, Record<TypeId, number>>;
export const STARTERS = ['creature_001', 'creature_004', 'creature_007'];
export const SPRITE_CELL: Record<string, number> = {
  creature_001: 0,
  creature_004: 1,
  creature_007: 2,
  creature_010: 3,
  creature_013: 4,
  creature_014: 5,
  creature_015: 6,
  creature_037: 7,
  creature_038: 7,
  creature_040: 8,
  creature_025: 9,
  creature_027: 10,
  creature_016: 11,
  creature_002: 12,
  creature_005: 13,
  creature_008: 14,
  creature_017: 15,
};
export const HIGHLAND_SPRITE_CELL: Record<string, number> = Object.fromEntries(
  [49, 50, 59, 60, 61, 62, 63, 64, 68, 69, 70, 71, 72, 75, 76, 77].map((number, cell) => [
    `creature_${String(number).padStart(3, '0')}`,
    cell,
  ]),
);
export const COAST_SPRITE_CELL: Record<string, number> = Object.fromEntries(
  Array.from({ length: 16 }, (_, i) => [`creature_${String(79 + i).padStart(3, '0')}`, i]),
);
export const TIDAL_SPRITE_CELL: Record<string, number> = Object.fromEntries(
  [95, 96, 97, 98, 99, 187, 188, 189, 190, 191, 192, 196, 197, 198, 199, 200].map((n, i) => [
    `creature_${String(n).padStart(3, '0')}`,
    i,
  ]),
);
export const ELECTRIC_SPRITE_CELL: Record<string, number> = Object.fromEntries(
  [43, 44, 45, 73, 74, 129, 130, 131, 132, 133, 134, 135, 136, 137, 18, 140].map((n, i) => [
    `creature_${String(n).padStart(3, '0')}`,
    i,
  ]),
);
export function spriteFor(speciesId: string): { atlas: string; cell: number } | null {
  if (speciesId === 'creature_017') return { atlas: 'moth', cell: 0 };
  const extra = EXPANSION_SPRITES[speciesId];
  if (extra) return extra;
  const sources: [string, Record<string, number>][] = [
    ['electric', ELECTRIC_SPRITE_CELL],
    ['coast', COAST_SPRITE_CELL],
    ['tidal', TIDAL_SPRITE_CELL],
    ['highlands', HIGHLAND_SPRITE_CELL],
    ['ch1', SPRITE_CELL],
  ];
  for (const [atlas, locations] of sources)
    if (locations[speciesId] !== undefined) return { atlas, cell: locations[speciesId]! };
  return null;
}
export const ITEM_POCKETS = {
  balls: '精灵球',
  medicine: '回复道具',
  training: '培养道具',
  evolution: '进化道具',
  key: '重要物品',
  held: '携带道具',
  field: '探索道具',
} as const;
export type ItemPocket = keyof typeof ITEM_POCKETS;
export const ITEMS: Record<
  string,
  { name: string; price: number; description: string; pocket: ItemPocket }
> = {
  repel: {
    name: '驱避喷雾',
    price: 200,
    description:
      '持续 100 步，驱避等级低于队伍第一位可出战伙伴的普通野生精灵。不影响钓鱼、训练师和固定相遇。',
    pocket: 'field',
  },
  ...Object.fromEntries(
    Object.entries(HELD_ITEMS).map(([id, item]) => [
      id,
      {
        name: item.name,
        price: item.price,
        description: item.description,
        pocket: 'held' as const,
      },
    ]),
  ),
  ball: {
    name: '星纹球',
    price: 100,
    description: '捕捉野生精灵；HP 越低越容易成功。',
    pocket: 'balls',
  },
  great_ball: {
    name: '超级星纹球',
    price: 250,
    description: '捕捉倍率 ×1.5，适合较少见的精灵。',
    pocket: 'balls',
  },
  ultra_ball: {
    name: '高级星纹球',
    price: 600,
    description: '捕捉倍率 ×2.5，适合稀有、强力或高等级精灵。',
    pocket: 'balls',
  },
  master_ball: {
    name: '大师球',
    price: 0,
    description:
      '必定捕获已开启相遇的野生／剧情精灵，不能捕捉训练师伙伴或救援序章精灵。正常剧情最多三个，商店与兑换均不提供；金手指额外授予单独记账。',
    pocket: 'balls',
  },
  potion: { name: '草露药', price: 80, description: '恢复一只精灵 30 点 HP。', pocket: 'medicine' },
  hyper_potion: {
    name: '高浓草露药',
    price: 600,
    description: '恢复一只未昏厥精灵 200 点 HP，适合长途与联盟连战。',
    pocket: 'medicine',
  },
  revive: {
    name: '复苏芽',
    price: 1000,
    description: '让一只昏厥伙伴恢复一半 HP；不会恢复 PP。战斗中可用于替补伙伴，使用占一回合。',
    pocket: 'medicine',
  },
  antidote: {
    name: '清醒露',
    price: 60,
    description: '解除一只精灵的中毒、灼伤、麻痹、睡眠、冰冻及混乱；可同时清除异常与混乱。',
    pocket: 'medicine',
  },
  candy: {
    name: '成长果',
    price: 500,
    description: '获得到下一级所需的经验。',
    pocket: 'training',
  },
  super_potion: {
    name: '浓缩草露药',
    price: 220,
    description: '恢复一只未昏厥的精灵 100 点 HP，战斗中也能使用。',
    pocket: 'medicine',
  },
  ether: {
    name: '星泉露',
    price: 240,
    description: '为一只未昏厥精灵的每个技能恢复 10 点 PP，战斗中也能使用。',
    pocket: 'medicine',
  },
  respec: {
    name: '重塑药剂',
    price: 800,
    description:
      '在城镇对满体力、无异常的伙伴使用，返还全部已分配能力点后重新分配。等级与随机成长记录不变；已确认点数只能通过此药剂重置。',
    pocket: 'training',
  },
  skill_copy: {
    name: '技能复刻剂',
    price: 600,
    description:
      '复制一位伙伴当前掌握的技能给任意伙伴，不限种族、属性或等级。成功学习消耗一瓶；来源保留技能，忘记后可在城镇免费回忆。',
    pocket: 'training',
  },
  ...Object.fromEntries(
    design.evolutionItems.map((i) => [
      i.id,
      {
        name: i.name,
        price: 600,
        description: '满足等级条件后，让对应精灵进化；成功后消耗。',
        pocket: 'evolution' as const,
      },
    ]),
  ),
  ...Object.fromEntries(
    KEY_ITEMS.map((item) => [
      item.id,
      { name: item.name, price: 0, description: item.description, pocket: 'key' as const },
    ]),
  ),
};
export interface Move {
  id: string;
  name: string;
  type: TypeId | null;
  category: 'physical' | 'special' | 'status';
  power: number;
  accuracy: number;
  pp: number;
  priority: number;
  /** Only this exact species can own/use the move; no copy items can teach it. */
  exclusiveSpeciesId?: string;
  criticalStage?: number;
  weather?: import('../../game/model').WeatherId;
  effect?: {
    status?: 'poison' | 'burn' | 'paralysis' | 'sleep' | 'freeze';
    confusion?: boolean;
    chance?: number;
    heal?: number;
    stage?: CombatStage;
    amount?: number;
    target?: 'self' | 'enemy';
  };
}
export const MOVES: Record<string, Move> = {
  tackle: {
    id: 'tackle',
    name: '撞击',
    type: 'normal',
    category: 'physical',
    power: 40,
    accuracy: 100,
    pp: 35,
    priority: 0,
  },
  flame_tail: {
    id: 'flame_tail',
    name: '炽尾扫击',
    type: 'fire',
    category: 'physical',
    power: 55,
    accuracy: 100,
    pp: 20,
    priority: 0,
  },
  water_tail: {
    id: 'water_tail',
    name: '水尾拍击',
    type: 'water',
    category: 'physical',
    power: 55,
    accuracy: 100,
    pp: 20,
    priority: 0,
  },
  quick: {
    id: 'quick',
    name: '疾步冲撞',
    type: 'normal',
    category: 'physical',
    power: 35,
    accuracy: 100,
    pp: 25,
    priority: 1,
  },
  growl: {
    id: 'growl',
    name: '示威',
    type: 'normal',
    category: 'status',
    power: 0,
    accuracy: 100,
    pp: 25,
    priority: 0,
    effect: { stage: 'attack', amount: -1, target: 'enemy' },
  },
  guard: {
    id: 'guard',
    name: '坚壳',
    type: 'normal',
    category: 'status',
    power: 0,
    accuracy: 100,
    pp: 20,
    priority: 0,
    effect: { stage: 'defense', amount: 1, target: 'self' },
  },
  recover: {
    id: 'recover',
    name: '苔息',
    type: 'grass',
    category: 'status',
    power: 0,
    accuracy: 100,
    pp: 8,
    priority: 0,
    effect: { heal: 0.4, target: 'self' },
  },
  sleep: {
    id: 'sleep',
    name: '眠香',
    type: 'grass',
    category: 'status',
    power: 0,
    accuracy: 75,
    pp: 10,
    priority: 0,
    effect: { status: 'sleep', chance: 1 },
  },
  poison: {
    id: 'poison',
    name: '毒粉',
    type: 'poison',
    category: 'status',
    power: 0,
    accuracy: 80,
    pp: 15,
    priority: 0,
    effect: { status: 'poison', chance: 1 },
  },
  confuse_ray: {
    id: 'confuse_ray',
    name: '奇异光线',
    type: 'ghost',
    category: 'status',
    power: 0,
    accuracy: 100,
    pp: 10,
    priority: 0,
    effect: { confusion: true, chance: 1 },
  },
  focus: {
    id: 'focus',
    name: '凝神',
    type: 'psychic',
    category: 'status',
    power: 0,
    accuracy: 100,
    pp: 15,
    priority: 0,
    effect: { stage: 'critical', amount: 2, target: 'self' },
  },
  aim: {
    id: 'aim',
    name: '鹰眼',
    type: 'normal',
    category: 'status',
    power: 0,
    accuracy: 100,
    pp: 15,
    priority: 0,
    effect: { stage: 'accuracy', amount: 2, target: 'self' },
  },
  agility: {
    id: 'agility',
    name: '轻身',
    type: 'flying',
    category: 'status',
    power: 0,
    accuracy: 100,
    pp: 15,
    priority: 0,
    effect: { stage: 'speed', amount: 2, target: 'self' },
  },
  shadow_step: {
    id: 'shadow_step',
    name: '影步',
    type: 'ghost',
    category: 'status',
    power: 0,
    accuracy: 100,
    pp: 15,
    priority: 0,
    effect: { stage: 'evasion', amount: 1, target: 'self' },
  },
  steady: {
    id: 'steady',
    name: '守心',
    type: 'steel',
    category: 'status',
    power: 0,
    accuracy: 100,
    pp: 15,
    priority: 0,
    effect: { stage: 'criticalGuard', amount: 1, target: 'self' },
  },
  keen_strike: {
    id: 'keen_strike',
    name: '破绽突刺',
    type: 'normal',
    category: 'physical',
    power: 55,
    accuracy: 95,
    pp: 15,
    priority: 0,
    criticalStage: 1,
  },
  struggle: {
    id: 'struggle',
    name: '奋力一搏',
    type: null,
    category: 'physical',
    power: 50,
    accuracy: 100,
    pp: 1,
    priority: 0,
  },
};
const attackNames: Record<TypeId, [string, string]> = {
  normal: ['跃身扑击', '回旋冲击'],
  grass: ['叶刃芽', '藤鞭连击'],
  fire: ['火星', '焰尾'],
  water: ['泡沫', '潮汐弹'],
  electric: ['微电弧', '雷光'],
  bug: ['虫咬', '晶丝斩'],
  flying: ['风切', '岚翼'],
  rock: ['碎石', '晶岩坠'],
  poison: ['毒刺', '毒液'],
  ground: ['扬沙击', '地脉波'],
  ice: ['霜息', '冰晶矢'],
  fighting: ['直拳', '破岩掌'],
  psychic: ['念动', '灵波'],
  ghost: ['幽火', '夜影'],
  dragon: ['龙息', '鳞光'],
  dark: ['暗袭', '暮影爪'],
  steel: ['铁爪', '钢羽'],
  fairy: ['星粉', '月辉'],
};
for (const type of TYPE_IDS) {
  for (const [rank, power] of [
    [1, 40],
    [2, 65],
  ] as const) {
    const id = `${type}_${rank}`;
    MOVES[id] = {
      id,
      name: attackNames[type][rank - 1]!,
      type,
      category: ['bug', 'flying', 'rock', 'ground', 'fighting', 'dark', 'steel', 'normal'].includes(
        type,
      )
        ? 'physical'
        : 'special',
      power,
      accuracy: 100,
      pp: rank === 1 ? 25 : 15,
      priority: 0,
      ...(['fire', 'electric', 'poison', 'ice'].includes(type)
        ? {
            effect: {
              status:
                type === 'fire'
                  ? 'burn'
                  : type === 'electric'
                    ? 'paralysis'
                    : type === 'ice'
                      ? 'freeze'
                      : 'poison',
              chance: type === 'ice' ? 0.1 : 0.12,
            } as Move['effect'],
          }
        : {}),
    };
  }
}
for (const [id, name, type, power] of [
  ['field_cut', '剪藤术', 'grass', 50],
  ['field_break', '碎岩术', 'fighting', 55],
  ['surf', '冲浪术', 'water', 80],
] as const)
  MOVES[id] = {
    id,
    name,
    type,
    power,
    category: id === 'surf' ? 'special' : 'physical',
    accuracy: 100,
    pp: 15,
    priority: 0,
  };
for (const [id, name, type, weather] of [
  ['sun_call', '祈晴', 'fire', 'sun'],
  ['rain_call', '唤雨', 'water', 'rain'],
  ['sand_call', '扬沙幕', 'rock', 'sand'],
  ['snow_call', '唤雪', 'ice', 'snow'],
  ['fog_call', '凝雾', 'ghost', 'fog'],
] as const)
  MOVES[id] = {
    id,
    name,
    type,
    weather,
    power: 0,
    category: 'status',
    accuracy: 100,
    pp: 5,
    priority: 0,
    effect: { target: 'self' },
  };
for (const { move } of SIGNATURES) MOVES[move.id] = move;
export function canLearnMove(speciesId: string, moveId: string): boolean {
  const move = Object.hasOwn(MOVES, moveId) ? MOVES[moveId] : undefined;
  return !!move && (!move.exclusiveSpeciesId || move.exclusiveSpeciesId === speciesId);
}
export function learnset(speciesId: string): { level: number; moveId: string }[] {
  const species = SPECIES[speciesId]!;
  const signature = SIGNATURE_BY_SPECIES[speciesId];
  return [
    { level: 1, moveId: 'tackle' },
    { level: 1, moveId: `${species.types[0]}_1` },
    { level: 4, moveId: 'growl' },
    {
      level: 7,
      moveId:
        species.types[0] === 'fire'
          ? 'flame_tail'
          : species.types[0] === 'water'
            ? 'water_tail'
            : species.types.includes('grass')
              ? 'recover'
              : 'quick',
    },
    { level: 10, moveId: `${species.types[1] ?? species.types[0]}_1` },
    { level: 12, moveId: `${species.types[0]}_2` },
    ...(species.types.some((type) => type === 'psychic' || type === 'ghost')
      ? [{ level: 14, moveId: 'confuse_ray' }]
      : []),
    { level: 16, moveId: species.types.includes('grass') ? 'sleep' : 'guard' },
    ...species.types.slice(1).map((type, i) => ({ level: 18 + i * 4, moveId: `${type}_2` })),
    { level: 9, moveId: 'focus' },
    { level: 15, moveId: 'aim' },
    { level: 22, moveId: 'agility' },
    {
      level: 24,
      moveId: species.types.some((t) => ['ghost', 'dark', 'flying'].includes(t))
        ? 'shadow_step'
        : 'steady',
    },
    { level: 28, moveId: 'keen_strike' },
    ...(signature ? [{ level: signature.level, moveId: signature.move.id }] : []),
    {
      level: 32,
      moveId: species.types.includes('water')
        ? 'rain_call'
        : species.types.includes('ice')
          ? 'snow_call'
          : species.types.some((t) => ['rock', 'ground', 'steel'].includes(t))
            ? 'sand_call'
            : species.types.some((t) => ['ghost', 'dark', 'psychic'].includes(t))
              ? 'fog_call'
              : 'sun_call',
    },
  ]
    .sort((a, b) => a.level - b.level)
    .filter((v, i, arr) => arr.findIndex((m) => m.moveId === v.moveId) === i);
}
export { habitat } from '../habitats';
