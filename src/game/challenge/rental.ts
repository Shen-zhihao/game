import { MOVES, SPECIES, TYPE_IDS, canLearnMove } from '../../content/catalog';
import type { Creature, GameState } from '../model';
import { abilityFor, makeCreature, typeMultiplier } from '../rules';

/** Fixed authored lineups: loading a save or previewing a team never rerolls the route. */
const RENTAL_STAGES = [
  {
    name: '试炼教官 · 岑岩',
    theme: '攻防基础',
    hint: '以单属性攻防与强化为主。观察克制，别只选择同一种属性的伙伴。',
    team: [
      {
        species: 'creature_102',
        moves: ['rock_2', 'double_strike', 'guard', 'clear_field'],
        item: 'held_berry',
      },
      {
        species: 'creature_108',
        moves: ['ice_2', 'double_strike', 'focus', 'protect'],
        item: 'held_berry',
      },
      {
        species: 'creature_052',
        moves: ['dark_2', 'keen_strike', 'agility', 'clear_field'],
        item: 'held_berry',
      },
    ],
  },
  {
    name: '阵地教官 · 泠川',
    theme: '陷阱与接力',
    hint: '首发可布置地刺，后排兼顾雨天与汲取。准备清场或浮空伙伴，换人前留意入场伤害。',
    team: [
      {
        species: 'creature_067',
        moves: ['ground_2', 'spikes', 'protect', 'double_strike'],
        item: 'held_shell',
      },
      {
        species: 'creature_090',
        moves: ['water_2', 'dragon_2', 'rain_call', 'clear_field'],
        item: 'held_berry',
      },
      {
        species: 'creature_119',
        moves: ['shadow_drain', 'fire_2', 'protect', 'confuse_ray'],
        item: 'held_shell',
      },
    ],
  },
  {
    name: '租借大师 · 岚衡',
    theme: '终场 · 均衡破阵',
    hint: '隐形岩、寄生吸取与古曜龙压轴相互配合。清场、属性覆盖和及时换人都很重要。',
    team: [
      {
        species: 'creature_009',
        moves: ['stealth_rock', 'water_2', 'rock_2', 'clear_field'],
        item: 'held_leftovers',
      },
      {
        species: 'creature_003',
        moves: ['leech_seed', 'giga_drain', 'fairy_2', 'protect'],
        item: 'held_shell',
      },
      {
        species: 'creature_243',
        moves: ['signature_243', 'fire_2', 'shadow_drain', 'clear_field'],
        item: 'held_band',
      },
    ],
  },
] as const;

export function rentalStage(streak: number) {
  const index = Math.max(0, Math.min(2, Math.floor(streak)));
  return RENTAL_STAGES[index]!;
}
export function makeRentalOpponents(g: GameState, streak: number): Creature[] {
  return rentalStage(streak).team.map((entry) => {
    const c = makeCreature(g, entry.species, 50, true);
    // Authored loadouts must remain legal if the catalogue changes later.
    if (entry.moves.some((id) => !MOVES[id] || !canLearnMove(entry.species, id)))
      throw new Error(`租借关卡包含非法技能：${entry.species}`);
    c.moves = entry.moves.map((id) => ({ id, pp: MOVES[id]!.pp }));
    c.heldItem = entry.item;
    return c;
  });
}

/** Type matchup plus unconditional ability immunity, not a full damage/survival forecast. */
export function rentalWeaknesses(creatures: Creature[]) {
  return TYPE_IDS.map((type) => {
    const multipliers = creatures.map((c) =>
      abilityFor(c).immuneType === type ? 0 : typeMultiplier(type, SPECIES[c.speciesId]!.types),
    );
    return {
      type,
      weak: multipliers.filter((n) => n > 1).length,
      resist: multipliers.filter((n) => n > 0 && n < 1).length,
      immune: multipliers.filter((n) => n === 0).length,
    };
  });
}
