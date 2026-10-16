import { ELECTRIC_CHAPTER } from '../electric';
import { WIND_CHAPTER } from '../wind';
import { FURNACE_CHAPTER } from '../furnace';
import { LAKE_CHAPTER } from '../lake';
import { STAR_CHAPTER } from '../star';
import { LEAGUE_MAPS, LEAGUE_TRAINERS, LEAGUE_PREREQUISITES } from '../league';
import { CONSERVATION_CONTENT } from '../conservation';
import type { GameMap } from '../world';
import type {
  MapId,
  StoryEvent,
  AdventureBattleEvent,
  AdventureMapId,
  TownId,
} from '../../game/model';
import type { AdventureTrainer, AdventureEncounter } from '../adventureTypes';
export { PHOTO_TOWNS } from '../star';

export const ADVENTURE_CHAPTERS = [
  ELECTRIC_CHAPTER,
  WIND_CHAPTER,
  FURNACE_CHAPTER,
  LAKE_CHAPTER,
  STAR_CHAPTER,
];
export const ADVENTURE_GYMS = ADVENTURE_CHAPTERS.map((c) => c.gym);
export const ADVENTURE_STORY_CONTENT = [...ADVENTURE_CHAPTERS, CONSERVATION_CONTENT];
export const ADVENTURE_MAPS = Object.fromEntries([
  ...Object.entries(LEAGUE_MAPS),
  ...ADVENTURE_STORY_CONTENT.flatMap((c) => c.maps.map((m) => [m.id, m])),
]) as Record<AdventureMapId | Exclude<TownId, 'dawn' | 'moss' | 'stone' | 'harbor'>, GameMap>;
export const ADVENTURE_TRAINERS = Object.fromEntries([
  ...Object.entries(LEAGUE_TRAINERS),
  ...ADVENTURE_CHAPTERS.flatMap((c) => Object.entries(c.trainers)),
]) as Record<AdventureBattleEvent, AdventureTrainer>;
export const ADVENTURE_ENCOUNTERS = Object.assign(
  {},
  ...ADVENTURE_STORY_CONTENT.map((c) => c.encounters ?? {}),
) as Partial<Record<StoryEvent, AdventureEncounter>>;
export const adventureEncounter = (event: StoryEvent | null) =>
  event ? ADVENTURE_ENCOUNTERS[event] : undefined;
export const ADVENTURE_EVENTS = [
  ...Object.keys(ADVENTURE_TRAINERS),
  ...Object.keys(ADVENTURE_ENCOUNTERS),
  'leagueCredits',
  'journeyCredits',
] as StoryEvent[];
export const ADVENTURE_INTERACTIONS = Object.assign(
  {},
  ...ADVENTURE_STORY_CONTENT.map((c) => c.interactions),
) as (typeof ELECTRIC_CHAPTER)['interactions'];
export const ADVENTURE_FINDS = Object.assign({}, ...ADVENTURE_STORY_CONTENT.map((c) => c.finds), {
  championRoad: [
    [4, 10],
    [34, 26],
    [24, 35],
  ],
  league: [
    [31, 27],
    [12, 20],
  ],
}) as (typeof ELECTRIC_CHAPTER)['finds'];
export const ADVENTURE_PREREQUISITES = Object.fromEntries([
  ...ADVENTURE_CHAPTERS.flatMap((c) => [
    ...Object.values(c.encounters ?? {}).flatMap((e) =>
      e
        ? [
            [e.awakened, e.requires],
            [e.caught, [e.awakened]],
          ]
        : [],
    ),
    ...Object.values(c.interactions).flatMap((i) =>
      i.rules.flatMap((r) =>
        (r.sets ?? []).map((flag) => [flag, [...(i.requires ?? []), ...(r.when ?? [])]]),
      ),
    ),
    [c.gym.switches[0], ['rival', 'catchTutorial']],
    [c.gym.scout, [c.gym.switches[0]]],
    [c.gym.switches[1], [c.gym.scout]],
    [c.gym.keeper, [c.gym.switches[1]]],
    [
      c.gym.leader,
      [
        'rival',
        'catchTutorial',
        c.gym.scout,
        c.gym.keeper,
        c.gym.switches[0],
        c.gym.switches[1],
        c.gym.tool,
      ],
    ],
    [c.gym.tool, [c.gym.leader]],
    ...Object.entries(c.prerequisites),
  ]),
  ...Object.entries(LEAGUE_PREREQUISITES),
  ...Object.values(CONSERVATION_CONTENT.encounters ?? {}).flatMap((e) =>
    e
      ? [
          [e.awakened, e.requires],
          [e.caught, [e.awakened]],
        ]
      : [],
  ),
  ...Object.values(CONSERVATION_CONTENT.interactions).flatMap((i) =>
    i.rules.flatMap((r) =>
      (r.sets ?? []).map((f) => [f, [...(i.requires ?? []), ...(r.when ?? [])]]),
    ),
  ),
  ...Object.entries(CONSERVATION_CONTENT.prerequisites),
]) as Record<string, string[]>;
export const ADVENTURE_FLAGS = [
  ...new Set([...Object.keys(ADVENTURE_PREREQUISITES), ...ADVENTURE_GYMS.map((g) => g.tool)]),
];
export function adventureObjective(flags: Record<string, boolean>, map: MapId): string | null {
  const chapter = ADVENTURE_CHAPTERS.find((c) => c.maps.some((m) => m.id === map));
  if (!chapter) return null;
  const gym = chapter.gym;
  if (map === gym.map && !flags[gym.leader])
    return !flags[gym.switches[0]]
      ? '启动本馆第一处机关。'
      : !flags[gym.scout]
        ? '完成本馆学徒练习。'
        : !flags[gym.switches[1]]
          ? '启动第二处机关。'
          : !flags[gym.keeper]
            ? '完成本馆守门训练师练习。'
            : `挑战馆主，获得${gym.badge}！`;
  return (
    chapter.objectives[map]?.find(([flag]) => flags[flag])?.[1] ??
    `${chapter.title}：道馆与普通道路自由开放，可向当地居民了解调查与支线。`
  );
}
