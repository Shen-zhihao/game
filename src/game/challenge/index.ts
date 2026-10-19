import { ITEMS, MOVES, SPECIES } from '../../content/catalog';
import { LEAGUE_STAGES, LEAGUE_TRAINERS } from '../../content/league';
import { isTownLocation } from '../../content/world';
import { emptyStages } from '../battle';
import { chooseEnemyMove, curateTrainerTeam } from '../battle/strategy';
import { emptyStats, growthRoll, growthSeed, recommendedAllocation } from '../growth';
import type { Creature, GameState } from '../model';
import { makeCreature, nextId, random, statsFor, xpAt } from '../rules';

export interface ChallengeLedger {
  points: number;
  best: number;
  streak: number;
  active: {
    selected: string[];
    originalParty: string[];
    originalBox: string[];
    originals: Record<string, Creature>;
  } | null;
}
export type ChallengeAction =
  | { kind: 'start'; creatureIds: string[] }
  | { kind: 'next' | 'retire' }
  | { kind: 'exchange'; offerId: string };
export const CHALLENGE_OFFERS = [
  { id: 'berry', name: ITEMS.held_berry!.name, itemId: 'held_berry', cost: 5 },
  { id: 'cleanse', name: ITEMS.held_cleanse!.name, itemId: 'held_cleanse', cost: 5 },
  { id: 'band', name: ITEMS.held_band!.name, itemId: 'held_band', cost: 25 },
  { id: 'lens', name: ITEMS.held_lens!.name, itemId: 'held_lens', cost: 25 },
  { id: 'leftovers', name: ITEMS.held_leftovers!.name, itemId: 'held_leftovers', cost: 35 },
] as const;
const MAX_COUNTER = 999999;
const count = (n: number) =>
  Number.isFinite(n) ? Math.min(MAX_COUNTER, Math.max(0, Math.floor(n))) : 0;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function ledger(g: GameState): ChallengeLedger {
  const l = (g.challenge ??= { points: 0, best: 0, streak: 0, active: null });
  l.points = count(l.points);
  l.best = count(l.best);
  l.streak = count(l.streak);
  return l;
}
export function challengeEntryReason(g: GameState): string | null {
  if (!g.progress.flags.champion) return '成为联盟冠军后解锁规则挑战。';
  if (
    g.battle ||
    g.dialogue ||
    g.pending.length ||
    g.activities?.active ||
    g.progress.flags.starterChoice
  )
    return '请先结束战斗、对话、成长选择或小游戏。';
  if (g.league?.active) return '请先结束联盟连战。';
  if (!isTownLocation(g.player.map)) return '请在安全城镇中登记规则挑战。';
  return null;
}
function heal(c: Creature) {
  c.hp = statsFor(c).hp;
  c.status = null;
  c.sleepTurns = 0;
  c.moves.forEach((m) => {
    m.pp = MOVES[m.id]!.pp;
  });
}
/** Temporary standardized training, not a conversion of the owner's permanent allocation. */
function normalize(original: Creature): Creature {
  const c = copy(original);
  c.level = 50;
  c.experience = xpAt(50, SPECIES[c.speciesId]!.experienceCurve);
  const seed = growthSeed(c.id);
  c.training = {
    mode: 'auto',
    seed,
    rolls: Array.from({ length: 49 }, (_, i) => growthRoll(seed, c.speciesId, i + 2)),
    strengthFromLevel: 2,
    naturalGrowthFromLevel: 1,
    allocated: emptyStats(),
    legacyBonus: emptyStats(),
  };
  c.training.allocated = recommendedAllocation(c);
  heal(c);
  return c;
}
function restore(g: GameState) {
  const l = ledger(g);
  if (!l.active) return;
  for (const id of l.active.selected) g.creatures[id] = copy(l.active.originals[id]!);
  g.party = [...l.active.originalParty];
  g.box = [...l.active.originalBox];
  l.active = null;
  l.streak = 0;
}
function nextBattle(g: GameState) {
  const l = ledger(g);
  if (!l.active) return;
  // Recreate temporary records every round, including consumed held items, without touching inventory.
  for (const id of l.active.selected) g.creatures[id] = normalize(l.active.originals[id]!);
  const theme = LEAGUE_STAGES[Math.floor(random(g) * LEAGUE_STAGES.length)]!;
  const trainer = LEAGUE_TRAINERS[theme]!;
  const pool = [...trainer.team];
  const enemies: Creature[] = [];
  for (let i = 0; i < 3; i++) {
    const [speciesId] = pool.splice(Math.floor(random(g) * pool.length), 1)[0]!;
    const c = makeCreature(g, speciesId, 50, true);
    c.heldItem = i % 2 === 0 ? 'held_berry' : 'held_shell';
    enemies.push(c);
  }
  curateTrainerTeam(theme, enemies);
  const playerId = l.active.selected[0]!;
  g.battle = {
    id: nextId(g, 'challenge'),
    ruleChallenge: true,
    kind: 'trainer',
    event: null,
    name: `规则挑战 · ${trainer.name}`,
    enemies,
    enemyIndex: 0,
    playerId,
    participants: [playerId],
    phase: 'choose',
    turn: 1,
    aiMove: 0,
    playerStages: emptyStages(),
    enemyStages: emptyStages(),
    logs: [
      `单打规则挑战 · 第 ${l.streak + 1} 场`,
      '双方各三只，统一 Lv.50，禁止背包与逃跑；仅奖励挑战积分。',
    ],
    result: null,
    runAttempts: 0,
    tutorialCatch: false,
    weather: { kind: 'clear', ambient: 'clear', turns: null },
    rewards: { defeated: [], experience: 0, money: 0, completion: false },
  };
  g.battle.aiMove = chooseEnemyMove(g);
  g.notice = '规则挑战开始。原队伍已安全保留，退出或战败后完整还原。';
}
/** Called only on closing an ended challenge battle, before the engine clears battle. */
export function finishChallengeBattle(g: GameState) {
  const b = g.battle;
  if (!b?.ruleChallenge || b.phase !== 'ended' || !b.result || b.challengeSettled) return;
  b.challengeSettled = true;
  const l = ledger(g);
  if (!l.active) return;
  if (b.result === 'win') {
    l.streak = count(l.streak + 1);
    l.best = count(Math.max(l.best, l.streak));
    const reward = 5 + Math.min(10, Math.floor(l.streak / 3));
    const before = l.points;
    l.points = count(l.points + reward);
    g.notice = `规则挑战获胜：${l.streak} 连胜，积分 +${l.points - before}。可继续下一场或结束并还原队伍。`;
  } else {
    restore(g);
    g.notice =
      '本轮规则挑战结束，原队伍、培养、体力、技能次数与携带道具已完整还原。积分与最高纪录保留。';
  }
}
export function applyChallenge(g: GameState, action: ChallengeAction): boolean {
  const reason = challengeEntryReason(g);
  if (reason) {
    g.notice = reason;
    return false;
  }
  const l = ledger(g);
  if (action.kind === 'start') {
    if (l.active) {
      g.notice = '已有一轮挑战，请继续或先结束。';
      return false;
    }
    const ids = action.creatureIds;
    if (
      ids.length !== 3 ||
      new Set(ids).size !== 3 ||
      ids.some((id) => !g.party.includes(id) || !g.creatures[id])
    ) {
      g.notice = '必须从当前同行队伍选择三只不同的伙伴。';
      return false;
    }
    if (g.box.length + g.party.length - ids.length > 360) {
      g.notice = '仓库空间不足，请先为未参赛伙伴留出位置。';
      return false;
    }
    l.active = {
      selected: [...ids],
      originalParty: [...g.party],
      originalBox: [...g.box],
      originals: Object.fromEntries(ids.map((id) => [id, copy(g.creatures[id]!)])),
    };
    l.streak = 0;
    g.box = [...g.box, ...g.party.filter((id) => !ids.includes(id))];
    g.party = [...ids];
    nextBattle(g);
    return true;
  }
  if (action.kind === 'retire') {
    if (!l.active) return false;
    restore(g);
    g.notice = '已结束规则挑战并完整还原原队伍，积分与最高连胜纪录保留。';
    return true;
  }
  if (action.kind === 'next') {
    if (!l.active) return false;
    nextBattle(g);
    return true;
  }
  if (action.kind !== 'exchange') return false;
  if (l.active) {
    g.notice = '请先结束本轮挑战，再兑换奖励。';
    return false;
  }
  const offer = CHALLENGE_OFFERS.find((o) => o.id === action.offerId);
  if (!offer || l.points < offer.cost) {
    g.notice = '挑战积分不足或奖励不存在。';
    return false;
  }
  const quantity = g.inventory[offer.itemId] ?? 0;
  if (quantity >= 999) {
    g.notice = '该道具口袋已满。';
    return false;
  }
  l.points -= offer.cost;
  g.inventory[offer.itemId] = quantity + 1;
  g.notice = `兑换了${offer.name}，消耗 ${offer.cost} 挑战积分。`;
  return true;
}
