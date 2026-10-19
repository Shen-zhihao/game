import { HELD_ITEMS, heldEffect, isHeldItem } from '../../content/battleTraits';
import type { Creature, GameState } from '../model';
import { creatureName, statsFor } from '../rules';

export function equipItem(game: GameState, creatureId: string, itemId: string | null) {
  const c = game.creatures[creatureId];
  if (!c || ![...game.party, ...game.box].includes(creatureId)) return;
  if (itemId !== null && (!isHeldItem(itemId) || !(game.inventory[itemId]! > 0))) {
    game.notice = '背包中没有这件携带道具。';
    return;
  }
  if (c.heldItem === itemId || (!c.heldItem && itemId === null)) {
    game.notice = '伙伴的携带道具没有变化。';
    return;
  }
  if (c.heldItem && (game.inventory[c.heldItem] ?? 0) >= 999) {
    game.notice = '旧道具的口袋已满，请先腾出位置再更换。';
    return;
  }
  if (c.heldItem) game.inventory[c.heldItem] = (game.inventory[c.heldItem] ?? 0) + 1;
  if (itemId && isHeldItem(itemId)) game.inventory[itemId]! -= 1;
  c.heldItem = itemId as Creature['heldItem'];
  game.notice = itemId
    ? `${creatureName(c)}携带了${HELD_ITEMS[itemId as keyof typeof HELD_ITEMS].name}。`
    : '携带道具已收回背包。';
}

/** Consumables trigger immediately, including on a switched-in partner or weather damage. */
export function triggerHeldItem(c: Creature, logs: string[]) {
  const effect = heldEffect(c);
  if (!effect || c.hp <= 0) return;
  if (effect.cureStatus && (c.status || c.confusionTurns)) {
    c.status = null;
    c.sleepTurns = 0;
    delete c.confusionTurns;
    logs.push(`${creatureName(c)}的${effect.name}解除了异常状态，果实已消耗。`);
    c.heldItem = null;
  } else if (effect.berryHeal && c.hp <= statsFor(c).hp / 2) {
    const old = c.hp;
    c.hp = Math.min(
      statsFor(c).hp,
      c.hp + Math.max(1, Math.floor(statsFor(c).hp * effect.berryHeal)),
    );
    logs.push(`${creatureName(c)}的${effect.name}恢复了${c.hp - old}点体力，果实已消耗。`);
    c.heldItem = null;
  }
}
export function endHeldTurn(c: Creature, logs: string[]) {
  triggerHeldItem(c, logs);
  const effect = heldEffect(c);
  if (effect?.endHeal && c.hp > 0 && c.hp < statsFor(c).hp) {
    const old = c.hp;
    c.hp = Math.min(
      statsFor(c).hp,
      c.hp + Math.max(1, Math.floor(statsFor(c).hp * effect.endHeal)),
    );
    logs.push(`${creatureName(c)}的${effect.name}恢复了${c.hp - old}点体力。`);
  }
}
