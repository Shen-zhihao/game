import { validFishing } from '../../game/fishing';
import { clearCompletedCaptureTarget } from '../../game/captureTracking';
import { validPresetName } from '../../game/party/presets';
import { NURSERY_BREEDING_STEPS, NURSERY_HATCH_STEPS, validNursery } from '../../game/nursery';
import { validEcology } from '../../game/ecology';
import { validateProduction } from '../../game/production';
import { PRODUCTION_DECORATIONS } from '../../content/productionRewards';
import {
  PRODUCTION_MATERIALS,
  PRODUCTION_PRODUCTS,
  PRODUCTION_KEEPSAKES,
} from '../../content/production';
import { sha256 } from '@noble/hashes/sha2.js';
import { Buffer } from 'buffer';
import { z } from 'zod';
import {
  CONTENT_VERSION,
  canLearnMove,
  isOrdinarySpecies,
  ITEMS,
  MOVES,
  SPECIES,
  STARTERS,
  supportsContentVersion,
} from '../../content/catalog';
import {
  badgeCount,
  MAPS,
  Npc,
  npcVisible,
  npcDefeated,
  npcVictoryFlag,
  PRACTICE_TRAINERS,
  terrainPassable,
  TOWN_REST,
} from '../../content/world';
import {
  ADVENTURE_EVENTS,
  ADVENTURE_FLAGS,
  ADVENTURE_PREREQUISITES,
  ADVENTURE_ENCOUNTERS,
  adventureEncounter,
} from '../../content/adventure';
import { worldNpcs, FIND_SITES, ORIGINAL_MAPS } from '../../game/exploration';
import { safePosition } from '../../game/engine';
import { CLIMATE_IDS, GameState, STAT_KEYS } from '../../game/model';
import { statsFor, xpAt } from '../../game/rules';
import { journalQuests, STORY_QUESTS } from '../../content/quests';
import { CITY_EXCHANGES, CITY_QUESTS, CITIES, questProgress } from '../../content/cities';
import { DISTRICT_FLAGS } from '../../content/cityQuests';
import { CITY_TOWNS, districtFlag, districtQuestId } from '../../content/cityDistricts';
import { growthRoll, sumStats } from '../../game/growth';
import { COAST_STORY_ENCOUNTERS } from '../../game/coastStory';
import { copyableMove } from '../../game/skills';
import { MASTER_BALL_SOURCES } from '../../game/capture';
import { canSurf, fieldSkillUnlocked } from '../../game/fieldSkills';
import { LEAGUE_STAGES, LEAGUE_BADGES } from '../../content/league';
import { KEY_ITEMS, effectiveAccessFlags, hasFieldAccess } from '../../content/keyItems';
import { RECOVERY_TOWNS, townVisitFlag } from '../../game/recovery';
import { CLIMATES } from '../../content/climates';
import { CALENDAR_DAY_SECONDS, MAX_CALENDAR_DAY } from '../../game/calendar';
import { HELD_ITEMS } from '../../content/battleTraits';
import { ACTIVITY_FLAGS, FIELD_ACTIVITIES } from '../../content/fieldActivities';
import { validActivityLocation, validActivityBoard } from '../../game/activities';
import { isSightTrainer, validTrainerChallenge } from '../../game/trainerChallenges';
import { REPEL_STEPS } from '../../game/fieldItems';
import { trainerMedicine } from '../../game/battle/strategy';
import { GYM_REMATCH_EVENTS, gymRematch } from '../../game/gymRematches';
import {
  FRIENDSHIP_MAX,
  FRIENDSHIP_WALK_STEPS,
  FRIENDSHIP_INTERACTION_STEPS,
} from '../../game/friendship';

export const MAX_SAVE_BYTES = 8 * 1024 * 1024;
export const GAME_ID = 'stargrove-expedition';
export const SCHEMA_VERSION = 1;
export type Entropy = (length: number) => Uint8Array;
export const utf8 = (text: string): Uint8Array => new Uint8Array(Buffer.from(text, 'utf8'));
export const fromUtf8 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('utf8');
export const digest = (text: string | Uint8Array): string =>
  Buffer.from(sha256(typeof text === 'string' ? utf8(text) : text)).toString('hex');
