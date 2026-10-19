import type { Battle, Creature, GameState } from '../model';
import { creatureName, statsFor } from '../rules';

export function clearFieldEffects(battle: Battle, creature: Creature): void {
  if (battle.volatiles) {
    delete battle.volatiles[creature.id];
    if (!Object.keys(battle.volatiles).length) delete battle.volatiles;
  }
  if (battle.actionRound?.protected) {
    battle.actionRound.protected = battle.actionRound.protected.filter((id) => id !== creature.id);
    if (!battle.actionRound.protected.length) delete battle.actionRound.protected;
  }
}

/** Once per completed round; a shield never blocks residual damage. */
export function endSeedTurn(state: GameState): void {
  const battle = state.battle!;
  const player = state.creatures[battle.playerId]!;
  const enemy = battle.enemies[battle.enemyIndex]!;
  for (const target of [player, enemy]) {
    const source = battle.volatiles?.[target.id]?.seededBy;
    if (!source || target.hp <= 0) continue;
    const recipient = source === 'player' ? player : enemy;
    const loss = Math.min(target.hp, Math.max(1, Math.floor(statsFor(target).hp / 8)));
    target.hp -= loss;
    battle.logs.push(`${creatureName(target)}被寄生种子吸取了 ${loss} 点体力。`);
    if (recipient.hp > 0 && recipient.hp < statsFor(recipient).hp) {
      const healed = Math.min(loss, statsFor(recipient).hp - recipient.hp);
      recipient.hp += healed;
      battle.logs.push(`${creatureName(recipient)}从寄生种子恢复了 ${healed} 点体力。`);
    }
  }
}
