import design from '../../docs/data/creature-types.json';
import { Curve, Species, TypeId } from '../game/model';

export const CONTENT_VERSION = 'ch1.1';
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
export const TYPE_CHART = design.typeChart as Record<TypeId, Record<TypeId, number>>;
export const STARTERS = ['creature_001', 'creature_004', 'creature_007'];
export const CHAPTER_SPECIES = [
  'creature_001',
  'creature_002',
  'creature_004',
  'creature_005',
  'creature_007',
  'creature_008',
  'creature_010',
  'creature_013',
  'creature_014',
  'creature_015',
  'creature_016',
  'creature_017',
  'creature_025',
  'creature_027',
  'creature_037',
  'creature_038',
  'creature_040',
];
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
export const ITEMS: Record<string, { name: string; price: number; description: string }> = {
  ball: { name: '星纹球', price: 100, description: '捕捉野生精灵；HP 越低越容易成功。' },
  potion: { name: '草露药', price: 80, description: '恢复一只精灵 30 点 HP。' },
  antidote: { name: '清醒露', price: 60, description: '解除一只精灵的异常状态。' },
  candy: { name: '成长果', price: 500, description: '获得到下一级所需的经验。' },
  ...Object.fromEntries(
    design.evolutionItems.map((i) => [
      i.id,
      { name: i.name, price: 600, description: '满足等级条件后，让对应精灵进化；成功后消耗。' },
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
  effect?: {
    status?: 'poison' | 'burn' | 'paralysis' | 'sleep';
    chance?: number;
    heal?: number;
    stage?: 'attack' | 'defense' | 'specialAttack' | 'speed';
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
      ...(['fire', 'electric', 'poison'].includes(type)
        ? {
            effect: {
              status: type === 'fire' ? 'burn' : type === 'electric' ? 'paralysis' : 'poison',
              chance: 0.12,
            } as Move['effect'],
          }
        : {}),
    };
  }
}
export function learnset(speciesId: string): { level: number; moveId: string }[] {
  const species = SPECIES[speciesId]!;
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
    { level: 16, moveId: species.types.includes('grass') ? 'sleep' : 'guard' },
    ...species.types.slice(1).map((type, i) => ({ level: 18 + i * 4, moveId: `${type}_2` })),
  ].filter((v, i, arr) => arr.findIndex((m) => m.moveId === v.moveId) === i);
}
export function habitat(speciesId: string): string {
  if (
    [
      'creature_001',
      'creature_002',
      'creature_004',
      'creature_005',
      'creature_007',
      'creature_008',
    ].includes(speciesId)
  )
    return '晨芽镇 · 伙伴赠予 / 进化';
  if (['creature_037', 'creature_038', 'creature_040', 'creature_010'].includes(speciesId))
    return '晨光一号路';
  if (
    [
      'creature_013',
      'creature_014',
      'creature_015',
      'creature_016',
      'creature_017',
      'creature_025',
      'creature_027',
    ].includes(speciesId)
  )
    return '苔影森林';
  return '后续章节尚未开放';
}
