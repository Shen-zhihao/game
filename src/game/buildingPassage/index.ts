import { MAPS } from '../../content/world';
import type { BuildingEntrance } from '../../content/buildings';
import type { Direction, GameState } from '../model';

export interface BuildingPassage {
  entrance: BuildingEntrance;
  entering: boolean;
  source: GameState;
  outside: GameState;
  offset: { x: number; y: number };
}

/** Identify a real doorway crossing; map borders, loading and story teleports stay immediate. */
export function buildingPassage(from: GameState, to: GameState): BuildingPassage | null {
  if (from.player.map === to.player.map || from.battle || to.battle) return null;
  const source = MAPS[from.player.map];
  const destination = MAPS[to.player.map];
  const portal = source.portals.find(
    (p) =>
      p.map === destination.id &&
      p.toX === to.player.x &&
      p.toY === to.player.y &&
      Math.abs(p.x - from.player.x) + Math.abs(p.y - from.player.y) === 1,
  );
  if (!portal) return null;
  const entry = source.entrances?.find(
    (e) => e.x === portal.x && e.y === portal.y && e.map === destination.id,
  );
  const exit = destination.entrances?.find(
    (e) => e.map === source.id && e.x === to.player.x && e.y + 1 === to.player.y,
  );
  const entrance = entry ?? exit;
  if (!entrance) return null;
  const entering = !!entry;
  const outside = entering ? from : to;
  const offset = { x: entrance.x - outside.player.x, y: entrance.y - outside.player.y };
  const facing: Direction = entering
    ? offset.x > 0
      ? 'right'
      : offset.x < 0
        ? 'left'
        : offset.y > 0
          ? 'down'
          : 'up'
    : 'down';
  return {
    entrance,
    entering,
    source: from,
    offset,
    outside: { ...outside, dialogue: null, player: { ...outside.player, facing } },
  };
}

export const DOOR_TIMINGS = {
  open: 180,
  pass: 200,
  close: 160,
} as const;
