import { ITEMS } from '../../content/catalog';
import { hasFieldAccess } from '../../content/keyItems';
import type { Npc } from '../../content/world';
import type { GameState } from '../model';

const CACHES: Record<
  string,
  { flag: string; tool?: string; need?: string; items: [string, number][] }
> = {
  iceTrailCache: {
    flag: 'iceTrailReward',
    items: [
      ['super_potion', 3],
      ['ultra_ball', 2],
    ],
  },
  waterfallCache: {
    flag: 'waterfallReward',
    items: [
      ['candy', 1],
      ['ultra_ball', 3],
    ],
  },
  forestRevisitCache: {
    flag: 'forestRevisitReward',
    tool: 'vineCut',
    need: '取得枝叶馆剪藤工具后，回来剪开缠绕箱盖的藤蔓。',
    items: [['super_potion', 2]],
  },
  mineRevisitCache: {
    flag: 'mineRevisitReward',
    tool: 'rockBreaker',
    need: '取得砾岩馆碎岩工具后，回来清理压住箱盖的碎岩。',
    items: [['ultra_ball', 2]],
  },
};
export function interactFieldExploration(
  game: GameState,
  npc: Npc,
  talk: (speaker: string, lines: string[]) => void,
): boolean {
  const cache = CACHES[npc.id];
  if (cache) {
    if (cache.tool && !hasFieldAccess(game, cache.tool)) talk(npc.name, [cache.need!]);
    else if (game.progress.flags[cache.flag])
      talk(npc.name, ['这份探险补给已经领取过了。箱子里留下了你的探索记录，不会重复补货。']);
    else if (cache.items.some(([id, count]) => (game.inventory[id] ?? 0) + count > 999)) {
      talk(npc.name, ['背包中对应物品数量即将超过 999，请先腾出空间；箱内补给仍会为你保留。']);
    } else {
      for (const [id, count] of cache.items) game.inventory[id] = (game.inventory[id] ?? 0) + count;
      game.progress.flags[cache.flag] = true;
      talk(npc.name, [
        `发现一次性探险补给：${cache.items.map(([id, count]) => `${ITEMS[id]!.name} ×${count}`).join('、')}。已放入背包。`,
      ]);
    }
    return true;
  }
  if (npc.id === 'iceTrailReturn' || npc.id === 'waterfallReturn') {
    const ice = npc.id === 'iceTrailReturn';
    Object.assign(
      game.player,
      ice ? { x: 35, y: 34, facing: 'up' } : { x: 49, y: 19, facing: 'down' },
    );
    game.encounterCooldown = Math.max(5, game.encounterCooldown);
    game.notice = ice
      ? '沿安全绳回到冰窟入口，已领取的补给不会重置。'
      : '沿安全绳回到瀑布下方，无需冲浪伙伴或装备。';
    return true;
  }
  return false;
}
