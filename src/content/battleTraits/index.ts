import type { Creature, Status, TypeId, WeatherId } from '../../game/model';

export interface AbilityDefinition {
  name: string;
  description: string;
  lowHpType?: TypeId;
  immuneType?: TypeId;
  immuneStatus?: Status;
  physicalBoost?: number;
  physicalGuard?: number;
  specialGuard?: number;
  fullHpGuard?: number;
  sturdy?: boolean;
  clearSight?: boolean;
  switchHeal?: number;
  weatherSpeed?: { weather: WeatherId; multiplier: number };
  resistTypes?: TypeId[];
}
export const ABILITIES = {
  clear_sight: {
    name: '明察',
    description: '自身命中能力降低时，仍按未降低的命中能力出招。',
    clearSight: true,
  },
  verdant: {
    name: '新芽之力',
    description: '体力不高于三分之一时，草系招式伤害提高30%。',
    lowHpType: 'grass',
  },
  ember: {
    name: '余烬之心',
    description: '体力不高于三分之一时，火系招式伤害提高30%。',
    lowHpType: 'fire',
  },
  torrent: {
    name: '潮涌',
    description: '体力不高于三分之一时，水系招式伤害提高30%。',
    lowHpType: 'water',
  },
  volt_absorb: {
    name: '蓄电',
    description: '受到电系招式时免受伤害，并恢复最大体力的四分之一。',
    immuneType: 'electric',
  },
  levitate: { name: '轻浮', description: '免疫以自身为目标的地面系招式。', immuneType: 'ground' },
  sturdy: { name: '岩心', description: '满体力受到致命招式时，至少留下1点体力。', sturdy: true },
  armor: { name: '织甲', description: '受到的物理招式伤害减少15%。', physicalGuard: 0.85 },
  insulated: { name: '隔流层', description: '受到的特殊招式伤害减少15%。', specialGuard: 0.85 },
  clear_mind: { name: '清心', description: '不会被招式催眠。', immuneStatus: 'sleep' },
  inner_fire: { name: '不息', description: '不会被招式麻痹。', immuneStatus: 'paralysis' },
  thick_coat: {
    name: '绒羽',
    description: '受到的火系和冰系招式伤害减少25%。',
    resistTypes: ['fire', 'ice'],
  },
  regrowth: {
    name: '归巢',
    description: '对战中主动换下且仍有体力时，恢复最大体力的五分之一。',
    switchHeal: 0.2,
  },
  sand_runner: {
    name: '踏沙',
    description: '扬沙天气中速度提高25%。',
    weatherSpeed: { weather: 'sand', multiplier: 1.25 },
  },
  iron_fist: { name: '劲骨', description: '物理招式伤害提高15%。', physicalBoost: 1.15 },
  multiscale: {
    name: '完整鳞甲',
    description: '满体力时，受到的招式伤害减少25%。',
    fullHpGuard: 0.75,
  },
} as const satisfies Record<string, AbilityDefinition>;
export type AbilityId = keyof typeof ABILITIES;
const TYPE_ABILITIES: Record<TypeId, AbilityId> = {
  normal: 'clear_sight',
  grass: 'verdant',
  fire: 'ember',
  water: 'torrent',
  electric: 'volt_absorb',
  bug: 'armor',
  flying: 'levitate',
  rock: 'sturdy',
  poison: 'regrowth',
  ground: 'sand_runner',
  ice: 'thick_coat',
  fighting: 'iron_fist',
  psychic: 'clear_mind',
  ghost: 'inner_fire',
  dragon: 'multiscale',
  dark: 'clear_sight',
  steel: 'insulated',
  fairy: 'regrowth',
};
/** A species keeps one authored trait; evolving reads its new species' trait. No save RNG changes. */
export const speciesAbility = (types: readonly TypeId[]): AbilityId =>
  TYPE_ABILITIES[types[0] ?? 'normal'];

export interface HeldItemDefinition {
  name: string;
  price: number;
  description: string;
  color: string;
  boostType?: TypeId;
  physicalBoost?: number;
  specialBoost?: number;
  physicalGuard?: number;
  speed?: number;
  criticalStage?: number;
  endHeal?: number;
  berryHeal?: number;
  cureStatus?: boolean;
}
export const HELD_ITEMS = {
  held_berry: {
    name: '甘露果',
    price: 180,
    description: '携带后，体力降到一半或以下时自动恢复最大体力的四分之一，触发后消耗。',
    color: '#dba0a3',
    berryHeal: 0.25,
  },
  held_cleanse: {
    name: '清露果',
    price: 220,
    description: '携带后，自动解除一次异常状态（含冰冻）与混乱，触发后消耗。',
    color: '#aab99a',
    cureStatus: true,
  },
  held_leftovers: {
    name: '暖食盒',
    price: 1800,
    description: '携带后，每个完整回合结束恢复最大体力的十六分之一，可重复使用。',
    color: '#c6ae7d',
    endHeal: 1 / 16,
  },
  held_band: {
    name: '编织护腕',
    price: 1200,
    description: '携带后，物理招式伤害提高10%。',
    color: '#cfaa8b',
    physicalBoost: 1.1,
  },
  held_lens: {
    name: '聚光镜',
    price: 1200,
    description: '携带后，特殊招式伤害提高10%。',
    color: '#a6bfc3',
    specialBoost: 1.1,
  },
  held_boots: {
    name: '轻步铃',
    price: 1400,
    description: '携带后，速度提高10%，参与行动次数与出手顺序计算。',
    color: '#d1be82',
    speed: 1.1,
  },
  held_shell: {
    name: '层岩护符',
    price: 1400,
    description: '携带后，受到的物理招式伤害减少10%。',
    color: '#b9b19c',
    physicalGuard: 0.9,
  },
  held_scope: {
    name: '星纹瞄镜',
    price: 1800,
    description: '携带后，要害率提高一级，换下场后仍保留。',
    color: '#b5a4c2',
    criticalStage: 1,
  },
  held_seed: {
    name: '萌芽胸针',
    price: 1000,
    description: '携带后，草系招式伤害提高20%。',
    color: '#a6b990',
    boostType: 'grass',
  },
  held_charcoal: {
    name: '余温陶坠',
    price: 1000,
    description: '携带后，火系招式伤害提高20%。',
    color: '#d3a089',
    boostType: 'fire',
  },
  held_pearl: {
    name: '潮珠挂饰',
    price: 1000,
    description: '携带后，水系招式伤害提高20%。',
    color: '#a1bebd',
    boostType: 'water',
  },
} as const satisfies Record<string, HeldItemDefinition>;
export type HeldItemId = keyof typeof HELD_ITEMS;
export const isHeldItem = (id: string): id is HeldItemId => Object.hasOwn(HELD_ITEMS, id);
export function heldEffect(c: Pick<Creature, 'heldItem'>): HeldItemDefinition | undefined {
  return c.heldItem ? HELD_ITEMS[c.heldItem] : undefined;
}
