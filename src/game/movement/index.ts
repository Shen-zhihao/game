import { MAPS, npcVisible, terrainPassable } from '../../content/world';
import { effectiveAccessFlags } from '../../content/keyItems';
import { travelProfile } from '../environment';
import { worldNpcs } from '../exploration';
import { canSurf } from '../fieldSkills';
import type { Direction, GameState, WalkDirection } from '../model';

export const WALK_VECTORS: Record<WalkDirection, readonly [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
  upLeft: [-1, -1],
  upRight: [1, -1],
  downLeft: [-1, 1],
  downRight: [1, 1],
};
const SECTORS: WalkDirection[] = [
  'right',
  'downRight',
  'down',
  'downLeft',
  'left',
  'upLeft',
  'up',
  'upRight',
];
/** A small angular margin prevents direction chatter at sector boundaries. */
export function walkDirection(
  x: number,
  y: number,
  previous: WalkDirection | null = null,
): WalkDirection {
  const angle = Math.atan2(y, x);
  if (previous) {
    const [px, py] = WALK_VECTORS[previous];
    const delta = Math.atan2(
      Math.sin(angle - Math.atan2(py, px)),
      Math.cos(angle - Math.atan2(py, px)),
    );
    if (Math.abs(delta) < Math.PI / 8 + Math.PI / 36) return previous;
  }
  return SECTORS[(Math.round(angle / (Math.PI / 4)) + 8) % 8]!;
}

/** Keep saved facing cardinal; the map and sprite formats remain compatible. */
function facingFor(dx: number, dy: number, previous: Direction): Direction {
  if (
    dx &&
    dy &&
    WALK_VECTORS[previous].some((value, axis) => value !== 0 && value === [dx, dy][axis])
  )
    return previous;
  return dy ? (dy > 0 ? 'down' : 'up') : dx > 0 ? 'right' : 'left';
}

export function resolveWalk(game: GameState, direction: WalkDirection) {
  let [dx, dy] = WALK_VECTORS[direction];
  let blocked = false;
  const p = game.player;
  if (dx && dy) {
    const flags = effectiveAccessFlags(game);
    const npcs = worldNpcs(game).filter((npc) => npcVisible(game, npc));
    const passable = (x: number, y: number) => {
      const tile = MAPS[p.map].rows[y]?.[x];
      return (
        terrainPassable(p.map, x, y, flags) &&
        (!['W', '~'].includes(tile ?? '') || canSurf(game)) &&
        !npcs.some((npc) => npc.x === x && npc.y === y)
      );
    };
    const horizontal = passable(p.x + dx, p.y);
    const vertical = passable(p.x, p.y + dy);
    // Both adjacent cells must be free: never cut through a wall or an NPC corner.
    if (!horizontal || !vertical || !passable(p.x + dx, p.y + dy)) {
      if (horizontal && (!vertical || ['left', 'right'].includes(p.facing))) dy = 0;
      else if (vertical) dx = 0;
      else blocked = true;
    }
  }
  const distance = Math.hypot(dx, dy);
  const profile = travelProfile(game, p.x + dx, p.y + dy);
  return {
    dx,
    dy,
    blocked,
    facing: facingFor(dx, dy, p.facing),
    interval: Math.round(profile.interval * distance),
  };
}
