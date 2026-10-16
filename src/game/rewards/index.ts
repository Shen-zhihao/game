import { MOVES, SPECIES } from '../../content/catalog';
import { TRAINERS, GYM_REWARDS, PRACTICE_TRAINERS } from '../../content/world';
import { Battle, Creature, GameState } from '../model';
import { earnedPoints, ensureTraining } from '../growth';
import { creatureName, gainXp } from '../rules';

export const GYM_LEADERS = new Set<string>(GYM_REWARDS.map((g) => g.leader));
export const REPEAT_TRAINERS = PRACTICE_TRAINERS;
export function rewardTier(b: Battle): 'wild' | 'trainer' | 'leader' {
  return GYM_LEADERS.has(b.event ?? '') ? 'leader' : b.kind;
}
export function knockoutReward(b: Battle, enemy: Creature) {
  if (b.event === 'openingRescue') return { experience: 16, money: 8 };
  const tier = rewardTier(b);
  const strength = Math.max(0.8, Math.min(1.5, SPECIES[enemy.speciesId]!.baseStatTotal / 350));
  return {
    experience: Math.floor(
      enemy.level * 32 * strength * (tier === 'leader' ? 2.5 : tier === 'trainer' ? 1.5 : 1),
    ),
    money: Math.floor(
      enemy.level * strength * (tier === 'leader' ? 32 : tier === 'trainer' ? 18 : 8),
    ),
  };
}
/** Missing ledger marks prior opponents settled, without retroactively paying legacy battles. */
export function ensureRewards(b: Battle) {
  return (b.rewards ??= {
    defeated: b.enemies
      .filter((e, i) => e.hp === 0 && (i < b.enemyIndex || b.phase === 'ended'))
      .map((e) => e.id),
    experience: 0,
    money: 0,
    completion: b.phase === 'ended',
  });
}
export function distributeExperience(game: GameState, pool: number): void {
  const b = game.battle!;
  const participants = b.participants.filter((id) => game.party.includes(id));
  for (const id of game.party) {
    const c = game.creatures[id]!;
    if (!participants.length || (!participants.includes(id) && c.hp === 0)) continue;
    const amount = Math.floor(participants.includes(id) ? pool / participants.length : pool * 0.25);
    const oldPoints = earnedPoints(c);
    const oldMoves = new Set(c.moves.map((m) => m.id));
    const oldPending = new Set(game.pending);
    const before = c.experience;
    const levels = gainXp(game, c, amount);
    const actual = c.experience - before;
    b.logs.push(
      `${creatureName(c)}获得 ${actual} 经验${levels ? `，升到 Lv.${c.level}` : c.level === 100 ? '（已达满级）' : ''}。`,
    );
    if (levels)
      b.logs.push(
        `获得 ${earnedPoints(c) - oldPoints} 能力点${ensureTraining(c).mode === 'auto' ? '，已按推荐自动分配' : '，可在「伙伴」中自由分配'}。`,
      );
    const learned = c.moves.filter((m) => !oldMoves.has(m.id));
    if (learned.length)
      b.logs.push(`${creatureName(c)}学会了${learned.map((m) => MOVES[m.id]!.name).join('、')}。`);
    const waiting = game.pending.filter(
      (p) => p.kind === 'move' && p.creatureId === c.id && !oldPending.has(p),
    );
    if (waiting.length)
      b.logs.push(`${creatureName(c)}有新技能等待学习，战斗结束后选择要替换的技能。`);
  }
  ensureRewards(b).experience += pool;
}
export function addBattleMoney(game: GameState, amount: number, label: string) {
  const before = game.player.money;
  game.player.money = Math.min(9999999, before + amount);
  const actual = game.player.money - before;
  ensureRewards(game.battle!).money += actual;
  game.battle!.logs.push(`${label}：金币 +${actual}。`);
}
export function settleKnockout(game: GameState): void {
  const b = game.battle!;
  const enemy = b.enemies[b.enemyIndex]!;
  const ledger = ensureRewards(b);
  if (enemy.hp > 0 || ledger.defeated.includes(enemy.id)) return;
  ledger.defeated.push(enemy.id);
  // Completed one-off NPC encounters cannot become repeatable reward sources.
  if (
    b.event &&
    b.event in TRAINERS &&
    game.progress.flags[b.event] &&
    !REPEAT_TRAINERS.has(b.event)
  )
    return;
  const reward = knockoutReward(b, enemy);
  b.logs.push(
    `击败${creatureName(enemy)}，即时结算${rewardTier(b) === 'leader' ? '馆主' : b.kind === 'trainer' ? '训练师' : '野外'}奖励。`,
  );
  distributeExperience(game, reward.experience);
  addBattleMoney(game, reward.money, '击败奖励');
}
