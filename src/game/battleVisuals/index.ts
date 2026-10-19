import { MOVES, SPECIES, TYPE_COLORS } from '../../content/catalog';
import type {
  BattleFigure,
  BattleCaptureEvent,
  BattleMoveEvent,
  BattleScene,
  BattleVisualEvent,
  Creature,
  GameState,
  TypeId,
} from '../model';
import { statsFor, xpAt } from '../rules';
import { earnedPoints } from '../growth';

export interface BattleSwitchVisual {
  side: 'player' | 'enemy';
  phase: 'recall' | 'send' | 'reveal';
  figure: BattleFigure;
}

/** A failed check releases immediately after its last completed shake. */
export function captureAnimationTiming(event: Pick<BattleCaptureEvent, 'caught' | 'shakes'>) {
  const shakes = event.caught ? 3 : (event.shakes ?? 3);
  const releaseAt = (53 + shakes * 10) / 100;
  const endAt = event.caught ? 1 : (70 + shakes * 10) / 100;
  return { shakes, releaseAt, endAt, duration: Math.round(endAt * 3200) };
}

/** Derive switching from existing scene snapshots, preserving the saved battle format. */
export function presentationSwitches(
  initial: BattleScene,
  events: BattleVisualEvent[],
  line: number,
): BattleSwitchVisual[] {
  let previous = initial;
  const switches: BattleSwitchVisual[] = [];
  for (const event of events) {
    if (event.kind === 'move') {
      previous = event.after;
      continue;
    }
    if (event.kind === 'capture') {
      previous = event.scene;
      continue;
    }
    for (const side of ['player', 'enemy'] as const) {
      const outgoing = previous[side];
      const incoming = event.scene[side];
      if (outgoing.id === incoming.id) continue;
      // A voluntary player switch has a recall message immediately before the send-out.
      // Fainted partners and opposing reinforcements only need the send-out animation.
      if (side === 'player' && outgoing.hp > 0 && event.logIndex - 1 === line)
        switches.push({ side, phase: 'recall', figure: outgoing });
      if (event.logIndex === line) switches.push({ side, phase: 'send', figure: incoming });
    }
    previous = event.scene;
  }
  return switches;
}

export const battleFigure = (c: Creature): BattleFigure => ({
  id: c.id,
  speciesId: c.speciesId,
  nickname: c.nickname,
  level: c.level,
  hp: c.hp,
  maxHp: statsFor(c).hp,
  status: c.status,
  confusionTurns: c.confusionTurns ?? 0,
  experience: c.experience,
  growthPoints: earnedPoints(c),
});

export interface BattleFaintVisual {
  side: 'player' | 'enemy';
  figure: BattleFigure;
  logIndex: number;
}
export function presentationFaints(
  initial: BattleScene,
  events: BattleVisualEvent[],
  line: number,
  scene: BattleScene,
): BattleFaintVisual[] {
  let previous = initial;
  const faints: BattleFaintVisual[] = [];
  for (const event of events) {
    const next = event.kind === 'move' ? event.after : event.scene;
    for (const side of ['player', 'enemy'] as const) {
      const prior = event.kind === 'move' ? event.before[side] : previous[side];
      if (prior.id === next[side].id && prior.hp > 0 && next[side].hp <= 0) {
        const logIndex = event.kind === 'move' ? event.endLogIndex + 1 : event.logIndex;
        if (line >= logIndex && scene[side].id === prior.id && scene[side].hp <= 0)
          faints.push({ side, figure: prior, logIndex });
      }
    }
    previous = next;
  }
  return faints;
}
export interface BattleGrowthVisual {
  before: BattleFigure;
  after: BattleFigure;
}
export function presentationGrowth(
  initial: BattleScene,
  events: BattleVisualEvent[],
  line: number,
): BattleGrowthVisual | null {
  let previous = initial;
  for (const event of events) {
    const next = event.kind === 'move' ? event.after : event.scene;
    if (
      event.logIndex === line &&
      previous.player.id === next.player.id &&
      (next.player.experience ?? 0) > (previous.player.experience ?? 0)
    )
      return { before: previous.player, after: next.player };
    previous = next;
  }
  return null;
}
export function experienceRatio(figure: BattleFigure) {
  if (figure.level >= 100) return 1;
  const curve = SPECIES[figure.speciesId]!.experienceCurve;
  const base = xpAt(figure.level, curve),
    next = xpAt(figure.level + 1, curve);
  return Math.max(0, Math.min(1, ((figure.experience ?? base) - base) / Math.max(1, next - base)));
}
export function experienceFrames(before: BattleFigure, after: BattleFigure) {
  const count = Math.max(1, after.level - before.level + 1);
  const input = [0],
    output = [experienceRatio(before)];
  for (let i = 0; i < count - 1; i++) {
    const boundary = (i + 1) / count;
    input.push(boundary - 0.00001, boundary);
    output.push(1, 0);
  }
  input.push(1);
  output.push(experienceRatio(after));
  return {
    input,
    output,
    duration:
      after.level > before.level ? Math.min(2800, 1100 + (after.level - before.level) * 200) : 720,
  };
}
export function battleScene(game: GameState): BattleScene {
  const b = game.battle!;
  return {
    player: battleFigure(game.creatures[b.playerId]!),
    enemy: battleFigure(b.enemies[b.enemyIndex]!),
  };
}

