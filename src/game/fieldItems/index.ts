import type { GameState } from '../model';

export const REPEL_STEPS = 100;

export function fieldItemReason(game: GameState, itemId: string): string | null {
  if (itemId !== 'repel') return '这件道具不能在探索中使用。';
  if (
    game.battle ||
    game.dialogue ||
    game.pending.length ||
    game.activities?.active ||
    game.world?.trainerChallenge
  )
    return '请先完成当前事件，再使用探索道具。';
  if (!(game.inventory.repel! > 0)) return '背包里没有驱避喷雾。';
  if ((game.repelSteps ?? 0) > 0) return `驱避喷雾仍有效，剩余 ${game.repelSteps} 步。`;
  if (!game.party.some((id) => game.creatures[id]!.hp > 0))
    return '先让同行伙伴恢复体力，再使用驱避喷雾。';
  return null;
}

export function applyFieldItem(game: GameState, itemId: string): void {
  const reason = fieldItemReason(game, itemId);
  if (reason) {
    game.notice = reason;
    return;
  }
  game.inventory.repel!--;
  game.repelSteps = REPEL_STEPS;
  game.notice = '使用了驱避喷雾，接下来 100 步会驱避等级较低的普通野生精灵。';
}

/** Return the protection for this step before decrementing, including the final step. */
export function consumeRepelStep(game: GameState): boolean {
  if (!(game.repelSteps! > 0)) return false;
  game.repelSteps!--;
  if (game.repelSteps === 0) game.notice = '驱避喷雾的效果结束了。可以在背包中再次使用。';
  return true;
}

export function repelsEncounter(game: GameState, level: number, protectedStep: boolean): boolean {
  const lead = game.party.map((id) => game.creatures[id]!).find((c) => c.hp > 0);
  return protectedStep && !!lead && level < lead.level;
}
