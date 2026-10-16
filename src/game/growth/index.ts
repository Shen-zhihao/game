import { SPECIES } from '../../content/catalog';
import { GROWTH_WEIGHTS, LEGACY_GROWTH_WEIGHTS, TRAINING_PLANS } from '../../content/training';
import { Creature, STAT_KEYS, Stats, Training } from '../model';

export const emptyStats = (): Stats => ({
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
});
export const sumStats = (stats: Stats) => STAT_KEYS.reduce((sum, k) => sum + stats[k], 0);
export function growthSeed(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return hash >>> 0 || 1;
}
export function growthRoll(seed: number, speciesId: string, level: number, legacy = false): number {
  // An isolated per-creature/per-level stream: battle choices, saving, and evolution cannot reroll it.
  let value = (seed ^ Math.imul(level, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  value = (value ^ (value >>> 16)) >>> 0;
  const weights = (legacy ? LEGACY_GROWTH_WEIGHTS : GROWTH_WEIGHTS)[
    TRAINING_PLANS[speciesId]!.potential
  ];
  let choice = (value / 4294967296) * weights.reduce((sum, w) => sum + w, 0);
  return weights.findIndex((w) => (choice -= w) < 0) + 1;
}
export function trainingFor(c: Creature): Training {
  if (c.training) return c.training;
  const seed = growthSeed(c.id);
  const base = SPECIES[c.speciesId]!.baseStats;
  const legacyBonus = Object.fromEntries(
    STAT_KEYS.map((k) => [
      k,
      Math.floor(((2 * base[k] + c.iv[k]) * c.level) / 100) -
        Math.floor((2 * base[k] * c.level) / 100),
    ]),
  ) as Stats;
  return {
    mode: 'manual',
    seed,
    rolls: Array.from({ length: c.level - 1 }, (_, i) => growthRoll(seed, c.speciesId, i + 2)),
    strengthFromLevel: 2,
    allocated: emptyStats(),
    legacyBonus,
  };
}
export function ensureTraining(c: Creature): Training {
  const training = (c.training ??= trainingFor(c));
  // Preserve every existing roll. New levels use the strength policy from this boundary on.
  training.strengthFromLevel ??= training.rolls.length + 2;
  return training;
}
export const earnedPoints = (c: Creature) => trainingFor(c).rolls.reduce((sum, n) => sum + n, 0);
export const availablePoints = (c: Creature) =>
  earnedPoints(c) - sumStats(trainingFor(c).allocated);
export function recommendedAllocation(c: Creature, amount = availablePoints(c)): Stats {
  const result = emptyStats();
  const allocated = trainingFor(c).allocated;
  const weights = TRAINING_PLANS[c.speciesId]!.weights;
  let spent = sumStats(allocated);
  for (let i = 0; i < Math.max(0, Math.min(990, Math.floor(amount))); i++) {
    spent++;
    const key = STAT_KEYS.filter((k) => weights[k] > 0).reduce((best, k) =>
      (spent * weights[k]) / 10 - allocated[k] - result[k] >
      (spent * weights[best]) / 10 - allocated[best] - result[best]
        ? k
        : best,
    );
    result[key]++;
  }
  return result;
}
export function allocatePoints(c: Creature, points: Stats): boolean {
  const t = ensureTraining(c);
  if (
    Object.keys(points).length !== 6 ||
    !STAT_KEYS.every((k) => Number.isSafeInteger(points[k]) && points[k] >= 0)
  )
    return false;
  const amount = sumStats(points);
  if (amount <= 0 || amount > availablePoints(c)) return false;
  for (const key of STAT_KEYS) t.allocated[key] += points[key];
  return true;
}
export function advanceGrowth(c: Creature): number {
  const t = ensureTraining(c);
  let gained = 0;
  while (t.rolls.length < c.level - 1) {
    const points = growthRoll(t.seed, c.speciesId, t.rolls.length + 2);
    t.rolls.push(points);
    gained += points;
  }
  if (t.mode === 'auto' && availablePoints(c)) allocatePoints(c, recommendedAllocation(c));
  return gained;
}
