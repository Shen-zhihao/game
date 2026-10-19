import { isOrdinarySpecies } from '../../content/catalog';
import { HABITAT_SITES } from '../../content/habitats';
import { PRODUCTION_TOWNS, type ProductionTown } from '../../content/production';
import { calendarFor, dayPeriodFor, type DayPeriod } from '../calendar';
import type { GameState, MapId } from '../model';
import { advancedRecipeProgress, advancedRecipeUnlockNotice } from '../production';

/** First genuine field encounter in each time period; never reconstructed from the Pokédex. */
export interface ObservationRecord {
  speciesId: string;
  map: MapId;
  day: number;
  time: number;
}
export type EcologyState = Partial<
  Record<ProductionTown, Partial<Record<DayPeriod, ObservationRecord>>>
>;
export const OBSERVATION_AREAS: Record<
  ProductionTown,
  { title: string; location: string; maps: readonly MapId[] }
> = {
  dawn: {
    title: '晨芽昼夜观察',
    location: '晨光一号路草丛、溪湾或晨芽花园池',
    maps: ['dawn', 'route'],
  },
  stone: {
    title: '石脊昼夜观察',
    location: '二号碎石道或石脊旧矿山的草丛、暗河',
    maps: ['stoneRoute', 'mine'],
  },
  harbor: {
    title: '白帆昼夜观察',
    location: '三号矿港道草滩、水域或白帆垂钓',
    maps: ['coastRoute', 'harbor'],
  },
};
function habitatContains(map: MapId, speciesId: string): boolean {
  return (
    isOrdinarySpecies(speciesId) &&
    HABITAT_SITES.some(
      (site) =>
        // The harbor fishing activity uses the neighboring coast's water encounter pools.
        (site.map === map ||
          (map === 'harbor' && site.map === 'coastRoute' && site.medium === 'water')) &&
        site.medium !== 'story' &&
        site.encounters.some((entry) => entry.speciesId === speciesId),
    )
  );
}
export function observationProgress(game: GameState, town: ProductionTown) {
  const records = game.ecology?.[town];
  return {
    ...OBSERVATION_AREAS[town],
    day: records?.day,
    night: records?.night,
    complete: !!records?.day && !!records?.night,
  };
}

/** Only field movement, shore investigation and successful fishing supply this provenance. */
export function recordWildObservation(game: GameState, map: MapId): void {
  const battle = game.battle;
  if (
    !battle ||
    battle.kind !== 'wild' ||
    battle.event ||
    battle.tutorialCatch ||
    battle.ruleChallenge ||
    game.challenge?.active ||
    game.league?.active
  )
    return;
  const speciesId = battle.enemies[0]?.speciesId;
  const town = PRODUCTION_TOWNS.find((town) => OBSERVATION_AREAS[town].maps.includes(map));
  if (!town || !speciesId || !habitatContains(map, speciesId)) return;
  const period = dayPeriodFor(game);
  const records = ((game.ecology ??= {})[town] ??= {});
  if (records[period]) return;
  const previouslyUnlocked = advancedRecipeProgress(game, town).unlocked;
  records[period] = { speciesId, map, ...calendarFor(game) };
  battle.logs.push(
    `观察手册：${OBSERVATION_AREAS[town].title} · ${period === 'day' ? '白天' : '夜晚'}已记录。`,
  );
  const unlocked = advancedRecipeUnlockNotice(game, town, previouslyUnlocked);
  if (unlocked) battle.logs.push(unlocked);
}

/** Structural validation is handled by the strict save schema; validate provenance and chronology. */
export function validEcology(game: GameState): boolean {
  const now = calendarFor(game);
  return PRODUCTION_TOWNS.every((town) =>
    (['day', 'night'] as const).every((period) => {
      const record = game.ecology?.[town]?.[period];
      if (!record) return true;
      const actualPeriod = record.time < 21600 || record.time >= 64800 ? 'night' : 'day';
      return (
        OBSERVATION_AREAS[town].maps.includes(record.map) &&
        habitatContains(record.map, record.speciesId) &&
        game.dex.seen.includes(record.speciesId) &&
        actualPeriod === period &&
        (record.day < now.day || (record.day === now.day && record.time <= now.time))
      );
    }),
  );
}
