import { Creature } from '../model';
import { statsFor } from '../rules';
import { MOVES } from '../../content/catalog';

export const SUPPLY_IDS = [
  'potion',
  'super_potion',
  'hyper_potion',
  'revive',
  'antidote',
  'ether',
] as const;
export type SupplyId = (typeof SUPPLY_IDS)[number];
export const isSupply = (id: string): id is SupplyId =>
  (SUPPLY_IDS as readonly string[]).includes(id);
export function supplyReason(c: Creature, id: SupplyId): string | null {
  if (id === 'revive') return c.hp > 0 ? '伙伴仍能战斗，不需要复苏芽。' : null;
  if (!c.hp) return '这个道具不能让昏厥的精灵恢复。';
  if (
    (id === 'potion' || id === 'super_potion' || id === 'hyper_potion') &&
    c.hp === statsFor(c).hp
  )
    return '体力已满，无需使用。';
  if (id === 'antidote' && !c.status) return '没有异常状态，无需使用。';
  if (id === 'ether' && c.moves.every((m) => m.pp === MOVES[m.id]!.pp))
    return '全部技能 PP 已满，无需使用。';
  return null;
}
export function applySupply(c: Creature, id: SupplyId): boolean {
  if (supplyReason(c, id)) return false;
  if (id === 'potion' || id === 'super_potion' || id === 'hyper_potion')
    c.hp = Math.min(
      statsFor(c).hp,
      c.hp + (id === 'potion' ? 30 : id === 'super_potion' ? 100 : 200),
    );
  if (id === 'revive') {
    c.hp = Math.max(1, Math.floor(statsFor(c).hp / 2));
    c.status = null;
    c.sleepTurns = 0;
  }
  if (id === 'antidote') {
    c.status = null;
    c.sleepTurns = 0;
  }
  if (id === 'ether') for (const m of c.moves) m.pp = Math.min(MOVES[m.id]!.pp, m.pp + 10);
  return true;
}
