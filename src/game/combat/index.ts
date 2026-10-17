import { MOVES } from '../../content/catalog';
import { CombatStage, Creature, Stages, WeatherId } from '../model';
import { weatherAccuracy } from '../environment';
import { abilityFor, effectiveStat } from '../rules';
import { heldEffect } from '../../content/battleTraits';

export const MAX_SPEED_ACTIONS = 3;
export { CRITICAL_MULTIPLIER } from '../model';
export const CRITICAL_RATES = [1 / 16, 1 / 8, 1 / 4, 1 / 2] as const;
export const COMBAT_STAGE_NAMES: Record<CombatStage, string> = {
  attack: '攻击',
  defense: '防御',
  specialAttack: '特攻',
  specialDefense: '特防',
  speed: '速度',
  accuracy: '命中',
  evasion: '闪避',
  critical: '要害率',
  criticalGuard: '抗要害',
};
export function stageLimit(stage: CombatStage): number {
  return stage === 'critical' || stage === 'criticalGuard' ? 3 : 6;
}
export function speedActionCount(speed: number, opposingSpeed: number): number {
  const opposing = Math.max(1, opposingSpeed);
  return speed + 1e-9 >= 3 * opposing ? MAX_SPEED_ACTIONS : speed + 1e-9 >= 2 * opposing ? 2 : 1;
}
export function roundPace(
  player: Creature,
  enemy: Creature,
  playerStages: Partial<Stages> = {},
  enemyStages: Partial<Stages> = {},
  weather: WeatherId = 'clear',
) {
  const playerSpeed = effectiveStat(player, 'speed', playerStages, weather);
  const enemySpeed = effectiveStat(enemy, 'speed', enemyStages, weather);
  return {
    playerSpeed,
    enemySpeed,
    playerActions: speedActionCount(playerSpeed, enemySpeed),
    enemyActions: speedActionCount(enemySpeed, playerSpeed),
  };
}
function accuracyMultiplier(stage: number): number {
  const bounded = Math.max(-6, Math.min(6, stage));
  return bounded >= 0 ? (3 + bounded) / 3 : 3 / (3 - bounded);
}
export function hitChance(
  moveId: string,
  attackerStages: Partial<Stages> = {},
  defenderStages: Partial<Stages> = {},
  weather: WeatherId = 'clear',
  attacker?: Creature,
): number {
  const move = MOVES[moveId]!;
  if (!move.power && move.effect?.target === 'self') return 1;
  return Math.max(
    0,
    Math.min(
      1,
      (move.accuracy / 100) *
        weatherAccuracy(move.type, weather) *
        accuracyMultiplier(
          (attacker && abilityFor(attacker).clearSight
            ? Math.max(0, attackerStages.accuracy ?? 0)
            : (attackerStages.accuracy ?? 0)) - (defenderStages.evasion ?? 0),
        ),
    ),
  );
}
export function criticalChance(
  moveId: string,
  attackerStages: Partial<Stages> = {},
  defenderStages: Partial<Stages> = {},
  attacker?: Creature,
): number {
  const move = MOVES[moveId]!;
  if (!move.power) return 0;
  const stage = Math.max(
    -3,
    Math.min(
      3,
      (attackerStages.critical ?? 0) +
        (move.criticalStage ?? 0) +
        (attacker ? (heldEffect(attacker)?.criticalStage ?? 0) : 0),
    ),
  );
  const rate = stage < 0 ? CRITICAL_RATES[0] * 2 ** stage : CRITICAL_RATES[stage]!;
  const guard = Math.max(-3, Math.min(3, defenderStages.criticalGuard ?? 0));
  return Math.max(0, Math.min(1, rate * 2 ** -guard));
}
export const chanceLabel = (chance: number) => `${Number((chance * 100).toFixed(2))}%`;
export function stageEffectLabel(moveId: string): string | null {
  const effect = MOVES[moveId]!.effect;
  if (!effect?.stage) return null;
  return `${effect.target === 'self' ? '自身' : '对手'}的${COMBAT_STAGE_NAMES[effect.stage]}${(effect.amount ?? 0) > 0 ? '提升' : '降低'} ${Math.abs(effect.amount ?? 0)} 级（换下场重置）。`;
}
