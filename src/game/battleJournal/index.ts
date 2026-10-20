import type { Battle, Creature, GameState } from '../model';
import { creatureName } from '../rules';

export const JOURNAL_BATTLE_LIMIT = 5;
export const JOURNAL_EVENT_LIMIT = 400;
export type DamageSource =
  'move' | 'hazard' | 'weather' | 'status' | 'recoil' | 'confusion' | 'seed';
export interface BattleJournalEvent {
  turn: number;
  kind: 'message' | 'damage' | 'knockout';
  text: string;
  source?: DamageSource;
  target?: string;
  amount?: number;
}
export interface BattleJournalRecord {
  id: string;
  name: string;
  kind: 'wild' | 'trainer';
  turns: number;
  result: 'win' | 'lose' | 'caught' | 'escaped' | 'abandoned' | null;
  partial: boolean;
  truncated: boolean;
  events: BattleJournalEvent[];
}
const cursors = new WeakMap<Battle, { index: number; turn: number }>();
function append(b: Battle, event: BattleJournalEvent) {
  const journal = b.journal!;
  journal.events.push(event);
  if (journal.events.length > JOURNAL_EVENT_LIMIT) {
    journal.events.splice(0, journal.events.length - JOURNAL_EVENT_LIMIT);
    journal.truncated = true;
  }
  journal.turns = Math.max(journal.turns, event.turn);
}
export function beginJournal(b: Battle, partial = false) {
  if (!b.journal) {
    b.journal = {
      id: b.id,
      name: b.name,
      kind: b.kind,
      turns: b.turn,
      result: b.result,
      partial,
      truncated: false,
      events: [],
    };
    for (const text of b.logs)
      append(b, { turn: b.turn, kind: 'message', text: text.slice(0, 200) });
  }
}
/** Introductory context added by the encounter source after battle creation. */
export function prependBattleLog(b: Battle | null | undefined, text: string) {
  if (!b) return;
  b.logs.unshift(text);
  if (b.journal) {
    b.journal.events.unshift({ turn: b.turn, kind: 'message', text: text.slice(0, 200) });
    if (b.journal.events.length > JOURNAL_EVENT_LIMIT) {
      b.journal.events.splice(0, b.journal.events.length - JOURNAL_EVENT_LIMIT);
      b.journal.truncated = true;
    }
  }
}
export function beginJournalAction(b: Battle) {
  beginJournal(b, true);
  cursors.set(b, { index: 0, turn: b.turn });
}
export function flushJournalLogs(b: Battle) {
  const cursor = cursors.get(b);
  if (!cursor) return;
  for (const text of b.logs.slice(cursor.index))
    append(b, { turn: cursor.turn, kind: 'message', text: text.slice(0, 200) });
  cursor.index = b.logs.length;
}
/** Called at the actual HP deduction, before berries, healing or end-of-battle restoration. */
export function journalDamage(b: Battle, target: Creature, amount: number, source: DamageSource) {
  if (!b.journal || amount <= 0) return;
  flushJournalLogs(b);
  const turn = cursors.get(b)?.turn ?? b.turn;
  const side = b.enemies.some((enemy) => enemy.id === target.id) ? '对方' : '我方';
  const name = `${side}·${creatureName(target)}`.slice(0, 60);
  append(b, {
    turn,
    kind: 'damage',
    source,
    target: name,
    amount,
    text: `${name}实际损失 ${amount} 点体力。`,
  });
  if (target.hp <= 0)
    append(b, { turn, kind: 'knockout', source, target: name, text: `${name}失去战斗能力。` });
}
export function archiveBattleJournal(g: GameState, abandoned = false) {
  const b = g.battle;
  if (!b || (!b.result && !abandoned)) return;
  beginJournal(b, true);
  const journal = b.journal!;
  journal.result = abandoned && !b.result ? 'abandoned' : b.result;
  // IDs are the existing battle IDs; recording never consumes RNG or gameplay sequence.
  g.battleJournal = [
    { ...journal, events: journal.events.map((event) => ({ ...event })) },
    ...(g.battleJournal ?? []).filter((r) => r.id !== b.id),
  ].slice(0, JOURNAL_BATTLE_LIMIT);
}
export function finishJournalAction(g: GameState, b: Battle) {
  flushJournalLogs(b);
  if (b.result) archiveBattleJournal(g);
  cursors.delete(b);
}
