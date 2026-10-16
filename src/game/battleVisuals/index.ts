import { MOVES, TYPE_COLORS } from '../../content/catalog';
import type {
  BattleFigure,
  BattleMoveEvent,
  BattleScene,
  BattleVisualEvent,
  Creature,
  GameState,
  TypeId,
} from '../model';
import { statsFor } from '../rules';

export const battleFigure = (c: Creature): BattleFigure => ({
  id: c.id,
  speciesId: c.speciesId,
  nickname: c.nickname,
  level: c.level,
  hp: c.hp,
  maxHp: statsFor(c).hp,
  status: c.status,
});
export function battleScene(game: GameState): BattleScene {
  const b = game.battle!;
  return {
    player: battleFigure(game.creatures[b.playerId]!),
    enemy: battleFigure(b.enemies[b.enemyIndex]!),
  };
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
): { scene: BattleScene; move: BattleMoveEvent | null } {
  let scene = initial;
  let move: BattleMoveEvent | null = null;
  for (const event of events) {
    if (event.logIndex > line) break;
    if (event.kind === 'scene') scene = event.scene;
    else {
      scene = line === event.logIndex && !completed ? event.before : event.after;
      if (line === event.logIndex) move = event;
    }
  }
  return { scene, move };
}
