import { effectiveAccessFlags } from '../../content/keyItems';
import {
  MAPS,
  isTown,
  npcVisible,
  terrainPassable,
  townForMap,
  TOWN_REST,
} from '../../content/world';
import { canSurf } from '../fieldSkills';
import { worldNpcs } from '../exploration';
import type { GameState, MapId, TownId } from '../model';

export const RECOVERY_TOWNS = Object.keys(TOWN_REST) as TownId[];
export const townVisitFlag = (town: TownId) => `visitedTown_${town}`;
type Position = { map: MapId; x: number; y: number };
const directions = [
  [0, 1],
  [-1, 0],
  [1, 0],
  [0, -1],
] as const;

export const RECOVERY_CENTERS = Object.values(MAPS).flatMap((map) => {
  const town = map.interior?.exterior;
  if (map.interior?.kind !== 'center' || !town || !isTown(town)) return [];
  const healer = map.npcs.find((npc) => npc.role === 'healer');
  if (!healer) return [];
  const landing = directions
    .map(([dx, dy]) => ({ x: healer.x + dx, y: healer.y + dy }))
    .find(
      ({ x, y }) =>
        terrainPassable(map.id, x, y, {}) && !map.npcs.some((npc) => npc.x === x && npc.y === y),
    );
  return landing ? [{ town, map: map.id, ...landing }] : [];
});

/** Walkable tile distance includes doorways, detours and unlocked shortcuts. */
export function nearestRecoveryCenter(game: GameState, towns: readonly TownId[]) {
  const targets = new Map(
    RECOVERY_CENTERS.filter((center) => towns.includes(center.town)).map((center) => [
      `${center.map}:${center.x},${center.y}`,
      center,
    ]),
  );
  const flags = effectiveAccessFlags(game);
  const surf = canSurf(game);
  const blocked = new Map<MapId, Set<string>>();
  const key = (position: Position) => `${position.map}:${position.x},${position.y}`;
  const queue: Position[] = [{ map: game.player.map, x: game.player.x, y: game.player.y }];
  const visited = new Set([key(queue[0]!)]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!;
    const target = targets.get(key(current));
    if (target) return target;
    const map = MAPS[current.map];
    if (!blocked.has(current.map))
      blocked.set(
        current.map,
        new Set(
          worldNpcs(game, current.map)
            .filter((npc) => npcVisible(game, npc))
            .map((npc) => `${npc.x},${npc.y}`),
        ),
      );
    for (const [dx, dy] of directions) {
      const x = current.x + dx,
        y = current.y + dy;
      if (!terrainPassable(current.map, x, y, flags) || blocked.get(current.map)!.has(`${x},${y}`))
        continue;
      if (['~', 'W'].includes(map.rows[y]?.[x] ?? '') && !surf) continue;
      const portal = map.portals.find((p) => p.x === x && p.y === y);
      if (portal?.flag && !game.progress.flags[portal.flag]) continue;
      if (
        current.map === 'dawn' &&
        portal?.map === 'route' &&
        (flags.opening ? !flags.neighborMet : !flags.rival)
      )
        continue;
      if (flags.opening && current.map === 'route') {
        if (portal?.map === 'moss' && !flags.catchTutorial) continue;
        if (!portal && !flags.professorRescued && (x > 5 || y < 8)) continue;
      }
      const next = portal
        ? { map: portal.map, x: portal.toX, y: portal.toY }
        : { map: current.map, x, y };
      const nextKey = key(next);
      if (visited.has(nextKey)) continue;
      visited.add(nextKey);
      queue.push(next);
    }
  }
  return undefined;
}

export function rememberRecoveryTowns(game: GameState): void {
  const flags = game.progress.flags;
  // Legacy saves have no visit ledger. Keep their old checkpoint and infer the
  // local city from real accessible paths without resetting story or save data.
  if (!RECOVERY_TOWNS.some((town) => flags[townVisitFlag(town)])) {
    const local = nearestRecoveryCenter(game, RECOVERY_TOWNS);
    if (local) flags[townVisitFlag(local.town)] = true;
    for (const town of RECOVERY_TOWNS)
      if (flags[`photoStamp_${town}`]) flags[townVisitFlag(town)] = true;
  }
  for (const town of ['dawn', game.player.healMap, townForMap(game.player.map)] as const)
    if (town) flags[townVisitFlag(town)] = true;
}

export function returnToNearestCenter(game: GameState) {
  rememberRecoveryTowns(game);
  const unlocked = RECOVERY_TOWNS.filter((town) => game.progress.flags[townVisitFlag(town)]);
  const center =
    nearestRecoveryCenter(game, unlocked) ??
    RECOVERY_CENTERS.find((entry) => entry.town === game.player.healMap) ??
    RECOVERY_CENTERS.find((entry) => entry.town === 'dawn')!;
  Object.assign(game.player, {
    map: center.map,
    x: center.x,
    y: center.y,
    facing: 'up',
    healMap: center.town,
  });
  game.notice = `已在${MAPS[center.town].name}精灵中心复活，全队 HP、PP 与异常状态已恢复。`;
  return center;
}
