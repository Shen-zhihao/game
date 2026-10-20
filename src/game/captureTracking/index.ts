import { SPECIES } from '../../content/catalog';
import { HABITAT_SITES, SPECIES_HABITATS } from '../../content/habitats';
import { isTown, MAPS } from '../../content/world';
import { dayPeriodFor } from '../calendar';
import { dayNightEncounterMultiplier } from '../environment';
import type { GameState, MapId, TownId } from '../model';
import { hasVisitedTown } from '../travel';

/** Only implemented, direct random encounters are navigation destinations. */
export function captureSites(speciesId: string) {
  if (SPECIES_HABITATS[speciesId]?.method !== 'wild') return [];
  return HABITAT_SITES.filter(
    (site) =>
      site.map &&
      site.medium !== 'story' &&
      site.encounters.some((entry) => entry.speciesId === speciesId && entry.weight > 0),
  );
}

export function captureTarget(game: GameState): string | null {
  const id = game.captureTargetId;
  return id && SPECIES[id] && game.dex.seen.includes(id) && !game.dex.caught.includes(id)
    ? id
    : null;
}

export function applyCaptureTracking(game: GameState, speciesId: string | null): void {
  if (speciesId === null) {
    game.captureTargetId = null;
    game.notice = '已取消图鉴收集追踪。';
  } else if (
    !SPECIES[speciesId] ||
    !game.dex.seen.includes(speciesId) ||
    game.dex.caught.includes(speciesId)
  ) {
    game.notice = '请选择已见过但尚未获得的精灵。';
  } else {
    game.captureTargetId = speciesId;
    game.notice = `正在追踪「${SPECIES[speciesId]!.name}」，获得后自动完成；剧情任务追踪不变。`;
  }
}

/** Applies to capture, evolution, gifts and hatching, without replacing their result notice. */
export function clearCompletedCaptureTarget(game: GameState): void {
  if (game.captureTargetId && game.dex.caught.includes(game.captureTargetId))
    game.captureTargetId = null;
}

export function captureTimeHint(game: GameState, speciesId: string): string {
  if (!captureSites(speciesId).length)
    return '此形态没有已开放的普通野外遭遇点，请按图鉴中的获取方式收集。';
  const period = dayPeriodFor(game);
  const weight = dayNightEncounterMultiplier(speciesId, period);
  const other = dayNightEncounterMultiplier(speciesId, period === 'day' ? 'night' : 'day');
  return `当前${period === 'day' ? '白天' : '夜晚'}：${weight === 0 ? '不会自然出没，请等待另一时段' : weight < other ? '较少活动，另一时段更适合寻找' : weight > other ? '较活跃，适合寻找' : '正常活动'}。天气、地点与剧情开放条件仍会影响遭遇，并非保证出现。`;
}

/** Towns on the same map or immediately connected by a real world portal, not a guessed route. */
export function nearbyVisitedTowns(game: GameState, map: MapId): TownId[] {
  const adjacent = [
    map,
    ...MAPS[map].portals.map((portal) => portal.map),
    ...Object.values(MAPS)
      .filter((entry) => entry.portals.some((portal) => portal.map === map))
      .map((entry) => entry.id),
  ];
  return [...new Set(adjacent)].filter(
    (id): id is TownId => isTown(id) && hasVisitedTown(game, id),
  );
}
