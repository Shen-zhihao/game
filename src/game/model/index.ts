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
export type WeatherId = 'clear' | 'sun' | 'rain' | 'storm' | 'fog' | 'snow' | 'sand';
export interface EnvironmentState {
  seed: number;
  weather: WeatherId;
  remaining: number;
}
export interface BattleWeather {
  kind: WeatherId;
  ambient: WeatherId;
  /** Null means the outdoor weather lasts for the entire battle. */
  turns: number | null;
}
export type BallId = 'ball' | 'great_ball' | 'ultra_ball' | 'master_ball';
export interface Training {
  mode: 'manual' | 'auto';
  seed: number;
  /** Index zero records the points earned on reaching level 2. */
  rolls: number[];
  /** Earlier levels retain the legacy policy; omitted means an untouched legacy record. */
  strengthFromLevel?: number;
  allocated: Stats;
  /** Frozen ability bonus preserves existing saves without continuing IV growth. */
  legacyBonus: Stats;
}
export interface Creature {
  id: string;
  speciesId: string;
  nickname: string;
  level: number;
  experience: number;
  iv: Stats;
  training?: Training;
  hp: number;
  status: Status | null;
  sleepTurns: number;
  moves: { id: string; pp: number }[];
  taughtMoves?: string[];
  history: { kind: 'caught' | 'evolved' | 'learned'; label: string; level: number }[];
}
export type Direction = 'up' | 'down' | 'left' | 'right';
export type TownId =
  'dawn' | 'moss' | 'stone' | 'harbor' | 'volt' | 'wind' | 'furnace' | 'lake' | 'star' | 'league';
export type MapId =
  | TownId
  | 'route'
  | 'forest'
  | 'gym'
  | 'stoneRoute'
  | 'mine'
  | 'rockGym'
  | 'coastRoute'
  | 'tideworks'
  | 'waterGym'
  | AdventureMapId;
export type AdventureMapId =
  | 'powerRoute'
  | 'powerStation'
  | 'electricGym'
  | 'windRoute'
  | 'windObservatory'
  | 'windSanctuary'
  | 'windGym'
  | FurnaceMapId
  | 'lakeRoute'
  | 'mirrorArchive'
  | 'mirrorRuins'
  | 'psychicGym'
  | 'starRoute'
  | 'starCore'
  | 'starGym'
  | 'ancientTemple'
  | 'nightHall'
  | 'championRoad'
  | 'leagueHall'
  | 'hallOfFame'
  | ConservationMapId;
export type ConservationMapId = 'deepwood' | 'echoMeadow' | 'mineDepths' | 'kelpCove';
export type FurnaceMapId = 'furnaceRoute' | 'foundry' | 'hotSprings' | 'fireGym';
export type AdventureBattleEvent =
  | 'electricScout'
  | 'electricKeeper'
  | 'electricLeader'
  | 'powerTraining'
  | 'powerGuard'
  | 'rivalPower'
  | 'windTraining'
  | 'windScout'
  | 'windKeeper'
  | 'windLeader'
  | 'windGuard'
  | 'rivalWind'
  | 'furnaceTraining'
  | 'fireScout'
  | 'fireKeeper'
  | 'fireLeader'
  | 'foundryGuard'
  | 'rivalFurnace'
  | 'lakeTraining'
  | 'psychicScout'
  | 'psychicKeeper'
  | 'psychicLeader'
  | 'mirrorGuard'
  | 'rivalLake'
  | 'starTraining'
  | 'starScout'
  | 'starKeeper'
  | 'starLeader'
  | 'coreCommander'
  | 'rivalStar'
  | 'championScout'
  | 'rivalLeague'
  | 'leagueIce'
  | 'leagueGhost'
  | 'leagueDark'
  | 'leagueDragon'
  | 'leagueChampion';
export type AdventureEncounterEvent = `encounter_${number}`;
export type StoryEvent =
  | 'meetNeighbor'
  | 'hearProfessor'
  | 'chooseStarter'
  | 'openingRescue'
  | 'partnerGift'
  | 'fieldKitGift'
  | 'rival'
  | 'rescue'
  | 'forestScout'
  | 'forestGuard'
  | 'gymScout'
  | 'gymKeeper'
  | 'leader'
  | 'training'
  | 'catchTutorial'
  | 'mistEncounter'
  | 'discoveryEncounter'
  | 'rockScout'
  | 'rockKeeper'
  | 'rockLeader'
  | 'highlandTraining'
  | 'mineGuard'
  | 'bellEncounter'
  | 'coastTraining'
  | 'waterScout'
  | 'waterKeeper'
  | 'waterLeader'
  | 'tideGuard'
  | 'coralEncounter'
  | 'islandEncounter'
  | 'tideEncounter'
  | AdventureBattleEvent
  | AdventureEncounterEvent
  | 'leagueCredits'
  | 'journeyCredits';
