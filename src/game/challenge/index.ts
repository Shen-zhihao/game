import { makeRentalOpponents, rentalStage } from './rental';
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
  rentalDraft?: { offers: Creature[]; selected: string[] };
  rentalClears?: number;
  active: {
    selected: string[];
    originalParty: string[];
    originalBox: string[];
    originals: Record<string, Creature>;
    rental?: { opponents: Creature[]; swapped: boolean };
  } | null;
}
export type ChallengeAction =
  | { kind: 'start'; creatureIds: string[] }
  | { kind: 'next' | 'retire' }
  | { kind: 'exchange'; offerId: string }
  | { kind: 'rentalOffer' | 'rentalCancel' | 'rentalStart' }
  | { kind: 'rentalSelect'; creatureId: string }
  | { kind: 'rentalSwap'; outgoingId: string; incomingId: string };
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
  delete c.confusionTurns;
  c.moves.forEach((m) => {
    m.pp = MOVES[m.id]!.pp;
  });
}
/** Temporary standardized training, not a conversion of the owner's permanent allocation. */
export function challengePreview(original: Creature): Creature {
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
  for (const id of l.active.selected) {
    if (l.active.rental) delete g.creatures[id];
    else g.creatures[id] = copy(l.active.originals[id]!);
  }
  g.party = [...l.active.originalParty];
  g.box = [...l.active.originalBox];
  l.active = null;
  l.streak = 0;
}
function nextBattle(g: GameState) {
  const l = ledger(g);
  if (!l.active) return;
  // Recreate temporary records every round, including consumed held items, without touching inventory.
  for (const id of l.active.selected) g.creatures[id] = challengePreview(l.active.originals[id]!);
  if (l.active.rental) {
    l.active.rental.opponents = [];
    l.active.rental.swapped = false;
  }
  const stage = l.active.rental ? rentalStage(l.streak) : null;
  const enemies: Creature[] = [];
  let trainerName: string;
  if (stage) {
    enemies.push(...makeRentalOpponents(g, l.streak).map(challengePreview));
    trainerName = stage.name;
  } else {
    const theme = LEAGUE_STAGES[Math.floor(random(g) * LEAGUE_STAGES.length)]!;
    const trainer = LEAGUE_TRAINERS[theme]!;
    trainerName = trainer.name;
    const pool = [...trainer.team];
    for (let i = 0; i < 3; i++) {
      const [speciesId] = pool.splice(Math.floor(random(g) * pool.length), 1)[0]!;
      const c = makeCreature(g, speciesId, 50, true);
      c.heldItem = i % 2 === 0 ? 'held_berry' : 'held_shell';
      enemies.push(c);
    }
    curateTrainerTeam(theme, enemies);
  }
  // Keep pristine opponents so a consumed held item is restored when that rental is chosen.
  if (l.active.rental) l.active.rental.opponents = enemies.map(challengePreview);
  const playerId = l.active.selected[0]!;
  g.battle = {
    id: nextId(g, 'challenge'),
    ruleChallenge: true,
    kind: 'trainer',
    event: null,
    name: `${l.active.rental ? '租借挑战' : '规则挑战'} · ${trainerName}`,
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
      `${l.active.rental ? '租借队伍挑战' : '单打规则挑战'} · 第 ${l.streak + 1}${l.active.rental ? '/3' : ''} 场`,
      '双方各三只，统一 Lv.50，禁止背包与逃跑；仅奖励挑战积分。',
      ...(stage ? [`${stage.theme}：${stage.hint}`] : []),
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
    if (l.active.rental) {
      if (l.streak >= 3) {
        l.rentalClears = count((l.rentalClears ?? 0) + 1);
        restore(g);
        g.notice =
          '租借挑战三场通关！原队伍与仓库已还原，租借伙伴不会收入图鉴或仓库。挑战积分与通关纪录保留。';
      } else {
        // The pristine opponent templates were persisted at battle creation.
        l.active.rental.swapped = false;
        g.notice = `租借挑战第 ${l.streak}/3 场获胜！可从刚击败的队伍换入一只，也可直接继续。`;
      }
      return;
    }
    g.notice = `规则挑战获胜：${l.streak} 连胜，积分 +${l.points - before}。可继续下一场或结束并还原队伍。`;
  } else {
    restore(g);
    g.notice =
      '本轮规则挑战结束，原队伍、培养、体力、技能次数与携带道具已完整还原。积分与最高纪录保留。';
  }
}
export function applyChallenge(g: GameState, action: ChallengeAction): boolean {
  // Explicit retirement remains available in combat; it is not an escape/capture action.
  if (action.kind === 'retire' && g.challenge?.active?.rental) {
    restore(g);
    g.battle = null;
    g.notice = '已退出租借挑战，原队伍和仓库完整还原。已得积分保留。';
    return true;
  }
  const reason = challengeEntryReason(g);
  if (reason) {
    g.notice = reason;
    return false;
  }
  const l = ledger(g);
  if (action.kind === 'rentalOffer') {
    if (l.active || l.rentalDraft) return false;
    const species = [
      ...new Set(LEAGUE_STAGES.flatMap((stage) => LEAGUE_TRAINERS[stage]!.team.map(([id]) => id))),
    ];
    const offers: Creature[] = [];
    for (let i = 0; i < 6; i++) {
      const [id] = species.splice(Math.floor(random(g) * species.length), 1);
      const c = makeCreature(g, id!, 50, true);
      c.heldItem = i % 2 ? 'held_shell' : 'held_berry';
      offers.push(challengePreview(c));
    }
    l.rentalDraft = { offers, selected: [] };
    g.notice = '六选三：查看技能后选择三只租借伙伴。未出发前不会替换自己的队伍。';
    return true;
  }
  if (action.kind === 'rentalCancel') {
    if (l.active || !l.rentalDraft) return false;
    delete l.rentalDraft;
    g.notice = '已取消租借登记，自己的伙伴没有改变。';
    return true;
  }
  if (action.kind === 'rentalSelect') {
    const d = l.rentalDraft;
    if (l.active || !d || !d.offers.some((c) => c.id === action.creatureId)) return false;
    if (d.selected.includes(action.creatureId))
      d.selected = d.selected.filter((id) => id !== action.creatureId);
    else if (d.selected.length < 3) d.selected.push(action.creatureId);
    else return false;
    return true;
  }
  if (action.kind === 'rentalStart') {
    const d = l.rentalDraft;
    if (l.active || !d || d.selected.length !== 3 || new Set(d.selected).size !== 3) return false;
    const originals = Object.fromEntries(
      d.selected.map((id) => [id, copy(d.offers.find((c) => c.id === id)!)]),
    );
    if (d.selected.some((id) => !originals[id] || g.creatures[id])) return false;
    l.active = {
      selected: [...d.selected],
      originalParty: [...g.party],
      originalBox: [...g.box],
      originals,
      rental: { opponents: [], swapped: false },
    };
    g.box = [...g.box, ...g.party];
    g.party = [...d.selected];
    l.streak = 0;
    delete l.rentalDraft;
    nextBattle(g);
    return true;
  }
  if (action.kind === 'rentalSwap') {
    const a = l.active;
    const r = a?.rental;
    if (!a || !r || r.swapped || l.streak < 1 || l.streak >= 3) return false;
    const index = a.selected.indexOf(action.outgoingId);
    const incoming = r.opponents.find((c) => c.id === action.incomingId);
    if (index < 0 || !incoming || g.creatures[incoming.id]) return false;
    delete g.creatures[action.outgoingId];
    delete a.originals[action.outgoingId];
    a.selected[index] = incoming.id;
    g.party = [...a.selected];
    a.originals[incoming.id] = copy(incoming);
    g.creatures[incoming.id] = challengePreview(incoming);
    r.swapped = true;
    g.notice = '已换入一只租借伙伴，本场换人机会已使用。继续挑战会恢复整个租借队伍。';
    return true;
  }
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
    delete l.rentalDraft;
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
