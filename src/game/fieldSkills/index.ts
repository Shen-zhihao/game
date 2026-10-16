import { canLearnMove, learnset, MOVES } from '../../content/catalog';
import { isTownLocation, MAPS } from '../../content/world';
import { Creature, GameState } from '../model';
import { hasFieldAccess } from '../../content/keyItems';
import { npcInReach } from '../exploration';

export const FIELD_SKILLS = [
  {
    id: 'field_cut',
    name: '剪藤术',
    flag: 'questReward',
    story: '完成森林救援并向穗禾报告',
    use: '战斗中为草系物理攻击；野外识路知识记入手册。剪藤工具仍由枝叶馆授予。',
  },
  {
    id: 'field_break',
    name: '碎岩术',
    flag: 'plaqueReturned',
    story: '把旧矿山工牌归还砚叔',
    use: '战斗中为格斗物理攻击；碎岩工具仍可由砾岩馆获得，不要求先学此招。',
  },
  {
    id: 'surf',
    name: '冲浪术',
    flag: 'lighthouseRepaired',
    story: '完成旧灯塔维修支线',
    use: '任意队伍伙伴掌握后可行走普通水面；潮汐馆渡水装备也能独立渡水。',
  },
] as const;
export const fieldSkill = (moveId: string) => FIELD_SKILLS.find((s) => s.id === moveId);
export const fieldSkillUnlocked = (game: GameState, moveId: string) => {
  const skill = fieldSkill(moveId);
  return !skill || !!game.progress.flags[skill.flag];
};
export function atCenter(game: GameState): boolean {
  return (
    isTownLocation(game.player.map) &&
    MAPS[game.player.map].npcs.some((n) => n.role === 'healer' && npcInReach(game, n))
  );
}
export function canSurf(game: GameState): boolean {
  return (
    hasFieldAccess(game, 'waterRig') ||
    (!!game.progress.flags.lighthouseRepaired &&
      game.party.some((id) => game.creatures[id]!.moves.some((m) => m.id === 'surf')))
  );
}
export function wouldLoseSurf(
  game: GameState,
  creatureId: string,
  replacing: number | null,
  nextMove?: string,
): boolean {
  if (
    hasFieldAccess(game, 'waterRig') ||
    nextMove === 'surf' ||
    replacing === null ||
    !['~', 'W'].includes(MAPS[game.player.map].rows[game.player.y]?.[game.player.x] ?? '')
  )
    return false;
  return !game.party.some((id) =>
    game.creatures[id]!.moves.some(
      (m, i) => m.id === 'surf' && !(id === creatureId && i === replacing),
    ),
  );
}
export function centerOptions(game: GameState, c: Creature): string[] {
  return [
    ...new Set([
      ...learnset(c.speciesId)
        .filter((m) => m.level <= c.level)
        .map((m) => m.moveId),
      ...(c.taughtMoves ?? []),
      ...FIELD_SKILLS.filter((s) => game.progress.flags[s.flag]).map((s) => s.id),
    ]),
  ].filter((id) => fieldSkillUnlocked(game, id) && canLearnMove(c.speciesId, id));
}
export function centerLearnReason(
  game: GameState,
  c: Creature | undefined,
  moveId: string,
  replace: number | null,
): string | null {
  if (!atCenter(game)) return '请到任意城市的精灵中心治疗员身旁办理。';
  if (!c || ![...game.party, ...game.box].includes(c.id)) return '请选择自己的伙伴。';
  if (!fieldSkillUnlocked(game, moveId)) return '这个通用技能需要先完成对应剧情。';
  if (!centerOptions(game, c).includes(moveId)) return '这个技能尚未解锁或不在伙伴的回忆列表中。';
  if (c.moves.some((m) => m.id === moveId)) return '伙伴已经掌握这个技能。';
  if (
    replace === null
      ? c.moves.length >= 4
      : !Number.isSafeInteger(replace) || replace < 0 || replace >= c.moves.length
  )
    return '请选择有效的空位或替换技能。';
  if (!MOVES[moveId]) return '未知技能。';
  return null;
}
