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
export interface SpecialEvolutionCondition {
  minLevel: number;
  friendship?: number;
  period?: 'day' | 'night';
  maps?: MapId[];
  moveId?: string;
}
export type Evolution = {
  toId: string;
  condition:
    | { kind: 'level'; level: number }
    | { kind: 'item'; itemId: string; minLevel: number; consumeItem: boolean };
  /** Optional, item-free routes. The original level/item route remains available. */
  alternatives?: SpecialEvolutionCondition[];
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
export type Status = 'poison' | 'burn' | 'paralysis' | 'sleep' | 'freeze';
export type WeatherId = 'clear' | 'sun' | 'rain' | 'storm' | 'fog' | 'snow' | 'sand';
export const CLIMATE_IDS = [
  'garden',
  'forest',
  'coast',
  'quarry',
  'alpine',
  'volcanic',
  'lake',
  'star',
] as const;
export type ClimateId = (typeof CLIMATE_IDS)[number];
export interface LocalWeather {
  weather: WeatherId;
  remaining: number;
}
export interface CalendarState {
  /** One is the first day of year one. */
  day: number;
  /** In-game seconds since midnight; 24 in-game seconds pass per real second. */
  time: number;
}
export interface EnvironmentState {
  seed: number;
  weather: WeatherId;
  remaining: number;
  /** Shared by neighbouring maps in the same climate; absent in legacy saves. */
  climates?: Partial<Record<ClimateId, LocalWeather>>;
}
export interface BattleWeather {
  kind: WeatherId;
  ambient: WeatherId;
  /** Null means the outdoor weather lasts for the entire battle. */
  turns: number | null;
}
export type BallId =
  | 'ball'
  | 'great_ball'
  | 'ultra_ball'
  | 'quick_ball'
  | 'timer_ball'
  | 'dusk_ball'
  | 'net_ball'
  | 'master_ball';
export interface Training {
  mode: 'manual' | 'auto';
  seed: number;
  /** Index zero records the points earned on reaching level 2. */
  rolls: number[];
  /** Earlier levels retain the legacy policy; omitted means an untouched legacy record. */
  strengthFromLevel?: number;
  /** Natural growth starts here; legacy saves keep their current abilities on migration. */
  naturalGrowthFromLevel?: number;
  allocated: Stats;
  /** Frozen ability bonus preserves existing saves without continuing IV growth. */
  legacyBonus: Stats;
}
export interface Creature {
  id: string;
  speciesId: string;
  nickname: string;
  /** Missing in legacy saves means not favorited. Favorites cannot be released. */
  favorite?: boolean;
  heldItem?: import('../../content/battleTraits').HeldItemId | null;
  level: number;
  experience: number;
  iv: Stats;
  training?: Training;
  /** Absent in old saves; starts at the same baseline as a newly met partner. */
  friendship?: {
    points: number;
    walkingSteps: number;
    interactionSteps: number;
    lastInteractionAt: number | null;
  };
  hp: number;
  status: Status | null;
  sleepTurns: number;
  /** Volatile confusion; absent or zero means clear. Cleared when leaving the field. */
  confusionTurns?: number;
  moves: { id: string; pp: number }[];
  taughtMoves?: string[];
  history: { kind: 'caught' | 'evolved' | 'learned'; label: string; level: number }[];
}
export type Direction = 'up' | 'down' | 'left' | 'right';
export type WalkDirection = Direction | 'upLeft' | 'upRight' | 'downLeft' | 'downRight';
export type TownId =
  'dawn' | 'moss' | 'stone' | 'harbor' | 'volt' | 'wind' | 'furnace' | 'lake' | 'star' | 'league';
export type MapId = WorldMapId | InteriorMapId;
export type InteriorMapId =
  `interior_${(typeof import('../../content/buildings').ROOM_SITES)[number]}`;
export type WorldMapId =
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
  | import('../gymRematches').GymRematchEvent
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
  confusionTurns?: number;
  experience?: number;
  growthPoints?: number;
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
  outcome: 'hit' | 'miss' | 'immune' | 'blocked';
  critical: boolean;
  before: BattleScene;
  after: BattleScene;
}
export interface BattleCaptureEvent {
  kind: 'capture';
  logIndex: number;
  ballId: BallId;
  caught: boolean;
  /** Absent in older checkpoints, which used a fixed three-shake animation. */
  shakes?: 0 | 1 | 2 | 3;
  scene: BattleScene;
}
export type BattleVisualEvent =
  BattleMoveEvent | BattleCaptureEvent | { kind: 'scene'; logIndex: number; scene: BattleScene };
