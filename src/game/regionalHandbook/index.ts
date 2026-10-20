import { CITIES } from '../../content/cities';
import { CITY_ACTIVITIES } from '../../content/fieldActivities';
import { FISHING_SITES } from '../../content/fishing';
import { journalQuests } from '../../content/quests';
import { REGION_PLACES, regionPlaceForMap } from '../../content/region';
import { PRODUCTION_TOWNS } from '../../content/production';
import { MAPS, isTown } from '../../content/world';
import { OBSERVATION_AREAS, observationProgress } from '../ecology';
import { FIELD_CACHES, handbookDiscoveryFlag } from '../fieldExploration';
import type { GameState, MapId } from '../model';
import { hasVisitedTown } from '../travel';

export interface HandbookEntry {
  id: string;
  title: string;
  detail: string;
  done: boolean;
  map?: MapId;
  questId?: string;
}
export interface HandbookSection {
  id: string;
  title: string;
  entries: HandbookEntry[];
}
/** Read-only projection. Generated finds are not proof that the player discovered them. */
export function regionalHandbook(game: GameState, regionId: string) {
  const place = REGION_PLACES.find((entry) => entry.id === regionId);
  const belongs = (map: MapId) => regionPlaceForMap(map)?.id === regionId;
  const maps = Object.values(MAPS).filter((map) => belongs(map.id));
  const knownPlace =
    !!place?.map &&
    (belongs(game.player.map) || (isTown(place.map) && hasVisitedTown(game, place.map)));
  const quests: HandbookEntry[] = journalQuests(game).flatMap((quest) => {
    const contactMap = quest.contact
      ? Object.values(MAPS).find((map) => map.npcs.some((npc) => npc.id === quest.contact))?.id
      : CITIES.find((city) => city.quests.some((entry) => entry.id === quest.cityQuestId))?.map;
    if (!contactMap || !belongs(contactMap)) return [];
    return [
      {
        id: quest.id,
        title: quest.name,
        done: quest.status === 'completed',
        map: contactMap,
        questId: quest.status === 'completed' ? undefined : quest.id,
        detail:
          quest.status === 'ready'
            ? `可交付 · ${quest.next}`
            : quest.status === 'completed'
              ? '已完成并保留任务记录。'
              : `进行中 · ${quest.next}`,
      },
    ];
  });
  const ecology: HandbookEntry[] = PRODUCTION_TOWNS.flatMap((town) => {
    const area = OBSERVATION_AREAS[town];
    if (!area.maps.some(belongs)) return [];
    const progress = observationProgress(game, town);
    if (!knownPlace && !progress.day && !progress.night) return [];
    const map = area.maps.find(belongs)!;
    return [
      {
        id: `ecology-${town}`,
        title: area.title,
        map,
        done: progress.complete,
        detail: `白天 ${progress.day ? '已记录' : '待观察'} · 夜晚 ${progress.night ? '已记录' : '待观察'}。在当地普通野外遭遇中完成观察，不要求捕捉。`,
      },
    ];
  });
  const fishing: HandbookEntry[] = FISHING_SITES.filter(
    (site) => site.map && belongs(site.map),
  ).flatMap((site) => {
    const count = (game.fishing?.catches ?? [])
      .filter((entry) => entry.siteId === site.id)
      .reduce((sum, entry) => sum + entry.count, 0);
    if (!knownPlace && !count) return [];
    return [
      {
        id: `fish-${site.id}`,
        title: site.name,
        map: site.map!,
        done: count > 0,
        detail: count
          ? `已成功捕捉 ${count} 次 · 当地首钓目标已完成。水域类别奖励请在垂钓界面查看。`
          : '当地首钓 0/1 · 到岸边面向水面选择垂钓，成功捕捉才计入。',
      },
    ];
  });
  const supplies: HandbookEntry[] = [];
  for (const map of maps)
    for (const npc of map.npcs) {
      const cache = FIELD_CACHES[npc.id];
      if (!cache) continue;
      const done = !!game.progress.flags[cache.flag];
      if (!done && !game.progress.flags[handbookDiscoveryFlag(npc.id)]) continue;
      supplies.push({
        id: npc.id,
        title: npc.name,
        map: map.id,
        done,
        detail: done
          ? '探险补给已领取。'
          : '已发现，尚未领取。返回该地区再次调查；工具条件与背包容量仍须满足。',
      });
    }
  for (const [id, find] of Object.entries(game.world?.finds ?? {})) {
    if (
      find.kind !== 'items' ||
      !belongs(find.map) ||
      (!find.claimed && !game.progress.flags[handbookDiscoveryFlag(id)])
    )
      continue;
    supplies.push({
      id,
      title: '沿途补给',
      map: find.map,
      done: find.claimed,
      detail: find.claimed
        ? '已领取的沿途补给记录。'
        : '已调查但尚未领取，请整理背包后返回该地区寻找。',
    });
  }
  const activities: HandbookEntry[] = CITY_ACTIVITIES.filter(
    (activity) => activity.town && belongs(activity.town),
  ).flatMap((activity) => {
    const done = !!game.progress.flags[activity.goalFlag];
    if (!knownPlace && !done) return [];
    return [
      {
        id: activity.id,
        title: activity.title,
        map: activity.town!,
        done,
        detail: done ? '已完成首次活动目标，可继续体验。' : activity.instructions,
      },
    ];
  });
  const sections: HandbookSection[] = [
    { id: 'quests', title: '已接触委托', entries: quests },
    { id: 'ecology', title: '昼夜调查', entries: ecology },
    { id: 'fishing', title: '当地首钓', entries: fishing },
    { id: 'supplies', title: '已发现补给', entries: supplies },
    { id: 'activities', title: '城市体验', entries: activities },
  ];
  const entries = sections.flatMap((section) => section.entries);
  const next =
    quests.find((entry) => entry.detail.startsWith('可交付')) ??
    entries.find((entry) => !entry.done);
  return {
    sections,
    next: next
      ? `下一步：${next.title} · ${next.detail}`
      : entries.length
        ? '当前已记录的阶段目标已完成。继续与居民交流和实地探索，发现新的记录。'
        : '先亲自到访并与居民交流、调查环境，再逐步补充本地区记录。',
  };
}
