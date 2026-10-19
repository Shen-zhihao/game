import type { Creature, GameState } from '../model';

export const FRIENDSHIP_BASE = 40;
export const FRIENDSHIP_MAX = 255;
export const FRIENDSHIP_WALK_STEPS = 128;
export const FRIENDSHIP_WALK_GAIN = 2;
export const FRIENDSHIP_INTERACTION_STEPS = 64;
export const FRIENDSHIP_INTERACTION_SECONDS = 60;
export const FRIENDSHIP_INTERACTION_GAIN = 8;

export const createFriendship = (): NonNullable<Creature['friendship']> => ({
  points: FRIENDSHIP_BASE,
  walkingSteps: 0,
  interactionSteps: FRIENDSHIP_INTERACTION_STEPS,
  lastInteractionAt: null,
});

/** Reads never migrate a save or credit steps taken before this feature existed. */
export const friendshipFor = (creature: Creature) => creature.friendship ?? createFriendship();

export function friendshipLabel(points: number): string {
  return points >= 220
    ? '心意相通'
    : points >= 160
      ? '亲密伙伴'
      : points >= 100
        ? '渐渐信赖'
        : '初识同行';
}

export function friendshipInteractionReason(game: GameState, creature: Creature): string | null {
  if (
    game.battle ||
    game.dialogue ||
    game.pending.length ||
    game.activities?.active ||
    game.challenge?.active ||
    game.league?.active ||
    game.world?.trainerChallenge ||
    game.progress.flags.starterChoice
  )
    return '请先结束当前战斗、对话、活动或成长选择。';
  if (!game.party.includes(creature.id)) return '先把伙伴从仓库带入队伍，再一起相处。';
  if (creature.hp <= 0) return '伙伴需要先恢复体力，才能继续互动。';
  const friendship = friendshipFor(creature);
  if (friendship.points >= FRIENDSHIP_MAX) return '你们已经心意相通，亲密度已满。';
  if (friendship.lastInteractionAt === null) return null;
  const steps = FRIENDSHIP_INTERACTION_STEPS - friendship.interactionSteps;
  const seconds = Math.max(
    0,
    FRIENDSHIP_INTERACTION_SECONDS - (game.playTimeSeconds - friendship.lastInteractionAt),
  );
  if (steps <= 0 && seconds <= 0) return null;
  return `再${[
    steps > 0 ? `让它在队伍中同行 ${steps} 步` : '',
    seconds > 0 ? `游玩 ${seconds} 秒` : '',
  ]
    .filter(Boolean)
    .join('，并')}后可以互动。休息不抵扣等待时间。`;
}

/** Only call for a successful walked tile, never turns against a wall, travel, or time ticks. */
export function walkWithPartners(game: GameState): string[] {
  const gained: string[] = [];
  for (const id of game.party) {
    const creature = game.creatures[id]!;
    if (creature.hp <= 0) continue;
    const friendship = (creature.friendship ??= createFriendship());
    friendship.interactionSteps = Math.min(
      FRIENDSHIP_INTERACTION_STEPS,
      friendship.interactionSteps + 1,
    );
    friendship.walkingSteps++;
    if (friendship.walkingSteps < FRIENDSHIP_WALK_STEPS) continue;
    friendship.walkingSteps = 0;
    const before = friendship.points;
    friendship.points = Math.min(FRIENDSHIP_MAX, friendship.points + FRIENDSHIP_WALK_GAIN);
    if (before !== friendship.points) gained.push(id);
  }
  return gained;
}

export function interactWithPartner(game: GameState, creature: Creature): number {
  if (friendshipInteractionReason(game, creature)) return 0;
  const friendship = (creature.friendship ??= createFriendship());
  const before = friendship.points;
  friendship.points = Math.min(FRIENDSHIP_MAX, before + FRIENDSHIP_INTERACTION_GAIN);
  friendship.interactionSteps = 0;
  friendship.lastInteractionAt = game.playTimeSeconds;
  return friendship.points - before;
}
