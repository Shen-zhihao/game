import { ALL_SPECIES, ITEMS, SPECIES } from '../../content/catalog';
import { KEY_ITEMS, hasFieldAccess } from '../../content/keyItems';
import type { GameState } from '../model';
import { makeCreature } from '../rules';

export const ITEM_CHEAT_CODES = [
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
  ).map(([code, itemId, quantity]) => ({ kind: 'item' as const, code, itemId, quantity })),
  ...KEY_ITEMS.map((item) => ({
    kind: 'item' as const,
    code: item.code,
    itemId: item.id,
    quantity: 1,
  })),
] as const;
export const CREATURE_CHEAT_CODES = ALL_SPECIES.map((species) => ({
  kind: 'creature' as const,
  code: `6${String(species.dexNumber).padStart(3, '0')}`,
  speciesId: species.id,
  level: 5,
}));
export const CHEAT_CODES = [...ITEM_CHEAT_CODES, ...CREATURE_CHEAT_CODES];
export const normalizeCheatCode = (code: string) => code.trim();
export const cheatFor = (code: string) =>
  CHEAT_CODES.find((entry) => entry.code === normalizeCheatCode(code));
export function cheatReason(game: GameState, code: string): string | null {
  if (game.battle || game.dialogue || game.pending.length || game.progress.flags.starterChoice)
    return '请先完成当前战斗、对话或成长选择。';
  const entry = cheatFor(code);
  if (!entry)
    return code.trim()
      ? '指令无效，请输入三位道具或四位精灵数字指令。'
      : '请输入三位道具或四位精灵数字指令。';
  if ((game.cheats?.redemptions ?? 0) >= 999999999) return '领取记录已达上限，本次未领取。';
  if (entry.kind === 'creature') {
    if (game.progress.flags.opening && !game.progress.flags.partnerReceived)
      return '请先完成博士救援并正式获得初始伙伴。';
    if (game.party.length >= 6 && game.box.length >= 360)
      return '队伍和仓库都已满，本次未获得精灵。';
    return null;
  }
  const key = KEY_ITEMS.find((i) => i.id === entry.itemId);
  if (key && hasFieldAccess(game, key.flag)) return '已经持有这件重要物品。';
  // Leave room for the unclaimed story balls so a full cheat stack cannot break later story rewards.
  const limit =
    entry.itemId === 'master_ball' ? 999 - (3 - (game.masterBalls?.claimed.length ?? 0)) : 999;
  if ((game.inventory[entry.itemId] ?? 0) + entry.quantity > limit)
    return '该道具已接近携带上限，本次未领取。大师球会为尚未领取的剧情奖励预留位置。';
  if (
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
  if (entry.kind === 'creature') {
    const creature = makeCreature(game, entry.speciesId, entry.level);
    creature.history[0]!.label = '通过精灵数字指令成为伙伴';
    game.creatures[creature.id] = creature;
    const inParty = game.party.length < 6;
    (inParty ? game.party : game.box).push(creature.id);
    if (!game.dex.seen.includes(entry.speciesId)) game.dex.seen.push(entry.speciesId);
    if (!game.dex.caught.includes(entry.speciesId)) game.dex.caught.push(entry.speciesId);
    game.notice = `已获得${SPECIES[entry.speciesId]!.name} Lv.${entry.level}，已加入${inParty ? '队伍' : '仓库'}。`;
    return;
  }
  if (entry.itemId === 'master_ball') ledger.masterBallsGranted += entry.quantity;
  game.inventory[entry.itemId] = (game.inventory[entry.itemId] ?? 0) + entry.quantity;
  game.notice = `已获得${ITEMS[entry.itemId]!.name} ×${entry.quantity}。`;
}
