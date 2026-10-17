import { hasFieldAccess } from '../../content/keyItems';
import { isTownLocation, MAPS } from '../../content/world';
import type { GameState } from '../model';
import { creatureName } from '../rules';

/** Shared by the menu and command handler so disabled actions explain the actual rule. */
export function boxTransferReason(game: GameState, creatureId: string, withdraw: boolean) {
  if (!isTownLocation(game.player.map)) return '到城镇后可存取仓库，城镇内的建筑也可以使用。';
  const from = withdraw ? game.box : game.party;
  const to = withdraw ? game.party : game.box;
  if (!from.includes(creatureId)) return withdraw ? '请选择仓库里的伙伴。' : '请选择队伍中的伙伴。';
  if (to.length >= (withdraw ? 6 : 360))
    return withdraw ? '队伍已满，请先送一位伙伴到仓库。' : '仓库已满，最多容纳360只伙伴。';
  if (withdraw) return null;
  if (from.length <= 1 || !from.some((id) => id !== creatureId && game.creatures[id]!.hp > 0))
    return '队伍需要保留至少一位可以战斗的伙伴。';
  if (
    ['~', 'W'].includes(MAPS[game.player.map].rows[game.player.y]?.[game.player.x] ?? '') &&
    !hasFieldAccess(game, 'waterRig') &&
    game.creatures[creatureId]!.moves.some((m) => m.id === 'surf') &&
    !from.some((id) => id !== creatureId && game.creatures[id]!.moves.some((m) => m.id === 'surf'))
  )
    return '请先回到岸上，再让最后一位会冲浪的伙伴入库。';
  return null;
}

export function reorderParty(game: GameState, creatureId: string, toIndex: number) {
  const fromIndex = game.party.indexOf(creatureId);
  if (fromIndex < 0) {
    game.notice = '只能调整队伍中的伙伴顺序。';
    return;
  }
  if (!Number.isSafeInteger(toIndex) || toIndex < 0 || toIndex >= game.party.length) {
    game.notice = '请选择有效的队伍位置。';
    return;
  }
  if (fromIndex === toIndex) return;
  game.party.splice(fromIndex, 1);
  game.party.splice(toIndex, 0, creatureId);
  game.notice = `${creatureName(game.creatures[creatureId]!)}已移到队伍第${toIndex + 1}位。`;
}
