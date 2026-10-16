import { canLearnMove, learnset, MOVES } from '../../content/catalog';
import { Creature, GameState } from '../model';
import { creatureName, record } from '../rules';
import { fieldSkillUnlocked, wouldLoseSurf } from '../fieldSkills';

export const copyableMove = (moveId: string) =>
  Object.hasOwn(MOVES, moveId) && moveId !== 'struggle' && !MOVES[moveId]!.exclusiveSpeciesId;
export function recallOptions(c: Creature): { moveId: string; level: number; copied: boolean }[] {
  const entries = learnset(c.speciesId)
    .filter((m) => m.level <= c.level)
    .map((m) => ({ ...m, copied: false }));
  for (const moveId of c.taughtMoves ?? [])
    if (
      copyableMove(moveId) &&
      canLearnMove(c.speciesId, moveId) &&
      !entries.some((m) => m.moveId === moveId)
    )
      entries.push({ moveId, level: 1, copied: true });
  return entries;
}
export function copyMoveReason(
  state: GameState,
  sourceId: string,
  creatureId: string,
  moveId: string,
  replace: number | null,
): string | null {
  if (state.battle || state.dialogue || state.pending.length || state.progress.flags.starterChoice)
    return '请先完成战斗、对话或成长选择。';
  if (!(state.inventory.skill_copy! > 0)) return '没有技能复刻剂了，可在城镇购买或兑换。';
  const source = state.creatures[sourceId];
  const target = state.creatures[creatureId];
  const owned = [...state.party, ...state.box];
  if (!source || !target || !owned.includes(sourceId) || !owned.includes(creatureId))
    return '请选择自己队伍或仓库中的伙伴。';
  if (MOVES[moveId]?.exclusiveSpeciesId)
    return '专属技能只能由对应精灵自然习得或回忆，无法使用复刻剂复制。';
  if (!copyableMove(moveId) || !source.moves.some((m) => m.id === moveId))
    return '来源伙伴当前没有掌握这个可复刻技能。';
  if (!fieldSkillUnlocked(state, moveId))
    return '剧情通用技能需要先完成对应剧情，不能通过复刻提前解锁。';
  if (target.moves.some((m) => m.id === moveId)) return '接收伙伴已经掌握此技能，不会消耗道具。';
  if (wouldLoseSurf(state, creatureId, replace, moveId))
    return '请先回到岸上，再替换队伍最后一个冲浪术。';
  if (replace === null)
    return target.moves.length < 4 ? null : '已掌握四个技能，请先选择要替换的技能。';
  if (!Number.isSafeInteger(replace) || replace < 0 || replace >= target.moves.length)
    return '请选择有效的替换位置。';
  return null;
}
export function copyMove(
  state: GameState,
  sourceId: string,
  creatureId: string,
  moveId: string,
  replace: number | null,
): void {
  const reason = copyMoveReason(state, sourceId, creatureId, moveId, replace);
  if (reason) {
    state.notice = reason;
    return;
  }
  const target = state.creatures[creatureId]!;
  const slot = { id: moveId, pp: MOVES[moveId]!.pp };
  if (replace === null) target.moves.push(slot);
  else target.moves[replace] = slot;
  target.taughtMoves ??= [];
  if (!target.taughtMoves.includes(moveId)) target.taughtMoves.push(moveId);
  state.inventory.skill_copy!--;
  record(target, 'learned', `复刻学会${MOVES[moveId]!.name}`);
  state.notice = `${creatureName(target)}复刻学会了${MOVES[moveId]!.name}！消耗技能复刻剂 ×1，来源伙伴保留技能与 PP。`;
}
