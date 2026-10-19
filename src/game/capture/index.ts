import { SPECIES } from '../../content/catalog';
import { BallId, BattleCaptureEvent, GameState } from '../model';
import { dayPeriodFor } from '../calendar';

export const BALLS: Record<BallId, { multiplier: number; guaranteed: boolean }> = {
  ball: { multiplier: 1, guaranteed: false },
  great_ball: { multiplier: 1.5, guaranteed: false },
  ultra_ball: { multiplier: 2.5, guaranteed: false },
  quick_ball: { multiplier: 1, guaranteed: false },
  timer_ball: { multiplier: 1, guaranteed: false },
  dusk_ball: { multiplier: 1, guaranteed: false },
  net_ball: { multiplier: 1, guaranteed: false },
  master_ball: { multiplier: 1, guaranteed: true },
};
export const isBall = (id: string): id is BallId => Object.hasOwn(BALLS, id);

/** One resolver for both the displayed odds and the actual throw; no RNG or state changes. */
export function ballEffect(
  game: GameState,
  ballId: BallId,
): { multiplier: number; reason: string } {
  const battle = game.battle;
  const turn = Math.max(1, battle?.turn ?? 1);
  if (ballId === 'quick_ball') {
    const active = !!battle && turn === 1;
    return { multiplier: active ? 4 : 1, reason: active ? '首回合加成生效' : '非首回合，无加成' };
  }
  if (ballId === 'timer_ball') {
    const completed = battle ? Math.min(10, turn - 1) : 0;
    return {
      multiplier: (10 + 3 * completed) / 10,
      reason: `已完成 ${battle ? turn - 1 : 0} 回合，最高 ×4`,
    };
  }
  if (ballId === 'dusk_ball') {
    const active = dayPeriodFor(game) === 'night';
    return {
      multiplier: active ? 3 : 1,
      reason: active ? '游戏时间为夜晚，加成生效' : '游戏时间为白天，无加成',
    };
  }
  if (ballId === 'net_ball') {
    const enemy = battle?.enemies[battle.enemyIndex];
    const active = !!enemy && SPECIES[enemy.speciesId]!.types.includes('water');
    return {
      multiplier: active ? 3 : 1,
      reason: active ? '目标为水属性，加成生效' : '目标非水属性，无加成',
    };
  }
  return {
    multiplier: BALLS[ballId].multiplier,
    reason: BALLS[ballId].guaranteed ? '必定捕获' : '固定倍率',
  };
}

/** Four checks, with up to three visible shakes, using the game's final per-ball odds. */
export function resolveCapture(
  chance: number,
  nextRoll: () => number,
): { caught: boolean; shakes: NonNullable<BattleCaptureEvent['shakes']> } {
  if (chance >= 1) return { caught: true, shakes: 3 };
  if (!(chance > 0)) return { caught: false, shakes: 0 };
  // All four must pass: taking the fourth root preserves the displayed overall chance.
  const threshold = Math.pow(chance, 1 / 4);
  for (const shakes of [0, 1, 2, 3] as const) {
    if (nextRoll() >= threshold) return { caught: false, shakes };
  }
  return { caught: true, shakes: 3 };
}
export function captureDifficulty(speciesId: string, level: number): number {
  const s = SPECIES[speciesId]!;
  const strength = Math.max(0.35, 1 - Math.max(0, s.baseStatTotal - 300) / 650);
  const levelPenalty = 1 / (1 + Math.max(0, level - 10) / 100);
  return strength * levelPenalty;
}
// Normal play has these three once-only rewards. Explicit cheats have a separate ledger.
export const MASTER_BALL_SOURCES = [
  { id: 'harbor_report', name: '潮闸调查结案', requires: ['harborReport'], implemented: true },
  {
    id: 'league_research',
    name: '联盟生态研究结案',
    requires: ['leagueResearch'],
    implemented: true,
  },
  { id: 'ancient_pact', name: '远古守护者的约定', requires: ['templeRestored'], implemented: true },
] as const;
export function grantMasterBall(game: GameState, sourceId: string): boolean {
  const source = MASTER_BALL_SOURCES.find((s) => s.id === sourceId);
  if (!source?.implemented || !source.requires.every((f) => game.progress.flags[f])) return false;
  const ledger = (game.masterBalls ??= { claimed: [], used: 0 });
  if (ledger.claimed.includes(source.id) || ledger.claimed.length >= 3) return false;
  ledger.claimed.push(source.id);
  game.inventory.master_ball = (game.inventory.master_ball ?? 0) + 1;
  return true;
}
export function consumeMasterBall(game: GameState): boolean {
  if (!(game.inventory.master_ball! > 0)) return false;
  const cheat = game.cheats;
  if (cheat && cheat.masterBallsUsed < cheat.masterBallsGranted) cheat.masterBallsUsed++;
  else (game.masterBalls ??= { claimed: [], used: 0 }).used++;
  game.inventory.master_ball = game.inventory.master_ball! - 1;
  return true;
}
