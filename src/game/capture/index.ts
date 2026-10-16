import { SPECIES } from '../../content/catalog';
import { BallId, GameState } from '../model';

export const BALLS: Record<BallId, { multiplier: number; guaranteed: boolean }> = {
  ball: { multiplier: 1, guaranteed: false },
  great_ball: { multiplier: 1.5, guaranteed: false },
  ultra_ball: { multiplier: 2.5, guaranteed: false },
  master_ball: { multiplier: 1, guaranteed: true },
};
export const isBall = (id: string): id is BallId => Object.hasOwn(BALLS, id);
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
