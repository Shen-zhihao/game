import { effectiveAccessFlags } from '../../content/keyItems';
import { MAPS, isTown, npcVisible, terrainPassable, townForMap } from '../../content/world';
import { worldNpcs } from '../exploration';
import type { GameState, TownId } from '../model';
import {
  nearestRecoveryCenter,
  RECOVERY_CENTERS,
  rememberRecoveryTowns,
  townVisitFlag,
} from '../recovery';

/** The same visit ledger used by recovery, including migrated legacy checkpoints. */
export function hasVisitedTown(game: GameState, town: TownId): boolean {
  return !!(
    game.progress.flags[townVisitFlag(town)] ||
    game.progress.flags[`photoStamp_${town}`] ||
    town === 'dawn' ||
    town === game.player.healMap ||
    town === townForMap(game.player.map)
  );
}

export function fastTravelBlockedReason(game: GameState, town: TownId): string | null {
  if (
    game.battle ||
    game.dialogue ||
    game.activities?.active ||
    game.pending.length ||
    game.progress.flags.starterChoice
  )
    return '请先结束当前战斗、对话或活动。';
  if (!game.progress.flags.rival || !game.progress.flags.catchTutorial)
    return '完成伙伴练习与捕捉教学后解锁快速旅行。';
  if (game.challenge?.active) return '挑战塔进行中不能快速旅行，请先结束挑战。';
  if (game.league?.active) return '联盟挑战期间不能快速旅行，请先结束挑战。';
  if (!isTown(town) || !hasVisitedTown(game, town)) return '亲自抵达这座城市后才能快速旅行。';
  if (townForMap(game.player.map) === town) return '你已经在这座城市。';
  if (!RECOVERY_CENTERS.some((center) => center.town === town)) return '这座城市暂时没有旅行落点。';
  return null;
}

/** No healing, rewards, story flags, skipped encounters, or clock/weather advancement. */
export function applyFastTravel(game: GameState, town: TownId): boolean {
  rememberRecoveryTowns(game);
  const blocked = fastTravelBlockedReason(game, town);
  if (blocked) {
    game.notice = blocked;
    return false;
  }
  // Validate a currently traversable route, respecting field skills and story gates.
  const center = nearestRecoveryCenter(game, [town]);
  if (!center) {
    game.notice = '通往这座城市的道路尚未开放。';
    return false;
  }
  const map = MAPS[center.map];
  const flags = effectiveAccessFlags(game);
  const occupied = worldNpcs(game, center.map).filter((npc) => npcVisible(game, npc));
  const safe =
    terrainPassable(center.map, center.x, center.y, flags) &&
    !['~', 'W', 'g'].includes(map.rows[center.y]?.[center.x] ?? '') &&
    !map.portals.some((portal) => portal.x === center.x && portal.y === center.y) &&
    !occupied.some((npc) => npc.x === center.x && npc.y === center.y);
  if (!safe) {
    game.notice = '旅行落点暂时不可用，请稍后再试。';
    return false;
  }
  Object.assign(game.player, { map: center.map, x: center.x, y: center.y, facing: 'down' });
  game.encounterCooldown = 5;
  game.notice = `已快速抵达${MAPS[town].name}精灵中心，伙伴状态未改变。`;
  return true;
}
