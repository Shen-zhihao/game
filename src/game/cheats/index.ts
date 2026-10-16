import { ITEMS } from '../../content/catalog';
import { KEY_ITEMS, hasFieldAccess } from '../../content/keyItems';
import type { GameState } from '../model';

export const CHEAT_CODES = [
  // Explicit IDs keep existing commands stable when new items are added or reordered.
  ...(
    [
      ['101', 'ball', 99],
      ['102', 'great_ball', 99],
      ['103', 'ultra_ball', 99],
      ['104', 'master_ball', 1],
      ['105', 'master_ball', 10],
      ['106', 'master_ball', 99],
      ['201', 'potion', 99],
      ['202', 'super_potion', 99],
      ['203', 'hyper_potion', 99],
      ['204', 'revive', 99],
      ['205', 'antidote', 99],
      ['206', 'ether', 99],
      ['301', 'candy', 99],
      ['302', 'respec', 99],
      ['303', 'skill_copy', 99],
      ['401', 'growth_seed', 10],
      ['402', 'moon_shard', 10],
      ['403', 'thunder_core', 10],
      ['404', 'tide_pearl', 10],
      ['405', 'frost_crystal', 10],
      ['406', 'old_inscription', 10],
      ['407', 'forged_heart', 10],
      ['408', 'dusk_veil', 10],
      ['409', 'wind_plume', 10],
      ['410', 'dragon_scale', 10],
      ['411', 'echo_bell', 10],
      ['412', 'amber_drop', 10],
    ] as const
  ).map(([code, itemId, quantity]) => ({ code, itemId, quantity })),
  ...KEY_ITEMS.map((item) => ({ code: item.code, itemId: item.id, quantity: 1 })),
] as const;
export const normalizeCheatCode = (code: string) => code.trim();
export const cheatFor = (code: string) =>
  CHEAT_CODES.find((entry) => entry.code === normalizeCheatCode(code));
export function cheatReason(game: GameState, code: string): string | null {
  if (game.battle || game.dialogue || game.pending.length || game.progress.flags.starterChoice)
    return '请先完成当前战斗、对话或成长选择。';
  const entry = cheatFor(code);
  if (!entry) return code.trim() ? '指令无效，请输入三位数字指令。' : '请输入三位数字指令。';
  const key = KEY_ITEMS.find((i) => i.id === entry.itemId);
  if (key && hasFieldAccess(game, key.flag)) return '已经持有这件重要物品。';
  // Leave room for the unclaimed story balls so a full cheat stack cannot break later story rewards.
  const limit =
    entry.itemId === 'master_ball' ? 999 - (3 - (game.masterBalls?.claimed.length ?? 0)) : 999;
  if ((game.inventory[entry.itemId] ?? 0) + entry.quantity > limit)
    return '该道具已接近携带上限，本次未领取。大师球会为尚未领取的剧情奖励预留位置。';
  if (
    (game.cheats?.redemptions ?? 0) >= 999999999 ||
    (game.cheats?.masterBallsGranted ?? 0) + (entry.itemId === 'master_ball' ? entry.quantity : 0) >
      999999999
  )
    return '领取记录已达上限，本次未领取。';
  return null;
}
export function redeemCheat(game: GameState, code: string): void {
  const reason = cheatReason(game, code);
  if (reason) {
    game.notice = reason;
    return;
  }
  const entry = cheatFor(code)!;
  const ledger = (game.cheats ??= { redemptions: 0, masterBallsGranted: 0, masterBallsUsed: 0 });
  ledger.redemptions++;
  if (entry.itemId === 'master_ball') ledger.masterBallsGranted += entry.quantity;
  game.inventory[entry.itemId] = (game.inventory[entry.itemId] ?? 0) + entry.quantity;
  game.notice = `已获得${ITEMS[entry.itemId]!.name} ×${entry.quantity}。`;
}