/** Field-only effects; never copied to captured creatures or carried between battles. */
export interface BattleVolatile {
  seededBy?: 'player' | 'enemy';
  lastProtectTurn?: number;
  protectChain?: number;
}
export interface Battle {
  id: string;
  npcId?: string;
  ruleChallenge?: boolean;
  challengeSettled?: boolean;
  /** Created once per new eligible battle; never refilled by loading a checkpoint. */
  enemyMedicine?: { itemId: 'super_potion' | 'hyper_potion'; remaining: number };
  aiTactics?: { lastSwitchTurn: number; switches: number; lastSupportTurn: number };
  volatiles?: Record<string, BattleVolatile>;
  /** Side-bound entry traps; switching and loading never clear them. */
  hazards?: {
    player?: import('../battle/hazards').EntryHazards;
    enemy?: import('../battle/hazards').EntryHazards;
  };
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
  /** Locked for a round; each player command consumes one independently chosen action. */
  actionRound?: {
    /** Shields expire at round end, not between a fast creature's actions. */
    protected?: string[];
    enemySwitchIndex?: number;
    enemyItem?: 'super_potion' | 'hyper_potion';
    playerTotal: number;
    enemyTotal: number;
    playerRemaining: number;
    enemyRemaining: number;
    enemyFirst: boolean;
    immobility: Record<
      string,
      {
        status: Status | null;
        blocked: boolean;
        confusionTurns?: number;
        confusionBlocked?: boolean;
      }
    >;
  };
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
  trainerPositions?: Record<string, { x: number; y: number; facing: Direction; steps: number }>;
  trainerChallenge?: { map: MapId; npcId: string; phase: 'alert' | 'approach' } | null;
}
export interface GameState {
  nursery?: import('../nursery').NurseryState;
  ecology?: import('../ecology').EcologyState;
  production?: import('../production').ProductionState;
  challenge?: import('../challenge').ChallengeLedger;
  activities?: import('../activities/types').ActivityLedger;
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
  calendar?: CalendarState;
  masterBalls?: { claimed: string[]; used: number };
  cityServices?: {
    merit: number;
    quests: Record<string, 'active' | 'claimed'>;
    exchanges: Record<string, number>;
  };
  questJournal?: string[];
  trackedQuestId?: string | null;
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
    running?: boolean;
  };
  /** Absent in old champion saves; created only when a rematch starts. */
  gymRematches?: Partial<
    Record<import('../gymRematches').GymRematchEvent, import('../gymRematches').GymRematchRecord>
  >;
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
  repelSteps?: number;
  playTimeSeconds: number;
  battle: Battle | null;
  pending: PendingChoice[];
  /** Special routes reached during a battle/cutscene wait for a safe checkpoint. */
  deferredEvolutions?: { creatureId: string; toId: string }[];
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
  | { kind: 'nursery'; action: import('../nursery').NurseryAction }
  | { kind: 'befriend'; creatureId: string }
  | { kind: 'production'; action: import('../production').ProductionAction }
  | { kind: 'rest'; target: 'morning' | 'night' }
  | { kind: 'challenge'; action: import('../challenge').ChallengeAction }
  | { kind: 'setRunning'; running: boolean }
  | { kind: 'fastTravel'; town: TownId }
  | { kind: 'activity'; action: import('../activities/types').ActivityAction }
  | { kind: 'equip'; creatureId: string; itemId: string | null }
  | { kind: 'cheat'; code: string }
  | { kind: 'walk'; direction: WalkDirection }
  | { kind: 'interact' }
  | { kind: 'nextDialogue' }
  | { kind: 'closeBattle' }
  | { kind: 'chooseStarter'; speciesId: string }
  | { kind: 'battle'; action: BattleAction }
  | { kind: 'evolve'; creatureId: string; toId: string; accept: boolean }
  | { kind: 'learn'; creatureId: string; moveId: string; replace: number | null }
  | { kind: 'useItem'; itemId: string; creatureId: string }
  | { kind: 'useFieldItem'; itemId: string }
  | {
      kind: 'copyMove';
      sourceId: string;
      creatureId: string;
      moveId: string;
      replace: number | null;
    }
  | { kind: 'buy'; itemId: string; quantity: number }
  | { kind: 'sell'; itemId: string; quantity: number }
  | { kind: 'exchange'; offerId: string; quantity: number }
  | { kind: 'cityQuest'; questId: string; action: 'accept' | 'claim' }
  | { kind: 'trackQuest'; questId: string | null }
  | { kind: 'allocate'; creatureId: string; points: Stats }
  | { kind: 'trainingMode'; creatureId: string; mode: 'manual' | 'auto' }
  | { kind: 'lead'; creatureId: string }
  | { kind: 'reorderParty'; creatureId: string; toIndex: number }
  | { kind: 'box'; creatureId: string; withdraw: boolean }
  | { kind: 'release'; creatureId: string }
  | { kind: 'favorite'; creatureId: string; value: boolean }
  | { kind: 'recall'; creatureId: string; moveId: string; replace: number | null }
  | { kind: 'centerHeal' }
  | { kind: 'centerLearn'; creatureId: string; moveId: string; replace: number | null }
  | { kind: 'centerForget'; creatureId: string; moveId: string }
  | { kind: 'tick'; seconds: number };