export type HiddenStage = 'accuracy' | 'evasion' | 'critical' | 'criticalGuard';
export const CRITICAL_MULTIPLIER = 2;
export type CombatStage = Exclude<Stat, 'hp'> | HiddenStage;
// Optional secondary stages keep existing battle checkpoints readable.
export type Stages = Record<Exclude<Stat, 'hp'>, number> & Partial<Record<HiddenStage, number>>;
export interface BattleFigure {
  id: string;
  speciesId: string;
  nickname: string;
  level: number;
  hp: number;
  maxHp: number;
  status: Status | null;
}
export interface BattleScene {
  player: BattleFigure;
  enemy: BattleFigure;
}
export interface BattleMoveEvent {
  kind: 'move';
  logIndex: number;
  endLogIndex: number;
  side: 'player' | 'enemy';
  moveId: string;
  outcome: 'hit' | 'miss' | 'immune';
  critical: boolean;
  before: BattleScene;
  after: BattleScene;
}
export type BattleVisualEvent =
  BattleMoveEvent | { kind: 'scene'; logIndex: number; scene: BattleScene };
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
  /** Presentation only; no extra battle RNG, never replayed on loading a save. */
  visualEvents?: BattleVisualEvent[];
  result: 'win' | 'lose' | 'caught' | 'escaped' | null;
  runAttempts: number;
  tutorialCatch: boolean;
  weather?: BattleWeather;
  rewards?: { defeated: string[]; experience: number; money: number; completion: boolean };
}
export type PendingChoice =
  | { kind: 'evolution'; creatureId: string; toId: string }
  | { kind: 'move'; creatureId: string; moveId: string };
export interface ExplorationState {
  seed: number;
  generatedMaps?: MapId[];
  patrols: Record<string, { index: number; steps: number; facing: Direction }>;
  finds: Record<
    string,
    {
      map: MapId;
      x: number;
      y: number;
      kind: 'items' | 'wild';
      claimed: boolean;
      itemId: string;
      quantity: number;
      speciesId: string;
    }
  >;
  activeFind: string | null;
}
export interface GameState {
  cheats?: { redemptions: number; masterBallsGranted: number; masterBallsUsed: number };
  league?: {
    runs: number;
    wins: number;
    active: boolean;
    stage: number;
    firstTeam: { speciesId: string; level: number; nickname: string }[] | null;
    lastTeam: { speciesId: string; level: number; nickname: string }[] | null;
  };
  environment?: EnvironmentState;
  masterBalls?: { claimed: string[]; used: number };
  cityServices?: {
    merit: number;
    quests: Record<string, 'active' | 'claimed'>;
    exchanges: Record<string, number>;
  };
  world?: ExplorationState;
  player: {
    name: string;
    avatar: number;
    money: number;
    map: MapId;
    x: number;
    y: number;
    facing: Direction;
    healMap: TownId;
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
  | { kind: 'ball'; ballId?: BallId }
  | { kind: 'potion'; creatureId: string }
  | { kind: 'antidote'; creatureId: string }
  | { kind: 'super_potion' | 'ether' | 'hyper_potion' | 'revive'; creatureId: string }
  | { kind: 'run' };
export type Command =
  | { kind: 'cheat'; code: string }
  | { kind: 'walk'; direction: Direction }
  | { kind: 'interact' }
  | { kind: 'nextDialogue' }
  | { kind: 'closeBattle' }
  | { kind: 'chooseStarter'; speciesId: string }
  | { kind: 'battle'; action: BattleAction }
  | { kind: 'evolve'; creatureId: string; toId: string; accept: boolean }
  | { kind: 'learn'; creatureId: string; moveId: string; replace: number | null }
  | { kind: 'useItem'; itemId: string; creatureId: string }
  | {
      kind: 'copyMove';
      sourceId: string;
      creatureId: string;
      moveId: string;
      replace: number | null;
    }
  | { kind: 'buy'; itemId: string; quantity: number }
  | { kind: 'exchange'; offerId: string; quantity: number }
  | { kind: 'cityQuest'; questId: string; action: 'accept' | 'claim' }
  | { kind: 'allocate'; creatureId: string; points: Stats }
  | { kind: 'trainingMode'; creatureId: string; mode: 'manual' | 'auto' }
  | { kind: 'lead'; creatureId: string }
  | { kind: 'box'; creatureId: string; withdraw: boolean }
  | { kind: 'release'; creatureId: string }
  | { kind: 'recall'; creatureId: string; moveId: string; replace: number | null }
  | { kind: 'centerHeal' }
  | { kind: 'centerLearn'; creatureId: string; moveId: string; replace: number | null }
  | { kind: 'centerForget'; creatureId: string; moveId: string }
  | { kind: 'tick'; seconds: number };
