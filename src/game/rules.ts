import { learnset, MOVES, SPECIES, TYPE_CHART } from '../content/catalog';
import { Creature, Curve, GameState, Species, Stat, STAT_KEYS, Stats, TypeId } from './model';

export function random(state: Pick<GameState, 'rng'>): number {
  let x = state.rng | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.rng = x >>> 0 || 1;
  return state.rng / 4294967296;
}
export function nextId(state: Pick<GameState, 'sequence' | 'rng'>, prefix: string): string {
  state.sequence += 1;
  return `${prefix}-${state.sequence}-${state.rng.toString(36)}`;
}
export function xpAt(level: number, curve: Curve): number {
  const l = Math.min(100, Math.max(1, Math.floor(level)));
  if (l === 1) return 0;
  switch (curve) {
    case 'fast':
      return Math.floor((4 * l ** 3) / 5);
    case 'medium_fast':
      return l ** 3;
    case 'medium_slow':
      return Math.max(0, Math.floor((6 * l ** 3) / 5 - 15 * l ** 2 + 100 * l - 140));
    case 'slow':
      return Math.floor((5 * l ** 3) / 4);
  }
}
export function statsFor(creature: Pick<Creature, 'iv' | 'speciesId' | 'level'>): Stats {
  const species = SPECIES[creature.speciesId]!;
  return Object.fromEntries(
    STAT_KEYS.map((key) => [
      key,
      Math.floor(((2 * species.baseStats[key] + creature.iv[key]) * creature.level) / 100) +
        (key === 'hp' ? creature.level + 10 : 5),
    ]),
  ) as Stats;
}
export function changeMaxHp(creature: Creature, oldMax: number): void {
  const newMax = statsFor(creature).hp;
  creature.hp =
    creature.hp === 0 ? 0 : Math.max(1, Math.min(newMax, creature.hp + newMax - oldMax));
}
export function typeMultiplier(attack: TypeId | null, defenders: readonly TypeId[]): number {
  if (!attack) return 1;
  return [...new Set(defenders)].reduce(
    (product, defense) => product * TYPE_CHART[attack][defense],
    1,
  );
}
export function makeCreature(state: GameState, speciesId: string, level: number): Creature {
  const species = SPECIES[speciesId]!;
  const iv = Object.fromEntries(
    STAT_KEYS.map((key) => [key, Math.floor(random(state) * 32)]),
  ) as Stats;
  const known = learnset(speciesId)
    .filter((m) => m.level <= level)
    .slice(-4);
  const creature: Creature = {
    id: nextId(state, 'creature'),
    speciesId,
    nickname: '',
    level,
    experience: xpAt(level, species.experienceCurve),
    iv,
    hp: 1,
    status: null,
    sleepTurns: 0,
    moves: known.map((m) => ({ id: m.moveId, pp: MOVES[m.moveId]!.pp })),
    history: [{ kind: 'caught', label: '成为了冒险伙伴', level }],
  };
  creature.hp = statsFor(creature).hp;
  return creature;
}
export function creatureName(creature: Pick<Creature, 'nickname' | 'speciesId'>): string {
  return creature.nickname || SPECIES[creature.speciesId]!.name;
}
export function canEvolve(
  creature: Creature,
  toId: string,
  inventory: Record<string, number>,
): boolean {
  const edge = SPECIES[creature.speciesId]!.evolutions.find((e) => e.toId === toId);
  if (!edge) return false;
  return edge.condition.kind === 'level'
    ? creature.level >= edge.condition.level
    : creature.level >= edge.condition.minLevel && (inventory[edge.condition.itemId] ?? 0) > 0;
}
export function queueEvolution(state: GameState, creature: Creature): void {
  for (const edge of SPECIES[creature.speciesId]!.evolutions) {
    if (
      canEvolve(creature, edge.toId, state.inventory) &&
      !state.pending.some(
        (p) => p.kind === 'evolution' && p.creatureId === creature.id && p.toId === edge.toId,
      )
    )
      state.pending.push({ kind: 'evolution', creatureId: creature.id, toId: edge.toId });
  }
}
export function learnAvailable(state: GameState, creature: Creature, fromLevel: number): void {
  for (const entry of learnset(creature.speciesId).filter(
    (m) => m.level > fromLevel && m.level <= creature.level,
  )) {
    if (
      creature.moves.some((m) => m.id === entry.moveId) ||
      state.pending.some(
        (p) => p.kind === 'move' && p.creatureId === creature.id && p.moveId === entry.moveId,
      )
    )
      continue;
    if (creature.moves.length < 4) {
      creature.moves.push({ id: entry.moveId, pp: MOVES[entry.moveId]!.pp });
      record(creature, 'learned', `学会${MOVES[entry.moveId]!.name}`);
    } else state.pending.push({ kind: 'move', creatureId: creature.id, moveId: entry.moveId });
  }
}
export function record(
  creature: Creature,
  kind: Creature['history'][number]['kind'],
  label: string,
): void {
  creature.history.push({ kind, label, level: creature.level });
  while (creature.history.length > 32) {
    const index = creature.history.findIndex((h) => h.kind === 'learned');
    if (index < 0) break;
    creature.history.splice(index, 1);
  }
}
export function gainXp(state: GameState, creature: Creature, amount: number): number {
  const species = SPECIES[creature.speciesId]!;
  const oldLevel = creature.level;
  const max = statsFor(creature).hp;
  creature.experience = Math.min(
    xpAt(100, species.experienceCurve),
    creature.experience + Math.max(0, Math.floor(amount)),
  );
  while (
    creature.level < 100 &&
    creature.experience >= xpAt(creature.level + 1, species.experienceCurve)
  )
    creature.level += 1;
  changeMaxHp(creature, max);
  learnAvailable(state, creature, oldLevel);
  queueEvolution(state, creature);
  return creature.level - oldLevel;
}
export function statMultiplier(stage: number): number {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}
export function effectiveStat(
  creature: Creature,
  stat: Exclude<Stat, 'hp'>,
  stages: Partial<Record<Stat, number>>,
): number {
  let value = statsFor(creature)[stat] * statMultiplier(stages[stat] ?? 0);
  if (stat === 'speed' && creature.status === 'paralysis') value /= 2;
  if (stat === 'attack' && creature.status === 'burn') value /= 2;
  return Math.max(1, value);
}
export function calculateDamage(
  attacker: Creature,
  defender: Creature,
  moveId: string,
  attackStages: Partial<Record<Stat, number>> = {},
  defenseStages: Partial<Record<Stat, number>> = {},
  variation = 1,
  critical = false,
): { damage: number; multiplier: number } {
  const move = MOVES[moveId]!;
  const mult = typeMultiplier(move.type, SPECIES[defender.speciesId]!.types);
  if (mult === 0 || move.power === 0) return { damage: 0, multiplier: mult };
  const attack = effectiveStat(
    attacker,
    move.category === 'physical' ? 'attack' : 'specialAttack',
    attackStages,
  );
  const defense = effectiveStat(
    defender,
    move.category === 'physical' ? 'defense' : 'specialDefense',
    defenseStages,
  );
  const base =
    Math.floor((((2 * attacker.level) / 5 + 2) * move.power * attack) / defense / 50) + 2;
  const stab = move.type && SPECIES[attacker.speciesId]!.types.includes(move.type) ? 1.5 : 1;
  return {
    damage: Math.max(1, Math.floor(base * stab * mult * variation * (critical ? 1.5 : 1))),
    multiplier: mult,
  };
}
export function captureChance(creature: Creature, ballMultiplier = 1): number {
  const statusMultiplier = creature.status === 'sleep' ? 2 : creature.status ? 1.5 : 1;
  return Math.min(
    0.95,
    Math.max(
      0.03,
      (SPECIES[creature.speciesId]!.captureRate / 255) *
        ballMultiplier *
        (1 - creature.hp / (1.5 * statsFor(creature).hp)) *
        statusMultiplier,
    ),
  );
}
export function evolutionLabel(species: Species): string {
  if (!species.evolutions.length) return '最终形态';
  return species.evolutions
    .map(
      (e) =>
        `${e.condition.kind === 'level' ? `Lv.${e.condition.level}` : `Lv.${e.condition.minLevel} + 道具`} → ${SPECIES[e.toId]!.name}`,
    )
    .join(' / ');
}
