import { isTownLocation, MAPS } from '../../content/world';
import { hasFieldAccess } from '../../content/keyItems';
import type { GameState } from '../model';
import { isNurseryParent } from '../nursery';

export const MAX_PARTY_PRESETS = 5;
export type PartyPresetAction =
  | { kind: 'save'; index: number | null; name: string; expectedName?: string }
  | { kind: 'rename'; index: number; name: string; expectedName: string }
  | { kind: 'delete'; index: number; expectedName: string }
  | { kind: 'apply'; index: number; expectedName: string };
export const validPresetName = (name: unknown): name is string =>
  typeof name === 'string' &&
  name.length > 0 &&
  name.length <= 20 &&
  name === name.trim() &&
  !/[\x00-\x1f\x7f]/.test(name);

/** Shared by UI and command handler; presets never capture temporary battle teams. */
export function presetMenuReason(game: GameState): string | null {
  if (!isTownLocation(game.player.map)) return '到城镇安全地点后才能管理或切换队伍预设。';
  if (
    game.battle ||
    game.dialogue ||
    game.pending.length ||
    game.activities?.active ||
    game.world?.trainerChallenge
  )
    return '请先结束当前战斗、对话、活动或待处理选择。';
  if (game.challenge?.active || game.challenge?.rentalDraft)
    return '请先完成或退出规则挑战，或取消租借登记。';
  if (game.league?.active) return '联盟挑战期间不能管理或切换队伍预设。';
  if (game.progress.flags.opening && !game.progress.flags.partnerReceived)
    return '正式领取伙伴后才能保存队伍预设。';
  return null;
}
function presetAt(game: GameState, index: number) {
  return Number.isSafeInteger(index) && index >= 0 ? game.partyPresets?.[index] : undefined;
}
export function presetApplyReason(game: GameState, index: number): string | null {
  const unsafe = presetMenuReason(game);
  if (unsafe) return unsafe;
  const preset = presetAt(game, index);
  if (!preset) return '请选择有效的队伍预设。';
  if (preset.creatureIds.some((id) => isNurseryParent(game, id)))
    return '预设包含正在寄养的伙伴，请先到培育屋取回。';
  if (
    preset.creatureIds.some(
      (id) => !game.creatures[id] || (!game.party.includes(id) && !game.box.includes(id)),
    )
  )
    return '预设有伙伴已离队或放生，请重新保存这套阵容；不会自动替换成员。';
  if (!preset.creatureIds.some((id) => game.creatures[id]!.hp > 0))
    return '预设中至少需要一位可以战斗的伙伴。';
  const selected = new Set(preset.creatureIds);
  const resultingBox = [...game.box, ...game.party].filter((id) => !selected.has(id));
  if (resultingBox.length > 360) return '切换后仓库会超过360位，请先腾出位置或使用人数更多的预设。';
  if (
    ['~', 'W'].includes(MAPS[game.player.map].rows[game.player.y]?.[game.player.x] ?? '') &&
    !hasFieldAccess(game, 'waterRig') &&
    !preset.creatureIds.some((id) => game.creatures[id]!.moves.some((m) => m.id === 'surf'))
  )
    return '请先回到岸上，再切换到没有冲浪伙伴的预设。';
  return null;
}

export function applyPartyPreset(game: GameState, action: PartyPresetAction): boolean {
  const reject = (reason: string) => {
    game.notice = reason;
    return false;
  };
  const unsafe = presetMenuReason(game);
  if (unsafe) return reject(unsafe);
  const presets = game.partyPresets ?? [];
  if (
    action.index !== null &&
    (!presetAt(game, action.index) || presetAt(game, action.index)!.name !== action.expectedName)
  )
    return reject('这套预设已变更，请重新选择后操作。');
  if (action.kind === 'apply') {
    const reason = presetApplyReason(game, action.index);
    if (reason) return reject(reason);
    const preset = presets[action.index]!;
    const chosen = new Set(preset.creatureIds);
    const box = [...game.box, ...game.party].filter((id) => !chosen.has(id));
    game.party = [...preset.creatureIds];
    game.box = box;
    game.notice = `已切换到「${preset.name}」，仅调整成员与顺序，不改变技能、培养、携带物或体力。`;
    return true;
  }
  if (action.kind !== 'save' && !presetAt(game, action.index))
    return reject('请选择有效的队伍预设。');
  if (action.kind === 'delete') {
    game.partyPresets = presets.filter((_, index) => index !== action.index);
    game.notice = '已删除这套队伍预设，伙伴与物品没有改变。';
    return true;
  }
  const name = typeof action.name === 'string' ? action.name.trim() : '';
  if (!validPresetName(name)) return reject('预设名称须为1～20个字符，不能包含换行或控制字符。');
  if (presets.some((preset, index) => index !== action.index && preset.name === name))
    return reject('已有同名预设，请换一个名称。');
  if (action.kind === 'rename') {
    game.partyPresets = presets.map((preset, index) =>
      index === action.index ? { ...preset, name } : preset,
    );
    game.notice = `队伍预设已改名为「${name}」。`;
    return true;
  }
  if (action.index === null ? presets.length >= MAX_PARTY_PRESETS : !presetAt(game, action.index))
    return reject(
      action.index === null ? '最多保存5套预设，请先删除或覆盖一套。' : '请选择有效的队伍预设。',
    );
  if (
    !game.party.length ||
    game.party.length > 6 ||
    new Set(game.party).size !== game.party.length ||
    game.party.some((id) => !game.creatures[id] || isNurseryParent(game, id))
  )
    return reject('当前队伍包含无效或寄养伙伴，无法保存。');
  if (!game.party.some((id) => game.creatures[id]!.hp > 0))
    return reject('至少需要一位可以战斗的伙伴才能保存预设。');
  const preset = { name, creatureIds: [...game.party] };
  game.partyPresets =
    action.index === null
      ? [...presets, preset]
      : presets.map((old, index) => (index === action.index ? preset : old));
  game.notice = `已保存「${name}」的${game.party.length}位伙伴及排列顺序。`;
  return true;
}
