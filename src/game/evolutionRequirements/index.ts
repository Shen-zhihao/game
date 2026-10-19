import { ITEMS, MOVES } from '../../content/catalog';
import { SPECIAL_EVOLUTION_PLACES } from '../../content/specialEvolutions';
import type { Creature, Evolution, GameState, SpecialEvolutionCondition } from '../model';
import { dayPeriodFor } from '../calendar';
import { friendshipFor } from '../friendship';

export function specialEvolutionMet(
  creature: Creature,
  condition: SpecialEvolutionCondition,
  game: GameState,
): boolean {
  return (
    game.party.includes(creature.id) &&
    creature.level >= condition.minLevel &&
    (condition.friendship === undefined ||
      friendshipFor(creature).points >= condition.friendship) &&
    (condition.period === undefined || dayPeriodFor(game) === condition.period) &&
    (condition.maps === undefined || condition.maps.includes(game.player.map)) &&
    (condition.moveId === undefined || creature.moves.some((move) => move.id === condition.moveId))
  );
}

export function specialEvolutionLabel(condition: SpecialEvolutionCondition): string {
  return [
    '随队同行',
    `Lv.${condition.minLevel}`,
    condition.friendship !== undefined ? `亲密度 ${condition.friendship}` : '',
    condition.period
      ? condition.period === 'day'
        ? '白天（06:00–18:00）'
        : '夜晚（18:00–06:00）'
      : '',
    condition.maps
      ? `身处${condition.maps.map((map) => SPECIAL_EVOLUTION_PLACES[map] ?? map).join('／')}`
      : '',
    condition.moveId ? `当前掌握${MOVES[condition.moveId]!.name}` : '',
  ]
    .filter(Boolean)
    .join('＋');
}

/** Shared by the party, dex, habitats, training advice and offline dex generator. */
export function evolutionRequirementsLabel(edge: Evolution): string {
  const condition = edge.condition;
  const original =
    condition.kind === 'level'
      ? `Lv.${condition.level}`
      : `Lv.${condition.minLevel}＋${ITEMS[condition.itemId]!.name}${condition.consumeItem ? '（消耗）' : '（保留）'}`;
  return [
    original,
    ...(edge.alternatives ?? []).map((route) => `${specialEvolutionLabel(route)}（免道具）`),
  ].join('；或 ');
}

export function evolutionProgressLabel(
  creature: Creature,
  edge: Evolution,
  game: GameState,
): string {
  const progress = (edge.alternatives ?? []).map((condition) => {
    const unmet = [
      !game.party.includes(creature.id) ? '先加入队伍' : '',
      creature.level < condition.minLevel ? `等级 ${creature.level}/${condition.minLevel}` : '',
      condition.friendship !== undefined && friendshipFor(creature).points < condition.friendship
        ? `亲密度 ${friendshipFor(creature).points}/${condition.friendship}`
        : '',
      condition.period && dayPeriodFor(game) !== condition.period
        ? `需等到${condition.period === 'day' ? '白天' : '夜晚'}`
        : '',
      condition.maps && !condition.maps.includes(game.player.map)
        ? `需前往${condition.maps.map((map) => SPECIAL_EVOLUTION_PLACES[map] ?? map).join('／')}`
        : '',
      condition.moveId && !creature.moves.some((move) => move.id === condition.moveId)
        ? `需掌握${MOVES[condition.moveId]!.name}`
        : '',
    ].filter(Boolean);
    return unmet.length
      ? `特殊路线尚需：${unmet.join('；')}`
      : '特殊路线已满足：本次进化不消耗道具。';
  });
  return progress.join(' ');
}
