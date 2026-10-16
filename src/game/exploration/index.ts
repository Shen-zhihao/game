import { MAPS, Npc, npcVisible, terrainPassable } from '../../content/world';
import { Direction, ExplorationState, GameState, MapId } from '../model';
import { encounterSiteAt, landEncounters } from '../../content/habitats';
import { weightedEcology } from '../environment';
import { ADVENTURE_FINDS } from '../../content/adventure';

export const FIND_SITES: Partial<Record<MapId, [number, number][]>> = {
  ...ADVENTURE_FINDS,
  coastRoute: [
    [5, 14],
    [23, 21],
    [27, 4],
  ],
  harbor: [
    [12, 22],
    [18, 7],
    [22, 17],
  ],
  tideworks: [
    [4, 22],
    [21, 21],
    [31, 22],
  ],
  dawn: [
    [24, 7],
    [26, 15],
    [9, 17],
  ],
  route: [
    [25, 16],
    [22, 4],
    [12, 17],
  ],
  moss: [
    [24, 8],
    [10, 16],
    [27, 16],
  ],
  forest: [
    [7, 17],
    [27, 12],
    [18, 18],
  ],
  stoneRoute: [
    [12, 16],
    [27, 18],
    [31, 3],
  ],
  stone: [
    [23, 19],
    [10, 8],
    [16, 16],
  ],
  mine: [
    [11, 18],
    [29, 16],
    [24, 20],
  ],
};
export const ORIGINAL_MAPS: MapId[] = ['dawn', 'route', 'moss', 'forest', 'gym'];
function worldRandom(world: ExplorationState): number {
  world.seed = (Math.imul(world.seed, 1664525) + 1013904223) >>> 0;
  return world.seed / 0x100000000;
}
export function createExploration(seed: number, player?: GameState['player']): ExplorationState {
  const world: ExplorationState = {
    seed: (seed ^ 0x9e3779b9) >>> 0,
    patrols: {},
    finds: {},
    activeFind: null,
    generatedMaps: [],
  };
  for (const map of Object.values(MAPS)) populateMap(world, map.id, player);
  return world;
}
function populateMap(world: ExplorationState, mapId: MapId, player?: GameState['player']) {
  const map = MAPS[mapId];
  for (const npc of map.npcs)
    if (npc.patrol) world.patrols[`${map.id}:${npc.id}`] = { index: 0, steps: 0, facing: 'down' };
  const sites = [...(FIND_SITES[map.id] ?? [])].filter(
    ([x, y]) =>
      terrainPassable(map.id, x, y, {}) &&
      !(player?.map === map.id && player.x === x && player.y === y) &&
      !map.portals.some((p) => p.x === x && p.y === y) &&
      !map.npcs.some(
        (npc) =>
          (npc.x === x && npc.y === y) || npc.patrol?.some(([px, py]) => px === x && py === y),
      ),
  );
  // Separate exploration RNG: waiting for an NPC never rerolls a battle.
  for (let i = sites.length - 1; i > 0; i--) {
    const j = Math.floor(worldRandom(world) * (i + 1));
    [sites[i], sites[j]] = [sites[j]!, sites[i]!];
  }
  const count = landEncounters(map.id).length ? 2 : 1;
  sites.slice(0, count).forEach(([x, y], i) => {
    const choices = weightedEcology(encounterSiteAt(map.id, x, y)?.encounters ?? [], 'clear');
    const wild = choices.length > 0 && worldRandom(world) < 0.5;
    const items = ['potion', 'ball', 'antidote'];
    let roll = worldRandom(world) * choices.reduce((n, e) => n + e.weight, 0);
    const speciesId =
      choices.find((e) => (roll -= e.weight) < 0)?.speciesId ??
      choices[0]?.speciesId ??
      'creature_037';
    world.finds[`find_${map.id}_${i}`] = {
      map: map.id,
      x,
      y,
      kind: wild ? 'wild' : 'items',
      claimed: false,
      itemId: items[Math.floor(worldRandom(world) * items.length)]!,
      quantity: 1 + Math.floor(worldRandom(world) * 2),
      speciesId,
    };
  });
  world.generatedMaps!.push(mapId);
}
export function ensureExploration(game: GameState): ExplorationState {
  const world = (game.world ??= createExploration(game.rng, game.player));
  world.generatedMaps ??= [...ORIGINAL_MAPS];
  for (const mapId of Object.keys(MAPS) as MapId[])
    if (!world.generatedMaps.includes(mapId)) populateMap(world, mapId, game.player);
  return world;
}
export function worldNpcs(game: GameState, mapId = game.player.map): Npc[] {
  const npcs = MAPS[mapId].npcs.map((npc) => {
    const patrol = game.world?.patrols[`${mapId}:${npc.id}`];
    const point = npc.patrol?.[patrol?.index ?? 0];
    return point && patrol
      ? { ...npc, x: point[0], y: point[1], facing: patrol.facing, steps: patrol.steps }
      : npc;
  });
  for (const [id, find] of Object.entries(game.world?.finds ?? {})) {
    if (find.map === mapId && !find.claimed)
      npcs.push({
        id,
        x: find.x,
        y: find.y,
        name: find.kind === 'wild' ? '草间动静' : '遗落补给',
        role: 'discovery',
      });
  }
  return npcs;
}
function facing(dx: number, dy: number): Direction {
  return dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
}
export function faceTraveler(game: GameState, npc: Npc): void {
  const patrol = ensureExploration(game).patrols[`${game.player.map}:${npc.id}`];
  if (patrol) patrol.facing = facing(game.player.x - npc.x, game.player.y - npc.y);
}
export function advanceExploration(game: GameState): void {
  if (game.dialogue || game.battle || game.pending.length || game.progress.flags.starterChoice)
    return;
  const world = ensureExploration(game);
  if (game.playTimeSeconds % 2 !== 0) return;
  for (const npc of MAPS[game.player.map].npcs) {
    if (!npc.patrol || !npcVisible(game, npc)) continue;
    const patrol = world.patrols[`${game.player.map}:${npc.id}`]!;
    const current = npc.patrol[patrol.index]!;
    if (Math.abs(current[0] - game.player.x) + Math.abs(current[1] - game.player.y) <= 1) {
      patrol.facing = facing(game.player.x - current[0], game.player.y - current[1]);
      continue;
    }
    if (worldRandom(world) < 0.25) continue;
    const nextIndex = (patrol.index + 1) % npc.patrol.length;
    const [x, y] = npc.patrol[nextIndex]!;
    if (
      !terrainPassable(game.player.map, x, y, game.progress.flags) ||
      (game.player.x === x && game.player.y === y) ||
      MAPS[game.player.map].portals.some((p) => p.x === x && p.y === y) ||
      worldNpcs(game).some((n) => n.id !== npc.id && n.x === x && n.y === y && npcVisible(game, n))
    )
      continue;
    patrol.facing = facing(x - current[0], y - current[1]);
    patrol.index = nextIndex;
    patrol.steps++;
  }
}
export function encountersAt(
  mapId: MapId,
  x: number,
  y: number,
  medium: 'land' | 'water' = 'land',
) {
  const map = MAPS[mapId];
  const site = encounterSiteAt(mapId, x, y, medium);
  return {
    name: site?.name ?? map.name,
    encounters: site?.encounters ?? [],
    habitatId: site?.id ?? null,
  };
}