export interface MoveFeedback {
  side: 'player' | 'enemy';
  kind: 'damage' | 'heal' | 'miss' | 'immune' | 'recoil';
  label: string;
}
/** Uses the resolved HP delta, including capped damage and healing, without rolling again. */
export function moveFeedback(event: BattleMoveEvent): MoveFeedback[] {
  const target = event.side === 'player' ? 'enemy' : 'player';
  if (event.outcome !== 'hit')
    return [
      {
        side: target,
        kind: event.outcome,
        label: event.outcome === 'miss' ? '未命中' : '属性免疫',
      },
    ];
  const result: MoveFeedback[] = [];
  const damage = event.before[target].hp - event.after[target].hp;
  if (damage > 0)
    result.push({
      side: target,
      kind: 'damage',
      label: `${event.critical ? '要害 ' : ''}−${damage} HP`,
    });
  const selfChange = event.after[event.side].hp - event.before[event.side].hp;
  if (selfChange > 0) result.push({ side: event.side, kind: 'heal', label: `+${selfChange} HP` });
  if (selfChange < 0)
    result.push({ side: event.side, kind: 'recoil', label: `反伤 −${-selfChange} HP` });
  if (MOVES[event.moveId]!.effect?.heal && selfChange === 0)
    result.push({ side: event.side, kind: 'heal', label: '体力已满 +0 HP' });
  return result;
}
export type VisualPattern =
  | 'slash'
  | 'leaf'
  | 'flame'
  | 'wave'
  | 'bolt'
  | 'sting'
  | 'wind'
  | 'stone'
  | 'venom'
  | 'earth'
  | 'ice'
  | 'fist'
  | 'mind'
  | 'ghost'
  | 'dragon'
  | 'claw'
  | 'steel'
  | 'star'
  | 'heal'
  | 'shield'
  | 'focus'
  | 'debuff'
  | 'weather';
const patterns: Record<TypeId, VisualPattern> = {
  normal: 'slash',
  grass: 'leaf',
  fire: 'flame',
  water: 'wave',
  electric: 'bolt',
  bug: 'sting',
  flying: 'wind',
  rock: 'stone',
  poison: 'venom',
  ground: 'earth',
  ice: 'ice',
  fighting: 'fist',
  psychic: 'mind',
  ghost: 'ghost',
  dragon: 'dragon',
  dark: 'claw',
  steel: 'steel',
  fairy: 'star',
};
export interface MoveVisual {
  pattern: VisualPattern;
  color: string;
  glow: string;
  motion: 'lunge' | 'cast' | 'self' | 'field';
  duration: number;
  variant: number;
  signature: boolean;
}
export const MOVE_VISUALS: Record<string, MoveVisual> = Object.fromEntries(
  Object.values(MOVES).map((move) => {
    const self = move.category === 'status' && move.effect?.target === 'self';
    const signature = !!move.exclusiveSpeciesId;
    const hash = [...move.id].reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const pattern = move.weather
      ? 'weather'
      : move.category !== 'status'
        ? patterns[move.type ?? 'normal']
        : move.effect?.heal
          ? 'heal'
          : move.effect?.stage
            ? self
              ? ['defense', 'specialDefense', 'criticalGuard'].includes(move.effect.stage)
                ? 'shield'
                : 'focus'
              : 'debuff'
            : patterns[move.type ?? 'normal'];
    return [
      move.id,
      {
        pattern,
        color: TYPE_COLORS[move.type ?? 'normal'],
        glow: move.type === 'dark' || move.type === 'ghost' ? '#e6b9ff' : '#fff4c5',
        motion: move.weather
          ? 'field'
          : self
            ? 'self'
            : move.category === 'physical'
              ? 'lunge'
              : 'cast',
        duration: signature ? 1420 : move.category === 'physical' ? 820 : 1050,
        variant: hash % 3,
        signature,
      } satisfies MoveVisual,
    ];
  }),
);

export function presentationScene(
  initial: BattleScene,
  events: BattleVisualEvent[],
  line: number,
  completed: boolean,
): { scene: BattleScene; move: BattleMoveEvent | null; capture: BattleCaptureEvent | null } {
  let scene = initial;
  let move: BattleMoveEvent | null = null;
  let capture: BattleCaptureEvent | null = null;
  for (const event of events) {
    if (event.logIndex > line) break;
    if (event.kind === 'scene') scene = event.scene;
    else if (event.kind === 'capture') {
      scene = event.scene;
      if (line === event.logIndex || event.caught) capture = event;
    } else {
      scene = line === event.logIndex && !completed ? event.before : event.after;
      if (line === event.logIndex) move = event;
    }
  }
  return { scene, move, capture };
}