export const identifier = (entropy: Entropy): string => Buffer.from(entropy(16)).toString('hex');
const idSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const integer = (max: number, min = 0) => z.number().int().min(min).max(max);
const statsSchema = z.strictObject(
  Object.fromEntries(STAT_KEYS.map((s) => [s, integer(31)])) as Record<
    (typeof STAT_KEYS)[number],
    z.ZodNumber
  >,
);
const abilitySchema = z.strictObject(
  Object.fromEntries(STAT_KEYS.map((s) => [s, integer(990)])) as Record<
    (typeof STAT_KEYS)[number],
    z.ZodNumber
  >,
);
const trainingSchema = z.strictObject({
  mode: z.enum(['manual', 'auto']),
  seed: integer(4294967295, 1),
  rolls: z.array(integer(10, 1)).max(99),
  strengthFromLevel: integer(101, 2).optional(),
  naturalGrowthFromLevel: integer(100, 1).optional(),
  allocated: abilitySchema,
  legacyBonus: statsSchema,
});
const creatureSchema = z.strictObject({
  id: idSchema,
  speciesId: idSchema,
  nickname: z.string().max(20),
  favorite: z.boolean().optional(),
  heldItem: z
    .enum(Object.keys(HELD_ITEMS) as [keyof typeof HELD_ITEMS, ...(keyof typeof HELD_ITEMS)[]])
    .nullable()
    .optional(),
  level: integer(100, 1),
  experience: integer(1250000),
  iv: statsSchema,
  training: trainingSchema.optional(),
  friendship: z
    .strictObject({
      points: integer(FRIENDSHIP_MAX),
      walkingSteps: integer(FRIENDSHIP_WALK_STEPS - 1),
      interactionSteps: integer(FRIENDSHIP_INTERACTION_STEPS),
      lastInteractionAt: integer(999999999).nullable(),
    })
    .optional(),
  taughtMoves: z.array(idSchema).max(128).optional(),
  hp: integer(9999),
  status: z.enum(['poison', 'burn', 'paralysis', 'sleep', 'freeze']).nullable(),
  sleepTurns: integer(3),
  confusionTurns: integer(5).optional(),
  moves: z
    .array(z.strictObject({ id: idSchema, pp: integer(50) }))
    .min(1)
    .max(4),
  history: z
    .array(
      z.strictObject({
        kind: z.enum(['caught', 'evolved', 'learned']),
        label: z.string().max(100),
        level: integer(100, 1),
      }),
    )
    .max(32),
});
const figureSchema = z.strictObject({
  id: idSchema,
  speciesId: idSchema,
  nickname: z.string().max(20),
  level: integer(100, 1),
  hp: integer(9999),
  maxHp: integer(9999, 1),
  status: z.enum(['poison', 'burn', 'paralysis', 'sleep', 'freeze']).nullable(),
  confusionTurns: integer(5).optional(),
  experience: integer(999999999).optional(),
  growthPoints: integer(990).optional(),
});
const sceneSchema = z.strictObject({ player: figureSchema, enemy: figureSchema });
const visualEventSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('move'),
    logIndex: integer(99),
    endLogIndex: integer(99),
    side: z.enum(['player', 'enemy']),
    moveId: idSchema,
    outcome: z.enum(['hit', 'miss', 'immune', 'blocked']),
    critical: z.boolean(),
    before: sceneSchema,
    after: sceneSchema,
  }),
  z.strictObject({ kind: z.literal('scene'), logIndex: integer(99), scene: sceneSchema }),
  z.strictObject({
    kind: z.literal('capture'),
    logIndex: integer(99),
    ballId: z.enum([
      'ball',
      'great_ball',
      'ultra_ball',
      'quick_ball',
      'timer_ball',
      'dusk_ball',
      'net_ball',
      'master_ball',
    ]),
    caught: z.boolean(),
    shakes: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
    scene: sceneSchema,
  }),
]);
const stages = z.strictObject({
  attack: integer(6, -6),
  defense: integer(6, -6),
  specialAttack: integer(6, -6),
  specialDefense: integer(6, -6),
  speed: integer(6, -6),
  accuracy: integer(6, -6).optional(),
  evasion: integer(6, -6).optional(),
  critical: integer(3, -3).optional(),
  criticalGuard: integer(3, -3).optional(),
});
const event = z.enum([
  'meetNeighbor',
  'hearProfessor',
  'chooseStarter',
  'openingRescue',
  'partnerGift',
  'fieldKitGift',
  'rival',
  'rescue',
  'forestScout',
  'forestGuard',
  'gymScout',
  'gymKeeper',
  'leader',
  'training',
  'catchTutorial',
  'mistEncounter',
  'discoveryEncounter',
  'rockScout',
  'rockKeeper',
  'rockLeader',
  'highlandTraining',
  'mineGuard',
  'bellEncounter',
  'coastTraining',
  'waterScout',
  'waterKeeper',
  'waterLeader',
  'tideGuard',
  'coralEncounter',
  'islandEncounter',
  'tideEncounter',
  ...ADVENTURE_EVENTS,
  ...GYM_REMATCH_EVENTS,
]);
const mapId = z.enum(
  Object.keys(MAPS) as [GameState['player']['map'], ...GameState['player']['map'][]],
);
const worldSchema = z.strictObject({
  seed: integer(4294967295),
  generatedMaps: z.array(mapId).max(Object.keys(MAPS).length).optional(),
  patrols: z.record(
    z.string().max(100),
    z.strictObject({
      index: integer(31),
      steps: integer(1000000000),
      facing: z.enum(['up', 'down', 'left', 'right']),
    }),
  ),
  finds: z.record(
    idSchema,
    z.strictObject({
      map: mapId,
      x: integer(255),
      y: integer(255),
      kind: z.enum(['items', 'wild']),
      claimed: z.boolean(),
      itemId: idSchema,
      quantity: integer(2, 1),
      speciesId: idSchema,
    }),
  ),
  activeFind: idSchema.nullable(),
  trainerPositions: z
    .record(
      z.string().max(100),
      z.strictObject({
        x: integer(255),
        y: integer(255),
        facing: z.enum(['up', 'down', 'left', 'right']),
        steps: integer(1000000000),
      }),
    )
    .optional(),
  trainerChallenge: z
    .strictObject({
      map: mapId,
      npcId: idSchema,
      phase: z.enum(['alert', 'approach']),
    })
    .nullable()
    .optional(),
});
const weatherId = z.enum(['clear', 'sun', 'rain', 'storm', 'fog', 'snow', 'sand']);
const fishingBaitSchema = z.enum(['none', 'held_berry', 'held_cleanse']);
const fishingRegionSchema = z.enum(['river', 'lake', 'coast']);
const activityRunSchema = z.strictObject({
  id: idSchema,
  board: z.array(integer(8)).max(25),
  cursor: integer(24, -1),
  value: integer(32),
  aux: integer(24),
  stage: integer(3),
  moves: integer(10000),
  status: z.enum(['playing', 'won', 'lost']),
  feedback: z.string().max(500),
  fishing: z
    .strictObject({
      siteId: idSchema,
      baitId: fishingBaitSchema,
      castId: integer(999999, 1).optional(),
    })
    .optional(),
});
const nurseryEggSchema = z.strictObject({
  speciesId: idSchema,
  inheritedMoves: z.array(idSchema).max(2),
  steps: integer(NURSERY_HATCH_STEPS),
});
const gameSchema = z.strictObject({
  fishing: z
    .strictObject({
      casts: integer(999999),
      encounters: integer(999999),
      catches: z
        .array(
          z.strictObject({
            siteId: idSchema,
            speciesId: idSchema,
            count: integer(999999, 1),
            day: integer(MAX_CALENDAR_DAY, 1),
            time: integer(CALENDAR_DAY_SECONDS - 1),
          }),
        )
        .max(500),
      claimed: z.array(fishingRegionSchema).max(3),
    })
    .optional(),
  nursery: z
    .strictObject({
      parents: z.array(idSchema).max(2),
      breedingSteps: integer(NURSERY_BREEDING_STEPS - 1),
      waitingEgg: nurseryEggSchema.nullable(),
      carriedEgg: nurseryEggSchema.nullable(),
    })
    .optional(),
  ecology: z
    .partialRecord(
      z.enum(['dawn', 'stone', 'harbor']),
      z.partialRecord(
        z.enum(['day', 'night']),
        z.strictObject({
          speciesId: idSchema,
          map: z.enum(['dawn', 'route', 'stoneRoute', 'mine', 'coastRoute', 'harbor']),
          day: integer(MAX_CALENDAR_DAY, 1),
          time: integer(CALENDAR_DAY_SECONDS - 1),
        }),
      ),
    )
    .optional(),
  challenge: z
    .strictObject({
      points: integer(999999),
      best: integer(999999),
      streak: integer(999999),
      rentalDraft: z
        .strictObject({
          offers: z.array(creatureSchema).length(6),
          selected: z.array(idSchema).max(3),
        })
        .optional(),
      rentalClears: integer(999999).optional(),
      active: z
        .strictObject({
          rental: z
            .strictObject({ opponents: z.array(creatureSchema).max(3), swapped: z.boolean() })
            .optional(),
          selected: z.array(idSchema).length(3),
          originalParty: z.array(idSchema).min(1).max(6),
          originalBox: z.array(idSchema).max(360),
          originals: z.record(idSchema, creatureSchema),
        })
        .nullable(),
    })
    .optional(),
  production: z
    .strictObject({
      materials: z.partialRecord(
        z.enum(Object.keys(PRODUCTION_MATERIALS) as [string, ...string[]]),
        integer(999),
      ),
      products: z.partialRecord(
        z.enum(Object.keys(PRODUCTION_PRODUCTS) as [string, ...string[]]),
        integer(999),
      ),
      crafted: z.partialRecord(
        z.enum(Object.keys(PRODUCTION_PRODUCTS) as [string, ...string[]]),
        integer(999999),
      ),
      activityClaims: z.partialRecord(
        z.enum(['activity_dawn', 'activity_stone', 'activity_harbor']),
        z.strictObject({ day: integer(MAX_CALENDAR_DAY, 1), count: integer(999999, 1) }),
      ),
      orders: z.partialRecord(
        z.enum(Object.keys(PRODUCTION_PRODUCTS) as [string, ...string[]]),
        z.strictObject({ day: integer(MAX_CALENDAR_DAY, 1), count: integer(999999, 1) }),
      ),
      collection: z.strictObject({
        stamps: integer(999999 * Object.keys(PRODUCTION_PRODUCTS).length),
        keepsakes: z
          .array(z.enum(PRODUCTION_KEEPSAKES.map((k) => k.id) as [string, ...string[]]))
          .max(PRODUCTION_KEEPSAKES.length),
      }),
      presentation: z
        .strictObject({
          decorations: z.partialRecord(
            z.enum(['dawn', 'stone', 'harbor']),
            z.enum(PRODUCTION_DECORATIONS.map((reward) => reward.id)),
          ),
          viewedResults: z.array(z.enum(['dawn', 'stone', 'harbor'])).max(3),
        })
        .optional(),
    })
    .optional(),
  activities: z
    .strictObject({
      active: activityRunSchema.nullable(),
      drafts: z.record(idSchema, activityRunSchema).optional(),
      records: z.record(
        idSchema,
        z.strictObject({
          completions: integer(999999, 1),
          bestMoves: integer(10000, 1),
          rewardClaimed: z.boolean(),
        }),
      ),
    })
    .optional(),
  cheats: z
    .strictObject({
      redemptions: integer(999999999, 1),
      masterBallsGranted: integer(999999999),
      masterBallsUsed: integer(999999999),
    })
    .optional(),
  gymRematches: z
    .partialRecord(
      z.enum(GYM_REMATCH_EVENTS),
      z.strictObject({ attempts: integer(999999999, 1), wins: integer(999999999) }),
    )
    .optional(),
  league: z
    .strictObject({
      runs: integer(999999),
      wins: integer(999999),
      active: z.boolean(),
      stage: integer(5),
      firstTeam: z
        .array(
          z.strictObject({
            speciesId: idSchema,
            level: integer(100, 1),
            nickname: z.string().max(30),
          }),
        )
        .min(1)
        .max(6)
        .nullable(),
      lastTeam: z
        .array(
          z.strictObject({
            speciesId: idSchema,
            level: integer(100, 1),
            nickname: z.string().max(30),
          }),
        )
        .min(1)
        .max(6)
        .nullable(),
    })
    .optional(),
  calendar: z
    .strictObject({
      day: integer(MAX_CALENDAR_DAY, 1),
      time: integer(CALENDAR_DAY_SECONDS - 1),
    })
    .optional(),
  environment: z
    .strictObject({
      seed: integer(4294967295),
      weather: weatherId,
      remaining: integer(360, 1),
      climates: z
        .partialRecord(
          z.enum(CLIMATE_IDS),
          z.strictObject({
            weather: weatherId,
            remaining: integer(360, 1),
          }),
        )
        .optional(),
    })
    .optional(),
  masterBalls: z.strictObject({ claimed: z.array(idSchema).max(3), used: integer(3) }).optional(),
  cityServices: z
    .strictObject({
      merit: integer(1000),
      quests: z.record(idSchema, z.enum(['active', 'claimed'])),
      exchanges: z.record(idSchema, integer(999)),
    })
    .optional(),
  questJournal: z.array(idSchema).max(STORY_QUESTS.length).optional(),
  trackedQuestId: idSchema.nullable().optional(),
  captureTargetId: idSchema.nullable().optional(),
  world: worldSchema.optional(),
  player: z.strictObject({
    name: z.string().min(1).max(12),
    avatar: integer(1),
    running: z.boolean().optional(),
    money: integer(9999999),
    map: mapId,
    x: integer(255),
    y: integer(255),
    facing: z.enum(['up', 'down', 'left', 'right']),
    healMap: z.enum(
      Object.keys(TOWN_REST) as [
        GameState['player']['healMap'],
        ...GameState['player']['healMap'][],
      ],
    ),
  }),
  progress: z.strictObject({
    chapter: integer(9, 1),
    badges: integer(8),
    flags: z.record(z.string().max(50), z.boolean()),
  }),
  creatures: z.record(idSchema, creatureSchema),
  party: z.array(idSchema).max(6),
  box: z.array(idSchema).max(366),
  partyPresets: z
    .array(
      z.strictObject({
        name: z.string().refine(validPresetName),
        creatureIds: z
          .array(idSchema)
          .min(1)
          .max(6)
          .refine((ids) => new Set(ids).size === ids.length),
      }),
    )
    .max(5)
    .refine((presets) => new Set(presets.map((p) => p.name)).size === presets.length)
    .optional(),
  inventory: z.record(idSchema, integer(999)),
  dex: z.strictObject({ seen: z.array(idSchema).max(250), caught: z.array(idSchema).max(250) }),
  rng: integer(4294967295, 1),
  sequence: integer(999999999),
  steps: integer(999999999),
  encounterCooldown: integer(20),
  repelSteps: integer(REPEL_STEPS).optional(),
  playTimeSeconds: integer(315360000),
  battle: z
    .strictObject({
      id: idSchema,
      kind: z.enum(['wild', 'trainer']),
      npcId: idSchema.optional(),
      ruleChallenge: z.boolean().optional(),
      challengeSettled: z.boolean().optional(),
      aiTactics: z
        .strictObject({
          lastSwitchTurn: integer(100000, -100000),
          switches: integer(100000),
          lastSupportTurn: integer(100000, -100000),
        })
        .optional(),
      event: event.nullable(),
      name: z.string().max(40),
      enemies: z.array(creatureSchema).min(1).max(6),
      enemyIndex: integer(5),
      playerId: idSchema,
      participants: z.array(idSchema).min(1).max(6),
      phase: z.enum(['choose', 'forcedSwitch', 'ended']),
      turn: integer(100000, 1),
      aiMove: integer(3, -1),
      enemyMedicine: z
        .strictObject({
          itemId: z.enum(['super_potion', 'hyper_potion']),
          remaining: integer(2),
        })
        .optional(),
      hazards: z
        .strictObject({
          player: z
            .strictObject({ rocks: z.boolean().optional(), spikes: integer(3).optional() })
            .optional(),
          enemy: z
            .strictObject({ rocks: z.boolean().optional(), spikes: integer(3).optional() })
            .optional(),
        })
        .optional(),
      volatiles: z
        .record(
          idSchema,
          z.strictObject({
            seededBy: z.enum(['player', 'enemy']).optional(),
            lastProtectTurn: integer(100000, 1).optional(),
            protectChain: integer(6, 1).optional(),
          }),
        )
        .optional(),
      actionRound: z
        .strictObject({
          protected: z.array(idSchema).max(2).optional(),
          enemySwitchIndex: integer(5).optional(),
          enemyItem: z.enum(['super_potion', 'hyper_potion']).optional(),
          playerTotal: integer(3, 1),
          enemyTotal: integer(3, 1),
          playerRemaining: integer(3),
          enemyRemaining: integer(3),
          enemyFirst: z.boolean(),
          immobility: z.record(
            idSchema,
            z.strictObject({
              status: z.enum(['poison', 'burn', 'paralysis', 'sleep', 'freeze']).nullable(),
              blocked: z.boolean(),
              confusionTurns: integer(5).optional(),
              confusionBlocked: z.boolean().optional(),
            }),
          ),
        })
        .optional(),
      playerStages: stages,
      enemyStages: stages,
      logs: z.array(z.string().max(200)).max(100),
      visualEvents: z.array(visualEventSchema).max(32).optional(),
      result: z.enum(['win', 'lose', 'caught', 'escaped']).nullable(),
      runAttempts: integer(100000),
      tutorialCatch: z.boolean(),
      fishing: z
        .strictObject({
          activityId: idSchema,
          siteId: idSchema,
          baitId: fishingBaitSchema,
          castId: integer(999999, 1),
          day: integer(MAX_CALENDAR_DAY, 1),
          time: integer(CALENDAR_DAY_SECONDS - 1),
          weather: weatherId,
          settled: z.boolean(),
        })
        .optional(),
      weather: z
        .strictObject({ kind: weatherId, ambient: weatherId, turns: integer(5, 1).nullable() })
        .optional(),
      rewards: z
        .strictObject({
          defeated: z.array(idSchema).max(6),
          experience: integer(100000000),
          money: integer(9999999),
          completion: z.boolean(),
        })
        .optional(),
    })
    .nullable(),
  deferredEvolutions: z
    .array(z.strictObject({ creatureId: idSchema, toId: idSchema }))
    .max(366)
    .optional(),
  pending: z
    .array(
      z.discriminatedUnion('kind', [
        z.strictObject({ kind: z.literal('evolution'), creatureId: idSchema, toId: idSchema }),
        z.strictObject({ kind: z.literal('move'), creatureId: idSchema, moveId: idSchema }),
      ]),
    )
    .max(600),
  dialogue: z
    .strictObject({
      speaker: z.string().max(40),
      lines: z.array(z.string().max(500)).min(1).max(20),
      index: integer(19),
      after: event.nullable(),
    })
    .nullable(),
  notice: z.string().max(500),
});
const FLAGS = new Set([
  'iceTrailReward',
  'waterfallReward',
  'forestRevisitReward',
  'mineRevisitReward',
  ...ACTIVITY_FLAGS,
  ...DISTRICT_FLAGS,
  ...RECOVERY_TOWNS.map(townVisitFlag),
  ...Object.values(MAPS).flatMap((m) =>
    m.npcs
      .filter((n) => n.event && PRACTICE_TRAINERS.has(n.event))
      .map((n) => npcVictoryFlag(n.id)),
  ),
  ...ADVENTURE_FLAGS,
  'opening',
  'mistClueOne',
  'mistClueTwo',
  'mistAwakened',
  'mistCaught',
  'neighborMet',
  'professorCall',
  'starterChoice',
  'professorRescued',
  'partnerReceived',
  'fieldKitReceived',
  'rival',
  'catchTutorial',
  'quest',
  'clueOne',
  'clueTwo',
  'forestScout',
  'logMoved',
  'forestGuard',
  'rescued',
  'questReward',
  'gymSwitchOne',
  'gymScout',
  'gymSwitchTwo',
  'gymKeeper',
  'leader',
  'vineCut',
  'shop',
  'firstCatch',
  'routeChest',
  'rockSwitchOne',
  'rockScout',
  'rockSwitchTwo',
  'rockKeeper',
  'rockLeader',
  'rockBreaker',
  'highlandChest',
  'habitatClean',
  'miningPlaque',
  'plaqueReturned',
  'bellAwakened',
  'bellCaught',
  'mineQuest',
  'mineClueOne',
  'mineClueTwo',
  'mineGuard',
  'mineStabilized',
  'mineReport',
  'foothillRock',
  'mineRock',
  'waterSwitchOne',
  'waterSwitchTwo',
  'waterScout',
  'waterKeeper',
  'waterLeader',
  'waterRig',
  'coastChest',
  'harborQuest',
  'cargoManifest',
  'sluiceGauge',
  'tideGuard',
  'sluiceRepaired',
  'harborReport',
  'bottleFound',
  'bottleDate',
  'bottleDelivered',
  'lighthouseQuest',
  'lighthouseLens',
  'lighthouseRepaired',
  'shoreObservation',
  'poolObservation',
  'reefRestored',
  'coralAwakened',
  'coralCaught',
  'islandAwakened',
  'islandCaught',
  'tideAwakened',
  'tideCaught',
]);
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`存档无效：${message}`);
}
export function validateGame(input: unknown): GameState {
  const parsed = gameSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(`存档结构无效：${parsed.error.issues[0]?.path.join('.') ?? '未知字段'}`);
  const game = parsed.data as GameState;
  invariant(validFishing(game), '垂钓来源、捕捉或纪念奖励记录无效');
  invariant(validEcology(game), '昼夜观察记录无效');
  invariant(validNursery(game), '培育屋寄养或孵化记录无效');
  invariant(!game.production || validateProduction(game.production, game), '城市生产记录无效');
  if (game.activities) {
    const ledger = game.activities;
    invariant(
      Object.keys(ledger.drafts ?? {}).length <= Object.keys(FIELD_ACTIVITIES).length,
      '活动草稿过多',
    );
    for (const [id, draft] of Object.entries(ledger.drafts ?? {}))
      invariant(
        id === draft.id &&
          (draft.status !== 'won' || !!ledger.records[id]?.completions) &&
          validActivityBoard(draft) &&
          game.progress.flags.catchTutorial,
        '活动草稿无效',
      );
    invariant(
      Object.keys(ledger.records).length <= Object.keys(FIELD_ACTIVITIES).length,
      '活动记录过多',
    );
    for (const [id, record] of Object.entries(ledger.records)) {
      const definition = FIELD_ACTIVITIES[id];
      invariant(
        definition && game.progress.flags[definition.goalFlag] && game.progress.flags.catchTutorial,
        '活动完成记录与机关进度不符',
      );
      invariant(!!definition.reward || record.rewardClaimed, '机关不提供物品奖励');
    }
    const active = ledger.active;
    if (active) {
      invariant(
        !game.battle &&
          !game.dialogue &&
          !game.pending.length &&
          validActivityLocation(game, active),
        '活动位置或前置无效',
      );
      invariant(validActivityBoard(active), '活动棋盘无效');
      invariant(
        active.status !== 'won' || !!ledger.records[active.id]?.completions,
        '活动结果缺少完成记录',
      );
    }
  }
  for (const flag of ACTIVITY_FLAGS)
    invariant(
      !game.progress.flags[flag] ||
        Object.keys(game.activities?.records ?? {}).some(
          (id) => FIELD_ACTIVITIES[id]?.goalFlag === flag,
        ),
      '活动标记缺少记录',
    );
  invariant(
    !game.captureTargetId ||
      (!!SPECIES[game.captureTargetId] && game.dex.seen.includes(game.captureTargetId)),
    '图鉴收集目标尚未发现或不存在',
  );
  const journal = game.questJournal ?? [];
  invariant(
    new Set(journal).size === journal.length &&
      journal.every((id) => STORY_QUESTS.some((q) => q.id === id)),
    '任务记录无效',
  );
  invariant(
    !game.trackedQuestId || journalQuests(game).some((q) => q.id === game.trackedQuestId),
    '追踪任务尚未接取或不存在',
  );
  for (const id of CLIMATE_IDS) {
    const local = game.environment?.climates?.[id];
    if (local) invariant(CLIMATES[id].weights[local.weather] > 0, '气候区天气不适用');
  }
  invariant(
    Object.keys(game.creatures).length <= (game.challenge?.active?.rental ? 369 : 366),
    '精灵数量超限',
  );
  invariant(game.box.length <= (game.challenge?.active?.rental ? 366 : 360), '仓库容量超限');
  const references = [...game.party, ...game.box];
  invariant(
    new Set(references).size === references.length &&
      references.length === Object.keys(game.creatures).length,
    '精灵重复或没有归属',
  );
  for (const id of references) invariant(game.creatures[id]?.id === id, '精灵引用不存在');
  const checkCreature = (c: GameState['creatures'][string]) => {
    const species = SPECIES[c.speciesId];
    invariant(species && Object.hasOwn(SPECIES, c.speciesId), '未知精灵');
    invariant(
      c.experience >= xpAt(c.level, species.experienceCurve) &&
        (c.level === 100
          ? c.experience === xpAt(100, species.experienceCurve)
          : c.experience < xpAt(c.level + 1, species.experienceCurve)),
      '等级与经验不一致',
    );
    invariant(c.hp <= statsFor(c).hp, '体力超过上限');
    if (c.friendship) {
      const friendship = c.friendship;
      invariant(
        friendship.lastInteractionAt === null ||
          friendship.lastInteractionAt <= game.playTimeSeconds,
        '亲密互动时间不能晚于游玩时间',
      );
      invariant(
        friendship.lastInteractionAt !== null ||
          friendship.interactionSteps === FRIENDSHIP_INTERACTION_STEPS,
        '尚未互动的伙伴不应有互动冷却',
      );
    }
    invariant(new Set(c.moves.map((m) => m.id)).size === c.moves.length, '技能重复');
    for (const m of c.moves)
      invariant(canLearnMove(c.speciesId, m.id) && m.pp <= MOVES[m.id]!.pp, '技能归属或 PP 无效');
    invariant(c.status === 'sleep' || c.sleepTurns === 0, '睡眠回合无效');
    invariant(
      !c.confusionTurns ||
        (c.hp > 0 &&
          game.battle &&
          game.battle.phase !== 'ended' &&
          ((game.creatures[c.id] === c && game.battle.playerId === c.id) ||
            game.battle.enemies[game.battle.enemyIndex] === c)),
      '混乱状态只能保留在当前场上精灵身上',
    );
    if (c.taughtMoves)
      invariant(
        new Set(c.taughtMoves).size === c.taughtMoves.length && c.taughtMoves.every(copyableMove),
        '复刻技能册无效',
      );
    if (c.training) {
      const t = c.training;
      invariant(
        t.naturalGrowthFromLevel === undefined || t.naturalGrowthFromLevel <= c.level,
        '自然成长起始等级无效',
      );
      invariant(
        t.rolls.length === c.level - 1 &&
          (t.strengthFromLevel === undefined || t.strengthFromLevel <= c.level + 1) &&
          t.rolls.every(
            (n, i) =>
              n === growthRoll(t.seed, c.speciesId, i + 2, i + 2 < (t.strengthFromLevel ?? 101)),
          ),
        '能力点成长记录与等级不符',
      );
      const available = t.rolls.reduce((sum, n) => sum + n, 0) - sumStats(t.allocated);
      invariant(
        available >= 0 && (t.mode !== 'auto' || available === 0),
        '能力点分配超额或自动培养未结算',
      );
    }
  };
  Object.values(game.creatures).forEach(checkCreature);
  if (game.challenge) {
    const challenge = game.challenge;
    invariant(challenge.best >= challenge.streak, '挑战连胜记录无效');
    const active = challenge.active;
    const draft = challenge.rentalDraft;
    if (draft) {
      invariant(
        !active &&
          game.progress.flags.champion &&
          new Set(draft.offers.map((c) => c.id)).size === 6 &&
          new Set(draft.offers.map((c) => c.speciesId)).size === 6 &&
          new Set(draft.selected).size === draft.selected.length &&
          draft.selected.every((id) => draft.offers.some((c) => c.id === id)) &&
          draft.offers.every((c) => c.level === 50 && !game.creatures[c.id]),
        '租借候选记录无效',
      );
      draft.offers.forEach(checkCreature);
    }
    if (active?.rental) {
      const r = active.rental;
      const originals = [...active.originalParty, ...active.originalBox];
      invariant(
        game.progress.flags.champion &&
          !game.league?.active &&
          !game.activities?.active &&
          !game.pending.length &&
          !game.dialogue &&
          challenge.streak < 3 &&
          new Set(originals).size === originals.length &&
          originals.every((id) => !!game.creatures[id] && !active.selected.includes(id)) &&
          game.box.length === originals.length &&
          game.box.every((id, i) => id === [...active.originalBox, ...active.originalParty][i]) &&
          new Set(active.selected).size === 3 &&
          game.party.length === 3 &&
          active.selected.every((id, i) => game.party[i] === id) &&
          Object.keys(game.creatures).length === originals.length + 3 &&
          Object.keys(active.originals).length === 3 &&
          active.selected.every(
            (id) =>
              active.originals[id]?.id === id &&
              active.originals[id]?.speciesId === game.creatures[id]?.speciesId &&
              game.creatures[id]?.level === 50,
          ) &&
          (!game.battle || !!game.battle.ruleChallenge) &&
          (game.battle
            ? r.opponents.length === 3 &&
              !r.swapped &&
              r.opponents.every(
                (c, i) =>
                  c.id === game.battle!.enemies[i]?.id &&
                  c.speciesId === game.battle!.enemies[i]?.speciesId,
              )
            : challenge.streak > 0 && r.opponents.length === 3),
        '租借挑战状态或还原队伍无效',
      );
      invariant(
        new Set(r.opponents.map((c) => c.id)).size === r.opponents.length &&
          r.opponents.every((c) => c.level === 50 && !originals.includes(c.id)) &&
          r.opponents.filter((c) => active.selected.includes(c.id)).length === (r.swapped ? 1 : 0),
        '租借换人记录无效',
      );
      Object.values(active.originals).forEach(checkCreature);
      r.opponents.forEach(checkCreature);
    } else if (active) {
      const originalIds = [...active.originalParty, ...active.originalBox];
      invariant(
        game.progress.flags.champion &&
          !game.league?.active &&
          !game.activities?.active &&
          !game.pending.length &&
          !game.dialogue &&
          active.selected.length === 3 &&
          new Set(active.selected).size === 3 &&
          active.selected.every(
            (id, i) => game.party[i] === id && active.originalParty.includes(id),
          ) &&
          game.party.length === 3 &&
          new Set(originalIds).size === originalIds.length &&
          originalIds.length === Object.keys(game.creatures).length &&
          originalIds.every((id) => !!game.creatures[id]) &&
          Object.keys(active.originals).length === 3 &&
          active.selected.every(
            (id) =>
              active.originals[id]?.id === id &&
              active.originals[id]?.speciesId === game.creatures[id]?.speciesId &&
              game.creatures[id]?.level === 50,
          ),
        '挑战队伍或还原记录无效',
      );
      Object.values(active.originals).forEach(checkCreature);
      invariant(!game.battle || !!game.battle.ruleChallenge, '挑战期间不能进行普通战斗');
    } else invariant(challenge.streak === 0, '退出挑战后连胜未重置');
  }
  if (game.battle?.ruleChallenge) {
    invariant(
      !!game.challenge?.active &&
        game.battle.kind === 'trainer' &&
        game.battle.event === null &&
        game.battle.enemies.length === 3 &&
        game.battle.enemies.every((c) => c.level === 50) &&
        !game.battle.challengeSettled &&
        (game.battle.result === null || ['win', 'lose'].includes(game.battle.result)),
      '规则挑战战斗无效',
    );
  }
  invariant(
    Object.keys(game.inventory).every((id) => Object.hasOwn(ITEMS, id)),
    '未知道具',
  );
  invariant(
    Object.keys(game.progress.flags).every((flag) => FLAGS.has(flag)),
    '未知剧情标记',
  );
  const flags = game.progress.flags;
  for (const [event, record] of Object.entries(game.gymRematches ?? {})) {
    const gym = gymRematch(event);
    invariant(
      gym && flags.champion && flags[gym.leader] && record.wins <= record.attempts,
      '道馆再战记录或解锁条件无效',
    );
  }
  const dialogueRematch = gymRematch(game.dialogue?.after);
  if (dialogueRematch)
    invariant(
      flags.champion &&
        flags[dialogueRematch.leader] &&
        game.player.map === dialogueRematch.map &&
        !game.battle &&
        !game.league?.active &&
        !game.challenge?.active &&
        !game.activities?.active &&
        !game.pending.length,
      '道馆再战对话缺少前置条件',
    );
  for (const [flag, requires] of Object.entries(ADVENTURE_PREREQUISITES))
    invariant(
      !flags[flag] || requires.every((f) => hasFieldAccess(game, f)),
      `后续剧情前置冲突：${flag}`,
    );
  const master = game.masterBalls ?? { claimed: [], used: 0 };
  const cheat = game.cheats ?? { redemptions: 0, masterBallsGranted: 0, masterBallsUsed: 0 };
  invariant(
    cheat.masterBallsUsed <= cheat.masterBallsGranted &&
      cheat.masterBallsGranted <= cheat.redemptions * 99,
    '金手指大师球领取和使用记录不符',
  );
  invariant(
    KEY_ITEMS.every((item) => (game.inventory[item.id] ?? 0) <= 1),
    '重要物品不能重复持有',
  );
  invariant(
    new Set(master.claimed).size === master.claimed.length &&
      master.claimed.every((id) => {
        const source = MASTER_BALL_SOURCES.find((s) => s.id === id);
        return source?.implemented && source.requires.every((flag) => flags[flag]);
      }) &&
      master.used + cheat.masterBallsUsed + (game.inventory.master_ball ?? 0) ===
        master.claimed.length + cheat.masterBallsGranted &&
      (game.inventory.master_ball ?? 0) <= 999 - (3 - master.claimed.length),
    '大师球领取、使用与剩余数量不符',
  );
  for (const c of Object.values(game.creatures))
    invariant(
      [...c.moves.map((m) => m.id), ...(c.taughtMoves ?? [])].every((id) =>
        fieldSkillUnlocked(game, id),
      ),
      '剧情通用技能尚未解锁',
    );
  if (game.cityServices) {
    const ledger = game.cityServices;
    let earned = 0;
    let spent = 0;
    for (const [id, status] of Object.entries(ledger.quests)) {
      const quest = CITY_QUESTS[id];
      invariant(
        quest && CITIES.some((c) => c.id === quest.cityId && c.implemented) && flags.catchTutorial,
        '城市委托记录无效',
      );
      invariant(
        !quest.prerequisite || ledger.quests[quest.prerequisite] === 'claimed',
        '街区后续委托缺少筹备交付',
      );
      if (status === 'claimed') {
        invariant(
          quest.condition.kind !== 'checklist' || questProgress(game, quest).ready,
          '街区委托领奖缺少目标记录',
        );
        earned += quest.reward.merit;
      }
    }
    for (const [id, count] of Object.entries(ledger.exchanges)) {
      const offer = CITY_EXCHANGES[id];
      invariant(
        offer && CITIES.some((c) => c.id === offer.cityId && c.implemented) && count > 0,
        '城市兑换记录无效',
      );
      spent += offer.cost * count;
    }
    invariant(ledger.merit === earned - spent, '调查印记余额与奖励兑换不符');
  }
  invariant(
    DISTRICT_FLAGS.every((flag) => !flags[flag] || flags.catchTutorial),
    '街区记录早于捕捉入门',
  );
  for (const town of CITY_TOWNS)
    invariant(
      !flags[districtFlag(town, 'festival')] ||
        game.cityServices?.quests[districtQuestId(town, 'craft')] === 'claimed',
      '街区相聚缺少筹备交付',
    );
  const noPartnerYet = !!flags.opening && !flags.professorRescued && game.party.length === 0;
  if (game.league) {
    const l = game.league;
    invariant(
      l.wins <= l.runs &&
        (!l.active ||
          (l.runs > 0 &&
            l.stage < 5 &&
            game.player.map === 'leagueHall' &&
            LEAGUE_BADGES.every((f) => flags[f]) &&
            flags.rivalLeague)),
      '联盟连战状态冲突',
    );
    invariant(
      LEAGUE_STAGES.every((event, i) => !!flags[event] === l.stage > i),
      '联盟场次与获胜标记冲突',
    );
    invariant(l.active || l.stage === 0 || l.stage === 5, '联盟离场场次未重置');
    invariant(
      l.wins > 0 === !!flags.champion &&
        (l.wins > 0 ? !!l.firstTeam && !!l.lastTeam : !l.firstTeam && !l.lastTeam),
      '冠军名录与获胜记录冲突',
    );
    for (const team of [l.firstTeam, l.lastTeam])
      if (team)
        invariant(
          team.every((c) => SPECIES[c.speciesId] && game.dex.caught.includes(c.speciesId)),
          '冠军队伍记录无效',
        );
  }
  invariant(!flags.champion || (game.league?.wins ?? 0) > 0, '冠军缺少名录');
  invariant(
    !flags.nurseryGift || STARTERS.every((id) => game.dex.caught.includes(id)),
    '保育园赠予缺少初始伙伴记录',
  );
  invariant(!flags.dexComplete || game.dex.caught.length === 250, '全图鉴称号与登记冲突');
  invariant(
    game.player.map !== 'leagueHall' ||
      !!game.league?.active ||
      (game.battle?.event === 'leagueChampion' && game.battle.result === 'win'),
    '未登记联盟连战',
  );
  invariant(game.player.map !== 'hallOfFame' || !!flags.champion, '冠军名录尚未解锁');
  invariant(
    game.party.length > 0 ||
      (noPartnerYet && game.box.length === 0 && !game.battle && game.pending.length === 0),
    '空队伍只允许在获得伙伴前的序章',
  );
  if (flags.opening) {
    invariant(!flags.professorCall || flags.neighborMet, '呼救早于邻居介绍');
    invariant(!flags.starterChoice || (flags.professorCall && noPartnerYet), '背包选择阶段无效');
    invariant(
      !flags.professorRescued || (flags.professorCall && game.party.length > 0),
      '博士救援进度冲突',
    );
    invariant(!flags.partnerReceived || flags.professorRescued, '伙伴赠送早于救援');
    invariant(!flags.rival || flags.partnerReceived, '对手战早于正式获得伙伴');
    invariant(!flags.fieldKitReceived || flags.rival, '图鉴补给早于对手战');
    invariant(!flags.catchTutorial || flags.fieldKitReceived, '捕捉教学早于图鉴补给');
    if (!flags.partnerReceived) {
      invariant(game.party.length <= 1 && game.box.length === 0, '借用阶段只能有一位伙伴');
      if (game.party.length)
        invariant(
          STARTERS.includes(game.creatures[game.party[0]!]!.speciesId),
          '借用的不是初始伙伴',
        );
    }
    if (noPartnerYet)
      invariant(
        !flags.partnerReceived &&
          !flags.rival &&
          !flags.fieldKitReceived &&
          !flags.quest &&
          !game.progress.badges,
        '序章空队伍与后续进度冲突',
      );
  }
  invariant(
    !flags.logMoved || (flags.clueOne && flags.clueTwo && flags.forestScout),
    '倒木进度冲突',
  );
  invariant(!flags.rescued || flags.forestGuard, '救援进度冲突');
  invariant(!flags.questReward || flags.rescued, '救援奖励进度冲突');
  invariant(
    !flags.leader ||
      (flags.leader &&
        flags.rival &&
        flags.catchTutorial &&
        flags.gymScout &&
        flags.gymKeeper &&
        flags.vineCut),
    '徽章进度冲突',
  );
  invariant(
    !flags.rockLeader ||
      (flags.rival &&
        flags.catchTutorial &&
        flags.rockScout &&
        flags.rockKeeper &&
        flags.rockSwitchOne &&
        flags.rockSwitchTwo &&
        flags.rockBreaker),
    '岩石徽章进度冲突',
  );
  invariant(
    !flags.waterLeader ||
      (flags.rival &&
        flags.catchTutorial &&
        flags.waterScout &&
        flags.waterKeeper &&
        flags.waterSwitchOne &&
        flags.waterSwitchTwo &&
        flags.waterRig),
    '潮汐徽章进度冲突',
  );
  invariant(!flags.waterRig || flags.waterLeader, '渡水装备早于徽章');
  invariant(!flags.waterScout || flags.waterSwitchOne, '潮汐学徒早于浮桥');
  invariant(!flags.waterSwitchTwo || flags.waterScout, '回潮阀门早于学徒考验');
  invariant(!flags.waterKeeper || flags.waterSwitchTwo, '领航考验早于浮桥');
  invariant(!flags.harborQuest || flags.mineReport, '港口调查缺少矿山报告');
  invariant((!flags.cargoManifest && !flags.sluiceGauge) || flags.harborQuest, '港口证据缺少委托');
  invariant(!flags.tideGuard || (flags.cargoManifest && flags.sluiceGauge), '港口对战缺少两份证据');
  invariant(!flags.sluiceRepaired || flags.tideGuard, '修闸早于击退货运员');
  invariant(!flags.harborReport || flags.sluiceRepaired, '航路报告早于修闸');
  invariant(!flags.bottleFound || flags.catchTutorial, '家书调查早于入门');
  invariant(!flags.bottleDate || flags.bottleFound, '潮汐日期缺少家书');
  invariant(!flags.bottleDelivered || flags.bottleDate, '送信早于核对航季');
  invariant(!flags.lighthouseQuest || flags.catchTutorial, '灯塔调查早于入门');
  invariant(!flags.lighthouseLens || flags.lighthouseQuest, '镜片缺少维修委托');
  invariant(!flags.lighthouseRepaired || flags.lighthouseLens, '灯塔维修缺少镜片');
  invariant(
    (!flags.shoreObservation && !flags.poolObservation) || flags.catchTutorial,
    '潮池观察早于入门',
  );
  invariant(
    !flags.reefRestored || (flags.shoreObservation && flags.poolObservation),
    '栖地修复缺少两份观察',
  );
  for (const encounter of Object.values(COAST_STORY_ENCOUNTERS)) {
    invariant(
      !flags[encounter.awakened] || encounter.requires.every((flag) => flags[flag]),
      '浅礁相遇缺少剧情前置',
    );
    invariant(
      !flags[encounter.caught] ||
        (flags[encounter.awakened] && game.dex.caught.includes(encounter.speciesId)),
      '浅礁捕获进度冲突',
    );
  }
  for (const encounter of Object.values(ADVENTURE_ENCOUNTERS))
    if (encounter)
      invariant(
        !flags[encounter.caught] ||
          (flags[encounter.awakened] && game.dex.caught.includes(encounter.speciesId)),
        '区域剧情捕获进度冲突',
      );
  invariant(game.progress.badges === badgeCount(flags), '徽章数量与实际获得不符');
  invariant(game.progress.chapter === game.progress.badges + 1, '章节进度冲突');
  invariant(!flags.rockBreaker || flags.rockLeader, '碎岩工具早于徽章');
  invariant(
    (!flags.foothillRock && !flags.mineRock) || hasFieldAccess(game, 'rockBreaker'),
    '捷径清理早于碎岩工具',
  );
  invariant(!flags.habitatClean || flags.catchTutorial, '栖地调查早于入门');
  invariant(!flags.miningPlaque || flags.catchTutorial, '工牌调查早于入门');
  invariant(!flags.plaqueReturned || flags.miningPlaque, '归还工牌早于发现');
  invariant(!flags.bellAwakened || flags.plaqueReturned, '钟石剧情前置冲突');
  invariant(
    !flags.bellCaught || (flags.bellAwakened && game.dex.caught.includes('creature_077')),
    '钟石捕获进度冲突',
  );
  invariant(!flags.mineQuest || flags.questReward, '矿山调查缺少森林报告');
  invariant((!flags.mineClueOne && !flags.mineClueTwo) || flags.mineQuest, '矿山线索缺少委托');
  invariant(
    !flags.mineGuard || (flags.mineQuest && flags.mineClueOne && flags.mineClueTwo),
    '矿山对战缺少调查',
  );
  invariant(!flags.mineStabilized || flags.mineGuard, '装置关闭早于击退勘测员');
  invariant(!flags.mineReport || flags.mineStabilized, '矿山报告早于装置关闭');
  invariant(
    !flags.mistAwakened || (flags.questReward && flags.mistClueOne && flags.mistClueTwo),
    '旧铃剧情前置冲突',
  );
  invariant(
    !flags.mistCaught || (flags.mistAwakened && game.dex.caught.includes('creature_025')),
    '旧铃捕获进度冲突',
  );
  if (game.world) {
    invariant(
      Object.keys(game.world.patrols).length <= 128 && Object.keys(game.world.finds).length <= 128,
      '探索记录超限',
    );
    const occupied = new Set<string>();
    const patrolDefinitions = new Map<string, Npc>(
      Object.values(MAPS).flatMap((map) =>
        map.npcs.filter((n) => n.patrol).map((npc) => [`${map.id}:${npc.id}`, npc] as const),
      ),
    );
    const generated = game.world.generatedMaps ?? ORIGINAL_MAPS;
    invariant(
      new Set(generated).size === generated.length &&
        ORIGINAL_MAPS.every((id) => generated.includes(id)),
      '探索区域记录无效',
    );
    const requiredPatrols = [...patrolDefinitions.keys()].filter((key) =>
      generated.includes(key.split(':')[0] as GameState['player']['map']),
    );
    invariant(
      Object.keys(game.world.patrols).length === requiredPatrols.length &&
        requiredPatrols.every((key) => game.world!.patrols[key]),
      '巡走记录不完整',
    );
    for (const [key, patrol] of Object.entries(game.world.patrols)) {
      const npc = patrolDefinitions.get(key);
      invariant(npc?.patrol && patrol.index < npc.patrol.length, '巡走记录无效');
    }
    const trainerDefinitions = new Map<string, { map: GameState['player']['map']; npc: Npc }>(
      Object.values(MAPS).flatMap((map) =>
        map.npcs
          .filter(isSightTrainer)
          .map((npc) => [`${map.id}:${npc.id}`, { map: map.id, npc }] as const),
      ),
    );
    invariant(
      Object.keys(game.world.trainerPositions ?? {}).length <= trainerDefinitions.size,
      '训练师位置记录超限',
    );
    for (const [key, position] of Object.entries(game.world.trainerPositions ?? {})) {
      const definition = trainerDefinitions.get(key);
      invariant(!!definition, '训练师位置记录无效');
      const map = definition!.map;
      invariant(
        generated.includes(map) &&
          terrainPassable(map, position.x, position.y, effectiveAccessFlags(game)) &&
          !['W', '~', 'K', 'E'].includes(MAPS[map].rows[position.y]?.[position.x] ?? '') &&
          !MAPS[map].portals.some((p) => p.x === position.x && p.y === position.y),
        '训练师停留位置无效',
      );
    }
    if (game.world.trainerChallenge)
      invariant(validTrainerChallenge(game), '训练师发现与接近状态无效');
    for (const find of Object.values(game.world.finds)) {
      invariant(
        generated.includes(find.map) &&
          FIND_SITES[find.map]?.some(([x, y]) => x === find.x && y === find.y) &&
          ITEMS[find.itemId] &&
          isOrdinarySpecies(find.speciesId),
        '探索地点或奖励无效',
      );
      const key = `${find.map}:${find.x},${find.y}`;
      invariant(!occupied.has(key), '探索地点重复');
      occupied.add(key);
    }
    if (game.world.activeFind) {
      const find = game.world.finds[game.world.activeFind];
      invariant(
        find?.claimed && find.kind === 'wild' && game.dialogue?.after === 'discoveryEncounter',
        '探索相遇状态无效',
      );
    }
  }
  // Old room saves could stand where the new service counters now sit.
  // Move only this newly blocked tile to the customer side without resetting the journey.
  if (
    MAPS[game.player.map].interior &&
    MAPS[game.player.map].rows[game.player.y]?.[game.player.x] === 'K'
  ) {
    const landing = [
      [0, 1],
      [1, 0],
      [-1, 0],
      [0, -1],
    ]
      .map(([dx, dy]) => ({ x: game.player.x + dx!, y: game.player.y + dy! }))
      .find(
        ({ x, y }) =>
          safePosition(game.player.map, x, y, effectiveAccessFlags(game)) &&
          !worldNpcs(game).some((npc) => npc.x === x && npc.y === y && npcVisible(game, npc)),
      );
    if (landing) Object.assign(game.player, landing);
  }
  // Public furniture added to a city may now occupy an older save's lawn position.
  // Recover only known scenery footprints, keeping progress and the current neighbourhood.
  if (
    MAPS[game.player.map].scenery?.some(
      (prop) =>
        game.player.x >= prop.x &&
        game.player.x < prop.x + prop.width &&
        game.player.y >= prop.y &&
        game.player.y < prop.y + prop.height,
    )
  ) {
    let landing: { x: number; y: number } | undefined;
    for (let radius = 1; radius <= 4 && !landing; radius++)
      for (let dy = -radius; dy <= radius && !landing; dy++)
        for (let dx = -radius; dx <= radius && !landing; dx++) {
          if (Math.abs(dx) + Math.abs(dy) !== radius) continue;
          const x = game.player.x + dx,
            y = game.player.y + dy;
          if (
            safePosition(game.player.map, x, y, effectiveAccessFlags(game)) &&
            !['~', 'W'].includes(MAPS[game.player.map].rows[y]?.[x] ?? '') &&
            !MAPS[game.player.map].portals.some((p) => p.x === x && p.y === y) &&
            !worldNpcs(game).some((npc) => npc.x === x && npc.y === y && npcVisible(game, npc))
          )
            landing = { x, y };
        }
    if (landing) Object.assign(game.player, landing);
  }
  invariant(
    safePosition(game.player.map, game.player.x, game.player.y, effectiveAccessFlags(game)),
    '位置不可站立',
  );
  if (['~', 'W'].includes(MAPS[game.player.map].rows[game.player.y]?.[game.player.x] ?? ''))
    invariant(canSurf(game), '水面位置缺少渡水能力');
  // Older saves could stand on a defeated trainer's former, hidden tile.
  // Move only that legacy case to an adjacent empty floor when residents become visible.
  if (
    !game.world?.generatedMaps?.some((id) => MAPS[id].interior) &&
    worldNpcs(game).some(
      (n) =>
        n.x === game.player.x &&
        n.y === game.player.y &&
        npcVisible(game, n) &&
        npcDefeated(flags, n),
    )
  ) {
    const landing = [
      [0, 1],
      [1, 0],
      [-1, 0],
      [0, -1],
    ]
      .map(([dx, dy]) => ({ x: game.player.x + dx!, y: game.player.y + dy! }))
      .find(
        ({ x, y }) =>
          safePosition(game.player.map, x, y, effectiveAccessFlags(game)) &&
          !['~', 'W'].includes(MAPS[game.player.map].rows[y]?.[x] ?? '') &&
          !MAPS[game.player.map].portals.some((p) => p.x === x && p.y === y) &&
          !worldNpcs(game).some((n) => n.x === x && n.y === y && npcVisible(game, n)),
      );
    if (landing) Object.assign(game.player, landing);
  }
  invariant(
    !worldNpcs(game).some(
      (n) => n.x === game.player.x && n.y === game.player.y && npcVisible(game, n),
    ),
    '位置被角色占用',
  );
  for (const key of ['seen', 'caught'] as const)
    invariant(
      new Set(game.dex[key]).size === game.dex[key].length &&
        game.dex[key].every((id) => SPECIES[id]),
      '图鉴数据无效',
    );
  invariant(
    game.dex.caught.every((id) => game.dex.seen.includes(id)),
    '图鉴获得未见过',
  );
  invariant(
    Object.values(game.creatures).every(
      (c) =>
        game.dex.caught.includes(c.speciesId) ||
        (game.challenge?.active?.rental && game.challenge.active.selected.includes(c.id)),
    ),
    '精灵未登记到图鉴',
  );
  for (const p of game.pending)
    invariant(
      game.creatures[p.creatureId] &&
        (p.kind === 'move'
          ? canLearnMove(game.creatures[p.creatureId]!.speciesId, p.moveId)
          : SPECIES[game.creatures[p.creatureId]!.speciesId]!.evolutions.some(
              (e) => e.toId === p.toId,
            )),
      '成长选项引用无效',
    );
  if (game.deferredEvolutions) {
    invariant(
      new Set(game.deferredEvolutions.map((choice) => `${choice.creatureId}:${choice.toId}`))
        .size === game.deferredEvolutions.length,
      '延后进化提示重复',
    );
    for (const choice of game.deferredEvolutions) {
      const creature = game.creatures[choice.creatureId];
      invariant(
        creature &&
          SPECIES[creature.speciesId]!.evolutions.some(
            (edge) => edge.toId === choice.toId && !!edge.alternatives?.length,
          ),
        '延后进化提示引用无效',
      );
    }
  }
  if (game.dialogue) invariant(game.dialogue.index < game.dialogue.lines.length, '对话位置越界');
  if (game.battle) {
    const b = game.battle;
    const rematch = gymRematch(b.event);
    if (rematch) {
      const record = game.gymRematches?.[rematch.event];
      invariant(
        flags.champion &&
          flags[rematch.leader] &&
          record &&
          (b.result === 'win'
            ? record.wins > 0
            : record.attempts > record.wins || record.attempts === 999999999) &&
          !game.league?.active &&
          !game.challenge?.active &&
          !game.activities?.active &&
          b.kind === 'trainer' &&
          !b.ruleChallenge &&
          (b.result === null || b.result === 'win' || b.result === 'lose') &&
          (b.result === 'lose' || game.player.map === rematch.map) &&
          b.npcId === MAPS[rematch.map].npcs.find((npc) => npc.event === rematch.leader)?.id &&
          b.enemies.length === rematch.team.length &&
          b.enemies.every(
            (enemy, i) =>
              enemy.speciesId === rematch.team[i]![0] && enemy.level === rematch.team[i]![1],
          ),
        '道馆再战战斗或记录无效',
      );
    }
    if (b.npcId)
      invariant(
        b.kind === 'trainer' &&
          Object.values(MAPS).some((m) =>
            m.npcs.some((n) => n.id === b.npcId && n.event === (rematch?.leader ?? b.event)),
          ),
        '训练师对战来源无效',
      );
    const regional = adventureEncounter(b.event);
    if (regional)
      invariant(
        b.kind === 'wild' &&
          b.enemies.length === 1 &&
          b.enemies[0]!.speciesId === regional.speciesId &&
          b.enemies[0]!.level === regional.level &&
          flags[regional.awakened] &&
          regional.requires.every((f) => flags[f]),
        '区域剧情相遇缺少前置或物种不符',
      );
    b.enemies.forEach(checkCreature);
    let previousLog = -1;
    const checkScene = (scene: import('../../game/model').BattleScene) => {
      for (const side of ['player', 'enemy'] as const) {
        const figure = scene[side];
        const creature =
          side === 'player' ? game.creatures[figure.id] : b.enemies.find((c) => c.id === figure.id);
        invariant(
          creature &&
            figure.speciesId === creature.speciesId &&
            figure.hp <= figure.maxHp &&
            (side !== 'player' || game.party.includes(figure.id)),
          '战斗画面引用无效',
        );
      }
    };
    for (const visual of b.visualEvents ?? []) {
      invariant(
        visual.logIndex >= previousLog && visual.logIndex < b.logs.length,
        '技能画面顺序无效',
      );
      previousLog = visual.logIndex;
      if (visual.kind === 'scene') checkScene(visual.scene);
      else if (visual.kind === 'capture') {
        checkScene(visual.scene);
        invariant(
          b.kind === 'wild' &&
            (!visual.caught || b.result === 'caught') &&
            (!visual.caught || visual.shakes === undefined || visual.shakes === 3),
          '捕捉画面结果无效',
        );
      } else {
        checkScene(visual.before);
        checkScene(visual.after);
        invariant(
          visual.endLogIndex >= visual.logIndex &&
            visual.endLogIndex < b.logs.length &&
            canLearnMove(visual.before[visual.side].speciesId, visual.moveId),
          '技能画面归属无效',
        );
      }
    }
    invariant(
      b.enemyIndex < b.enemies.length &&
        game.party.includes(b.playerId) &&
        b.participants.every((id) => game.party.includes(id)),
      '战斗引用无效',
    );
    invariant((b.phase === 'ended') === (b.result !== null), '战斗结算状态冲突');
    for (const [id, volatile] of Object.entries(b.volatiles ?? {})) {
      const side =
        id === b.playerId ? 'player' : id === b.enemies[b.enemyIndex]?.id ? 'enemy' : null;
      const creature = side === 'player' ? game.creatures[id] : b.enemies[b.enemyIndex];
      invariant(
        b.phase !== 'ended' && side !== null && creature && creature.hp > 0,
        '战斗临时状态只能属于当前在场且存活的伙伴',
      );
      invariant(
        (volatile.lastProtectTurn === undefined) === (volatile.protectChain === undefined) &&
          (volatile.lastProtectTurn === undefined || volatile.lastProtectTurn <= b.turn),
        '守住连续回合记录无效',
      );
      invariant(
        volatile.seededBy === undefined ||
          (volatile.seededBy !== side && !SPECIES[creature.speciesId]!.types.includes('grass')),
        '寄生来源或草属性免疫记录无效',
      );
    }
    if (b.enemyMedicine) {
      const allowance = trainerMedicine(b.event);
      invariant(
        b.kind === 'trainer' &&
          !b.ruleChallenge &&
          allowance &&
          b.enemyMedicine.itemId === allowance.itemId &&
          b.enemyMedicine.remaining <= allowance.remaining,
        '对手回复道具额度无效',
      );
    }
    if (b.actionRound) {
      const round = b.actionRound;
      const protectedIds = round.protected ?? [];
      invariant(
        new Set(protectedIds).size === protectedIds.length &&
          protectedIds.every(
            (id) =>
              (id === b.playerId
                ? game.creatures[id]!.hp > 0
                : id === b.enemies[b.enemyIndex]?.id && b.enemies[b.enemyIndex]!.hp > 0) &&
              b.volatiles?.[id]?.lastProtectTurn === b.turn,
          ),
        '守住状态只能属于本回合使用守住的当前在场伙伴',
      );
      invariant(
        Object.values(round.immobility).every(
          (cached) =>
            (cached.confusionTurns === undefined) === (cached.confusionBlocked === undefined),
        ),
        '混乱回合检查记录不完整',
      );
      invariant(
        round.enemyItem === undefined ||
          (round.enemySwitchIndex === undefined &&
            !!b.enemyMedicine &&
            b.enemyMedicine.remaining > 0 &&
            round.enemyItem === b.enemyMedicine.itemId),
        '对手本回合道具选择无效',
      );
      invariant(
        b.phase === 'choose' &&
          round.playerRemaining > 0 &&
          round.playerRemaining < round.playerTotal &&
          round.enemyRemaining <= round.enemyTotal &&
          (round.playerTotal === 1 || round.enemyTotal === 1) &&
          Object.keys(round.immobility).every(
            (id) => game.party.includes(id) || b.enemies.some((e) => e.id === id),
          ),
        '本回合剩余行动额度无效',
      );
    }
    if (b.weather)
      invariant(
        b.weather.turns !== null || b.weather.kind === b.weather.ambient,
        '场地天气期限无效',
      );
    if (b.rewards)
      invariant(
        new Set(b.rewards.defeated).size === b.rewards.defeated.length &&
          b.rewards.defeated.every((id) => b.enemies.some((e) => e.id === id && e.hp === 0)) &&
          b.enemies.filter((e) => e.hp === 0).every((e) => b.rewards!.defeated.includes(e.id)) &&
          b.rewards.completion === (b.phase === 'ended'),
        '击败奖励结算记录无效',
      );
    invariant(
      b.phase === 'ended' ||
        ((b.phase === 'forcedSwitch'
          ? game.creatures[b.playerId]!.hp === 0
          : game.creatures[b.playerId]!.hp > 0) &&
          b.enemies[b.enemyIndex]!.hp > 0),
      '战斗体力状态冲突',
    );
  } else
    invariant(noPartnerYet || game.party.some((id) => game.creatures[id]!.hp > 0), '队伍无法继续');
  clearCompletedCaptureTarget(game);
  return game;
}
export interface Snapshot {
  gameId: typeof GAME_ID;
  schemaVersion: number;
  contentVersion: string;
  lineageId: string;
  branchId: string;
  revisionId: string;
  parentRevisionId: string | null;
  savedAt: string;
  payload: string;
  checksum: string;
}
const snapshotSchema = z.strictObject({
  gameId: z.literal(GAME_ID),
  schemaVersion: integer(1000, 1),
  contentVersion: z.string().max(40),
  lineageId: idSchema,
  branchId: idSchema,
  revisionId: idSchema,
  parentRevisionId: idSchema.nullable(),
  savedAt: z.iso.datetime(),
  payload: z.string().max(MAX_SAVE_BYTES),
  checksum: z.string().regex(/^[0-9a-f]{64}$/),
});
export function createSnapshot(
  state: GameState,
  entropy: Entropy,
  previous: Snapshot | null,
  branchId?: string,
): Snapshot {
  const payload = JSON.stringify(validateGame(state));
  if (utf8(payload).length > MAX_SAVE_BYTES - 2048) throw new Error('存档超过 8 MiB 上限');
  return {
    gameId: GAME_ID,
    schemaVersion: SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    lineageId: previous?.lineageId ?? identifier(entropy),
    branchId: branchId ?? previous?.branchId ?? identifier(entropy),
    revisionId: identifier(entropy),
    parentRevisionId: previous?.revisionId ?? null,
    savedAt: new Date().toISOString(),
    payload,
    checksum: digest(payload),
  };
}
export function decodeSnapshot(text: string): { snapshot: Snapshot; game: GameState } {
  if (utf8(text).length > MAX_SAVE_BYTES) throw new Error('存档超过 8 MiB 上限');
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error('存档不是有效的 JSON');
  }
  const result = snapshotSchema.safeParse(input);
  if (!result.success) throw new Error('存档文件结构不正确');
  const snapshot = result.data;
  if (snapshot.schemaVersion !== SCHEMA_VERSION || !supportsContentVersion(snapshot.contentVersion))
    throw new Error(
      `需要兼容版本：结构 ${snapshot.schemaVersion} / 内容 ${snapshot.contentVersion}，请更新游戏`,
    );
  if (digest(snapshot.payload) !== snapshot.checksum)
    throw new Error('存档校验失败，原进度未被修改');
  const game = validateGame(JSON.parse(snapshot.payload));
  return { snapshot, game };
}
export function summary(snapshot: Snapshot) {
  const g = validateGame(JSON.parse(snapshot.payload));
  return {
    name: g.player.name,
    map: MAPS[g.player.map].name,
    badges: g.progress.badges,
    playTimeSeconds: g.playTimeSeconds,
    party: g.party.map((id) => ({
      speciesId: g.creatures[id]!.speciesId,
      level: g.creatures[id]!.level,
    })),
    contentVersion: snapshot.contentVersion,
    revisionId: snapshot.revisionId,
    checksum: snapshot.checksum,
  };
}
export type SaveSummary = ReturnType<typeof summary>;
