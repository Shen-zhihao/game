import { ALL_SPECIES, learnset, MOVES, SPECIES, TYPE_CHART, TYPES } from '../catalog';
import { evolutionRequirementsLabel } from '../../game/evolutionRequirements';
import { Species, Stat, Stats } from '../../game/model';

export const STAT_NAMES: Record<Stat, string> = {
  hp: '体力',
  attack: '攻击',
  defense: '防御',
  specialAttack: '特攻',
  specialDefense: '特防',
  speed: '速度',
};
export interface TrainingPlan {
  speciesId: string;
  role: string;
  familyStrength: number;
  potential: 'standard' | 'balanced' | 'highBase';
  weights: Stats;
  moves: { moveId: string; level: number }[];
  strategy: string;
  caution: string;
  evolution: string;
}
const familyStrength = new Map<string, number>();
for (const species of ALL_SPECIES)
  familyStrength.set(
    species.familyId,
    Math.max(familyStrength.get(species.familyId) ?? 0, species.baseStatTotal),
  );

function makePlan(s: Species): TrainingPlan {
  const b = s.baseStats;
  const available = learnset(s.id);
  const attacks = available.filter((m) => MOVES[m.moveId]!.power > 0);
  const score = (id: string) => {
    const m = MOVES[id]!;
    return (
      m.power *
      b[m.category === 'physical' ? 'attack' : 'specialAttack'] *
      (m.type && s.types.includes(m.type) ? 1.5 : 1)
    );
  };
  const physical = Math.max(
    ...attacks.filter((m) => MOVES[m.moveId]!.category === 'physical').map((m) => score(m.moveId)),
    0,
  );
  const special = Math.max(
    ...attacks.filter((m) => MOVES[m.moveId]!.category === 'special').map((m) => score(m.moveId)),
    0,
  );
  const offense: Stat = physical >= special ? 'attack' : 'specialAttack';
  const fast = b.speed >= 75 && b.speed >= Math.max(b.defense, b.specialDefense);
  const wall = !fast && Math.max(b.defense, b.specialDefense) > b[offense] * 1.12;
  const defense: Stat = b.defense >= b.specialDefense ? 'defense' : 'specialDefense';
  const mixed =
    !wall &&
    physical > 0 &&
    special > 0 &&
    Math.min(physical, special) / Math.max(physical, special) > 0.86;
  const weights: Stats = {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
  };
  let role: string;
  if (wall) {
    role = defense === 'defense' ? '物理守卫' : '特殊守卫';
    weights.hp = 4;
    weights[defense] = 3;
    weights[offense] = 2;
    weights[defense === 'defense' ? 'specialDefense' : 'defense'] = 1;
  } else if (mixed) {
    role = fast ? '高速双攻' : '均衡双攻';
    weights.attack = 3;
    weights.specialAttack = 3;
    weights.hp = fast ? 1 : 3;
    weights.speed = fast ? 3 : 1;
  } else {
    role = `${fast ? '高速' : '耐久'}${offense === 'attack' ? '物攻' : '特攻'}`;
    weights[offense] = 5;
    weights.hp = fast ? 2 : 3;
    weights[fast ? 'speed' : defense === 'defense' ? 'specialDefense' : 'defense'] = fast ? 3 : 2;
  }
  const moves: TrainingPlan['moves'] = [];
  const candidates = [...attacks].sort((a, c) => score(c.moveId) - score(a.moveId));
  // Cover different types first. Each recommendation comes from this form's real learnset.
  for (const m of candidates) {
    if (moves.length >= (mixed ? 3 : 2)) break;
    if (!moves.some((known) => MOVES[known.moveId]!.type === MOVES[m.moveId]!.type))
      moves.push({ moveId: m.moveId, level: m.level });
  }
  const supportOrder = wall
    ? ['recover', 'steady', 'sleep', 'guard', 'focus', 'aim', 'growl', 'quick']
    : fast
      ? ['agility', 'focus', 'shadow_step', 'recover', 'sleep', 'quick', 'aim', 'guard', 'growl']
      : ['focus', 'recover', 'aim', 'sleep', 'quick', 'guard', 'growl'];
  for (const id of supportOrder) {
    const m = available.find((entry) => entry.moveId === id);
    if (m && moves.length < 4 && !moves.some((known) => known.moveId === id))
      moves.push({ moveId: id, level: m.level });
  }
  for (const m of candidates)
    if (moves.length < 4 && !moves.some((known) => known.moveId === m.moveId))
      moves.push({ moveId: m.moveId, level: m.level });
  const strength = familyStrength.get(s.familyId)!;
  const weak = Object.entries(TYPE_CHART)
    .map(([id, row]) => ({ id, multiplier: s.types.reduce((n, t) => n * row[t], 1) }))
    .filter((v) => v.multiplier > 1)
    .sort((a, c) => c.multiplier - a.multiplier)
    .slice(0, 3);
  const support = moves.find((m) => MOVES[m.moveId]!.category === 'status');
  return {
    speciesId: s.id,
    role,
    familyStrength: strength,
    potential: strength <= 500 ? 'standard' : strength <= 550 ? 'balanced' : 'highBase',
    weights,
    moves,
    strategy: `${s.name}以${STAT_NAMES[offense]}带动${s.types.map((t) => TYPES[t]).join('／')}系输出，${wall ? `用${STAT_NAMES[defense]}和体力承受伤害，守心降低被要害命中的概率` : fast ? '提升速度争取先手，达到对手 2／3 倍时可连续出手，再补足体力' : '先保证体力，再增强主攻能力，可用凝神提高要害率'}。${support ? `Lv.${support.level} 学会${MOVES[support.moveId]!.name}后保留一个辅助位。` : ''}`,
    caution: weak.length
      ? `面对${weak.map((v) => `${TYPES[v.id as keyof typeof TYPES]} ×${v.multiplier}`).join('、')}时优先换上能抗住的伙伴。`
      : '没有属性弱点，仍需注意对方的高威力技能与异常状态。',
    evolution: s.evolutions.length
      ? s.evolutions
          .map(
            (e) =>
              `${evolutionRequirementsLabel(e)}，进化为${SPECIES[e.toId]!.name}，保留能力点与亲密度；新增点数可按新定位分配，已加点需重塑药剂返还。`,
          )
          .join(' ')
      : '最终或独立形态：继续提升等级与能力点，在城镇免费回忆已达等级的技能。',
  };
}
export const TRAINING_PLANS: Record<string, TrainingPlan> = Object.fromEntries(
  ALL_SPECIES.map((s) => [s.id, makePlan(s)]),
);
export const GROWTH_WEIGHTS = {
  standard: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  balanced: [1, 2, 3, 4, 5, 5, 4, 3, 2, 1],
  highBase: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
} as const;
/** Only validates points already earned under the former compensation policy. */
export const LEGACY_GROWTH_WEIGHTS = {
  standard: GROWTH_WEIGHTS.highBase,
  balanced: GROWTH_WEIGHTS.balanced,
  highBase: GROWTH_WEIGHTS.standard,
} as const;
export const POTENTIAL_NAMES = {
  standard: '普通成长',
  balanced: '均衡成长',
  highBase: '高强度成长',
};
