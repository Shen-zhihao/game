export const STAT_KEYS = [
  'hp',
  'attack',
  'defense',
  'specialAttack',
  'specialDefense',
  'speed',
] as const;
export type Stat = (typeof STAT_KEYS)[number];
export type Stats = Record<Stat, number>;
export type TypeId =
  | 'normal'
  | 'grass'
  | 'fire'
  | 'water'
  | 'electric'
  | 'bug'
  | 'flying'
  | 'rock'
  | 'poison'
  | 'ground'
  | 'ice'
  | 'fighting'
  | 'psychic'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy';
export type Curve = 'fast' | 'medium_fast' | 'medium_slow' | 'slow';
export type Evolution = {
  toId: string;
  condition:
    | { kind: 'level'; level: number }
    | { kind: 'item'; itemId: string; minLevel: number; consumeItem: boolean };
};
export interface Species {
  id: string;
  dexNumber: number;
  name: string;
  types: TypeId[];
  stage: number;
  familyId: string;
  baseStats: Stats;
  baseStatTotal: number;
  experienceCurve: Curve;
  captureRate: number;
  evolvesFromId: string | null;
  evolutions: Evolution[];
}
export type Status = 'poison' | 'burn' | 'paralysis' | 'sleep';
export interface Creature {
  id: string;
  speciesId: string;
  nickname: string;
  level: number;
  experience: number;
  iv: Stats;
  hp: number;
  status: Status | null;
  sleepTurns: number;
  moves: { id: string; pp: number }[];
  history: { kind: 'caught' | 'evolved' | 'learned'; label: string; level: number }[];
}
export type Direction = 'up' | 'down' | 'left' | 'right';
export type MapId = 'dawn' | 'route' | 'moss' | 'forest' | 'gym';
export type StoryEvent =
  | 'rival'
  | 'rescue'
  | 'forestScout'
  | 'forestGuard'
  | 'gymScout'
  | 'gymKeeper'
  | 'leader'
  | 'training'
  | 'catchTutorial';
export type Stages = Record<
  'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed',
  number
>;
export interface Battle {
  id: string;
  kind: 'wild' | 'trainer';
  event: StoryEvent | null;
  name: string;
  enemies: Creature[];
  enemyIndex: number;
  playerId: string;
  participants: string[];
  phase: 'choose' | 'forcedSwitch' | 'ended';
  turn: number;
  aiMove: number;
  playerStages: Stages;
  enemyStages: Stages;
  logs: string[];
  result: 'win' | 'lose' | 'caught' | 'escaped' | null;
  runAttempts: number;
  tutorialCatch: boolean;
}
export type PendingChoice =
  | { kind: 'evolution'; creatureId: string; toId: string }
  | { kind: 'move'; creatureId: string; moveId: string };
export interface GameState {
  player: {
    name: string;
    avatar: number;
    money: number;
    map: MapId;
    x: number;
    y: number;
    facing: Direction;
    healMap: 'dawn' | 'moss';
  };
  progress: { chapter: number; badges: number; flags: Record<string, boolean> };
  creatures: Record<string, Creature>;
  party: string[];
  box: string[];
  inventory: Record<string, number>;
  dex: { seen: string[]; caught: string[] };
  rng: number;
  sequence: number;
  steps: number;
  encounterCooldown: number;
  playTimeSeconds: number;
  battle: Battle | null;
  pending: PendingChoice[];
  dialogue: { speaker: string; lines: string[]; index: number; after: StoryEvent | null } | null;
  notice: string;
}
export type BattleAction =
  | { kind: 'move'; index: number }
  | { kind: 'switch'; creatureId: string }
  | { kind: 'ball' }
  | { kind: 'potion'; creatureId: string }
  | { kind: 'antidote'; creatureId: string }
  | { kind: 'run' };
export type Command =
  | { kind: 'walk'; direction: Direction }
  | { kind: 'interact' }
  | { kind: 'nextDialogue' }
  | { kind: 'closeBattle' }
  | { kind: 'battle'; action: BattleAction }
  | { kind: 'evolve'; creatureId: string; toId: string; accept: boolean }
  | { kind: 'learn'; creatureId: string; moveId: string; replace: number | null }
  | { kind: 'useItem'; itemId: string; creatureId: string }
  | { kind: 'buy'; itemId: string; quantity: number }
  | { kind: 'lead'; creatureId: string }
  | { kind: 'box'; creatureId: string; withdraw: boolean }
  | { kind: 'recall'; creatureId: string; moveId: string; replace: number }
  | { kind: 'tick'; seconds: number };
