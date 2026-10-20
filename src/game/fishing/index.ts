import { isOrdinarySpecies, SPECIES } from '../../content/catalog';
import { FIELD_ACTIVITIES } from '../../content/fieldActivities';
import {
  FISHING_BAITS,
  FISHING_MILESTONE_REWARD,
  FISHING_REGION_NAMES,
  FISHING_REGIONS,
  FISHING_SITES,
  fishingRegion,
  type FishingBait,
  type FishingRegion,
} from '../../content/fishing';
import { encounterSiteAt } from '../../content/habitats';
import { MAPS } from '../../content/world';
import { calendarFor, dayPeriodFor } from '../calendar';
import { weatherAt, weightedEcology } from '../environment';
import { facingNpc, npcInReach } from '../exploration';
import type { ActivityRun } from '../activities/types';
import type { GameState, WeatherId } from '../model';

export interface FishingEncounter {
  activityId: string;
  siteId: string;
  baitId: FishingBait;
  castId: number;
  day: number;
  time: number;
  weather: WeatherId;
  settled: boolean;
}
export interface FishingState {
  casts: number;
  encounters: number;
  catches: { siteId: string; speciesId: string; count: number; day: number; time: number }[];
  claimed: FishingRegion[];
}
export function fishingState(game: GameState): FishingState {
  return (game.fishing ??= { casts: 0, encounters: 0, catches: [], claimed: [] });
}
export function fishingSiteAtPlayer(game: GameState) {
  const { map, x, y, facing } = game.player;
  const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[facing]!;
  if (
    ['~', 'W'].includes(MAPS[map].rows[y]?.[x] ?? '') ||
    MAPS[map].rows[y + dy!]?.[x + dx!] !== '~' ||
    facingNpc(game)
  )
    return undefined;
  const site = encounterSiteAt(map, x + dx!, y + dy!, 'water');
  return FISHING_SITES.find((candidate) => candidate.id === site?.id);
}
export function fishingEntryReason(game: GameState): string | null {
  if (
    game.battle ||
    game.dialogue ||
    game.pending.length ||
    game.activities?.active ||
    game.world?.trainerChallenge ||
    game.challenge?.active ||
    game.league?.active
  )
    return '请先完成当前事件，再开始垂钓。';
  if (!game.progress.flags.catchTutorial || !game.progress.flags.rival)
    return '完成对手练习与捕捉入门后，即可在岸边垂钓。';
  if (!game.party.some((id) => game.creatures[id]!.hp > 0)) return '请先让同行伙伴恢复体力。';
  if (!fishingSiteAtPlayer(game)) return '请站在岸边，面向有精灵栖息的水面再投竿。';
  return null;
}
export function validFishingLocation(game: GameState, activityId: string, siteId: string) {
  const definition = FIELD_ACTIVITIES[activityId];
  if (!definition || definition.kind !== 'fish' || definition.fishingSiteId !== siteId)
    return false;
  if (activityId === 'activity_harbor')
    return (
      game.player.map === 'harbor' &&
      MAPS.harbor.npcs.some((npc) => npc.id === definition.npcId && npcInReach(game, npc))
    );
  return fishingSiteAtPlayer(game)?.id === siteId;
}
export function fishingChoices(game: GameState, siteId: string, baitId: FishingBait = 'none') {
  const site = FISHING_SITES.find((candidate) => candidate.id === siteId);
  const types: readonly string[] = FISHING_BAITS[baitId].types;
  return weightedEcology(
    (site?.encounters ?? []).filter((entry) => isOrdinarySpecies(entry.speciesId)),
    weatherAt(game),
    dayPeriodFor(game),
  ).map((entry) => ({
    ...entry,
    weight:
      entry.weight * (SPECIES[entry.speciesId]!.types.some((type) => types.includes(type)) ? 2 : 1),
  }));
}
/** Old, genuinely in-progress WhiteSail runs had no bait or cast ledger. Register once on resume. */
export function ensureFishingCast(game: GameState, run: ActivityRun): boolean {
  const definition = FIELD_ACTIVITIES[run.id];
  if (!definition?.fishingSiteId) return false;
  run.fishing ??= { siteId: definition.fishingSiteId, baitId: 'none' };
  if (run.fishing.castId) return true;
  const ledger = fishingState(game);
  if (ledger.casts >= 999999) {
    run.feedback = '垂钓记录已满，无法继续投竿。';
    return false;
  }
  run.fishing.castId = ++ledger.casts;
  return true;
}
export function fishingCatchCount(game: GameState, region?: FishingRegion) {
  return (game.fishing?.catches ?? []).reduce(
    (sum, entry) => sum + (!region || fishingRegion(entry.siteId) === region ? entry.count : 0),
    0,
  );
}
export function claimFishingMilestone(game: GameState, region: FishingRegion): string {
  if (!FISHING_REGIONS.includes(region) || !fishingCatchCount(game, region))
    return '在这一地区类型完成一次垂钓捕捉后，才能领取纪念奖励。';
  const ledger = fishingState(game);
  if (ledger.claimed.includes(region)) return '这份垂钓纪念奖励已经领取。';
  const reward = FISHING_MILESTONE_REWARD;
  if (
    (game.inventory[reward.item] ?? 0) + reward.count > 999 ||
    game.player.money + reward.money > 9999999
  )
    return '背包或旅费已满，垂钓纪念奖励会保留，腾出空间后再领取。';
  ledger.claimed.push(region);
  game.inventory[reward.item] = (game.inventory[reward.item] ?? 0) + reward.count;
  game.player.money += reward.money;
  return `${FISHING_REGION_NAMES[region]}首钓纪念：水网星纹球 ×${reward.count}、旅费 ${reward.money}。`;
}
/** Called only from the actual successful-capture transition; never from minigame completion. */
export function recordFishingCatch(game: GameState) {
  const battle = game.battle;
  const source = battle?.fishing;
  if (
    !battle ||
    !source ||
    source.settled ||
    battle.result !== 'caught' ||
    battle.kind !== 'wild' ||
    battle.event ||
    battle.tutorialCatch ||
    battle.ruleChallenge
  )
    return;
  const speciesId = battle.enemies[0]!.speciesId;
  const ledger = fishingState(game);
  source.settled = true;
  const entry = ledger.catches.find(
    (item) => item.siteId === source.siteId && item.speciesId === speciesId,
  );
  if (entry) entry.count++;
  else
    ledger.catches.push({
      siteId: source.siteId,
      speciesId,
      count: 1,
      day: source.day,
      time: source.time,
    });
  battle.logs.push(
    `垂钓手册：${FISHING_REGION_NAMES[fishingRegion(source.siteId)]}捕捉已记录，纪念奖励可在垂钓界面领取。`,
  );
}
/** Structural limits are enforced by the save schema; cross-check source, timing and settlement. */
export function validFishing(game: GameState): boolean {
  const ledger = game.fishing;
  const now = calendarFor(game);
  const beforeNow = (entry: { day: number; time: number }) =>
    entry.day < now.day || (entry.day === now.day && entry.time <= now.time);
  const runs = [game.activities?.active, ...Object.values(game.activities?.drafts ?? {})].filter(
    (run): run is ActivityRun => !!run,
  );
  const source = game.battle?.fishing;
  const tickets = runs.flatMap((run) => (run.fishing?.castId ? [run.fishing.castId] : []));
  if (source) tickets.push(source.castId);
  if (new Set(runs.map((run) => run.id)).size !== runs.length) return false;
  if (new Set(tickets).size !== tickets.length) return false;
  if (tickets.some((id) => !ledger || id > ledger.casts)) return false;
  if (
    runs.some((run) => {
      const info = run.fishing;
      if (!info) return run.id !== 'activity_harbor' && FIELD_ACTIVITIES[run.id]?.kind === 'fish';
      return (
        FIELD_ACTIVITIES[run.id]?.fishingSiteId !== info.siteId ||
        (run.stage === 0 ? !!info.castId : !info.castId)
      );
    })
  )
    return false;
  if (ledger) {
    const completions = Object.entries(game.activities?.records ?? {}).reduce(
      (sum, [id, record]) => sum + (FIELD_ACTIVITIES[id]?.kind === 'fish' ? record.completions : 0),
      0,
    );
    const keys = ledger.catches.map((entry) => `${entry.siteId}:${entry.speciesId}`);
    if (
      !game.progress.flags.catchTutorial ||
      !game.progress.flags.rival ||
      ledger.encounters + tickets.length - (source ? 1 : 0) > ledger.casts ||
      ledger.encounters > completions ||
      fishingCatchCount(game) > ledger.encounters ||
      new Set(keys).size !== keys.length ||
      new Set(ledger.claimed).size !== ledger.claimed.length ||
      ledger.claimed.some((region) => !fishingCatchCount(game, region)) ||
      ledger.catches.some(
        (entry) =>
          !beforeNow(entry) ||
          !game.dex.caught.includes(entry.speciesId) ||
          !isOrdinarySpecies(entry.speciesId) ||
          !FISHING_SITES.some(
            (site) =>
              site.id === entry.siteId &&
              site.encounters.some((encounter) => encounter.speciesId === entry.speciesId),
          ),
      )
    )
      return false;
  }
  if (!source) return true;
  const battle = game.battle!;
  const enemy = battle.enemies[0];
  const site = FISHING_SITES.find((candidate) => candidate.id === source.siteId);
  const choices = weightedEcology(
    site?.encounters ?? [],
    source.weather,
    source.time < 21600 || source.time >= 64800 ? 'night' : 'day',
  );
  return (
    !!ledger?.encounters &&
    !!enemy &&
    battle.kind === 'wild' &&
    !battle.event &&
    !battle.tutorialCatch &&
    !battle.ruleChallenge &&
    battle.enemies.length === 1 &&
    !!game.activities?.records[source.activityId]?.completions &&
    FIELD_ACTIVITIES[source.activityId]?.fishingSiteId === source.siteId &&
    beforeNow(source) &&
    isOrdinarySpecies(enemy.speciesId) &&
    choices.some(
      (entry) =>
        entry.speciesId === enemy.speciesId && enemy.level >= entry.min && enemy.level <= entry.max,
    ) &&
    (battle.result === 'lose' || validFishingLocation(game, source.activityId, source.siteId)) &&
    source.settled === (battle.result === 'caught') &&
    (!source.settled ||
      ledger.catches.some(
        (entry) => entry.siteId === source.siteId && entry.speciesId === enemy.speciesId,
      ))
  );
}
