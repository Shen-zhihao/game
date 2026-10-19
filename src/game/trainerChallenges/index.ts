import { ADVENTURE_GYMS, ADVENTURE_INTERACTIONS } from '../../content/adventure';
import { effectiveAccessFlags, hasFieldAccess } from '../../content/keyItems';
import {
  GYM_TRAINERS,
  MAPS,
  npcDefeated,
  npcVisible,
  PRACTICE_TRAINERS,
  terrainPassable,
  type Npc,
} from '../../content/world';
import { ensureExploration, worldNpcs } from '../exploration';
import type { Direction, GameState, MapId } from '../model';
import { WALK_VECTORS } from '../movement';

export const TRAINER_SIGHT = 4;
export const trainerKey = (map: MapId, npcId: string) => `${map}:${npcId}`;
export const isSightTrainer = (npc: Npc) =>
  npc.role === 'trainer' &&
  !!npc.event &&
  (PRACTICE_TRAINERS.has(npc.event) || GYM_TRAINERS.has(npc.event));

function canChallenge(game: GameState): boolean {
  return (
    !!game.progress.flags.rival &&
    !!game.progress.flags.catchTutorial &&
    !game.dialogue &&
    !game.battle &&
    !game.pending.length &&
    !game.activities?.active &&
    !game.challenge?.active &&
    !game.progress.flags.starterChoice &&
    game.party.some((id) => game.creatures[id]!.hp > 0)
  );
}

function trainerReady(game: GameState, npc: Npc): boolean {
  if (!isSightTrainer(npc) || !npcVisible(game, npc) || npcDefeated(game.progress.flags, npc))
    return false;
  const gym = ADVENTURE_GYMS.find((g) => g.scout === npc.event || g.keeper === npc.event);
  if (gym && !game.progress.flags[gym.switches[npc.event === gym.scout ? 0 : 1]!]) return false;
  return (ADVENTURE_INTERACTIONS[npc.id]?.requires ?? []).every((flag) =>
    hasFieldAccess(game, flag),
  );
}

function clearSight(game: GameState, npc: Npc): number {
  const [dx, dy] = WALK_VECTORS[npc.facing ?? 'down'];
  const { map, x, y } = game.player;
  const distance = Math.abs(x - npc.x) + Math.abs(y - npc.y);
  if (
    distance < 1 ||
    distance > TRAINER_SIGHT ||
    x !== npc.x + dx * distance ||
    y !== npc.y + dy * distance
  )
    return 0;
  const flags = effectiveAccessFlags(game);
  const others = worldNpcs(game).filter((n) => n.id !== npc.id && npcVisible(game, n));
  for (let step = 1; step <= distance; step++) {
    const sx = npc.x + dx * step,
      sy = npc.y + dy * step;
    if (
      !terrainPassable(map, sx, sy, flags) ||
      ['K', 'W', '~', 'E'].includes(MAPS[map].rows[sy]?.[sx] ?? '') ||
      MAPS[map].portals.some((p) => p.x === sx && p.y === sy) ||
      others.some((n) => n.x === sx && n.y === sy)
    )
      return 0;
  }
  return distance;
}

function faceTrainer(game: GameState, npc: Pick<Npc, 'facing'>) {
  const opposite: Record<Direction, Direction> = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
  };
  game.player.facing = opposite[npc.facing ?? 'down'];
}

export function detectTrainer(game: GameState): boolean {
  if (game.world?.trainerChallenge || !canChallenge(game)) return false;
  const candidates = worldNpcs(game)
    .filter((npc) => trainerReady(game, npc))
    .map((npc) => ({ npc, distance: clearSight(game, npc) }))
    .filter(({ distance }) => distance > 0)
    .sort((a, b) => a.distance - b.distance || a.npc.id.localeCompare(b.npc.id));
  const npc = candidates[0]?.npc;
  if (!npc) return false;
  const world = ensureExploration(game);
  world.trainerPositions ??= {};
  world.trainerPositions[trainerKey(game.player.map, npc.id)] = {
    x: npc.x,
    y: npc.y,
    facing: npc.facing ?? 'down',
    steps: npc.steps ?? 0,
  };
  world.trainerChallenge = { map: game.player.map, npcId: npc.id, phase: 'alert' };
  faceTrainer(game, npc);
  game.notice = `${npc.name}发现了你！`;
  return true;
}

/** Shared by checkpoint validation and the cutscene; never bypass authored battle prerequisites. */
export function validTrainerChallenge(game: GameState): boolean {
  const challenge = game.world?.trainerChallenge;
  if (!challenge || challenge.map !== game.player.map || !canChallenge(game)) return false;
  const position = game.world?.trainerPositions?.[trainerKey(challenge.map, challenge.npcId)];
  const npc = worldNpcs(game).find((n) => n.id === challenge.npcId);
  return !!position && !!npc && trainerReady(game, npc) && clearSight(game, npc) > 0;
}

/** One cell per clock tick, then one tick for the last walking animation to finish. */
export function advanceTrainerChallenge(game: GameState): boolean {
  const challenge = game.world?.trainerChallenge;
  if (!challenge) return false;
  if (!validTrainerChallenge(game)) {
    game.world!.trainerChallenge = null;
    game.notice = '训练师停下了脚步，可以继续探索。';
    return false;
  }
  const position = game.world!.trainerPositions![trainerKey(challenge.map, challenge.npcId)]!;
  const distance = Math.abs(game.player.x - position.x) + Math.abs(game.player.y - position.y);
  challenge.phase = 'approach';
  if (distance === 1) {
    faceTrainer(game, position);
    game.world!.trainerChallenge = null;
    return true;
  }
  const [dx, dy] = WALK_VECTORS[position.facing];
  position.x += dx;
  position.y += dy;
  position.steps++;
  return false;
}
