import { sha256 } from '@noble/hashes/sha2.js';
import { Buffer } from 'buffer';
import { z } from 'zod';
import { CONTENT_VERSION, ITEMS, MOVES, SPECIES } from '../content/catalog';
import { MAPS } from '../content/world';
import { safePosition } from '../game/engine';
import { GameState, STAT_KEYS } from '../game/model';
import { statsFor, xpAt } from '../game/rules';

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
const creatureSchema = z.strictObject({
  id: idSchema,
  speciesId: idSchema,
  nickname: z.string().max(20),
  level: integer(100, 1),
  experience: integer(1250000),
  iv: statsSchema,
  hp: integer(9999),
  status: z.enum(['poison', 'burn', 'paralysis', 'sleep']).nullable(),
  sleepTurns: integer(3),
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
const stages = z.strictObject({
  attack: integer(6, -6),
  defense: integer(6, -6),
  specialAttack: integer(6, -6),
  specialDefense: integer(6, -6),
  speed: integer(6, -6),
});
const event = z.enum([
  'rival',
  'rescue',
  'forestScout',
  'forestGuard',
  'gymScout',
  'gymKeeper',
  'leader',
  'training',
  'catchTutorial',
]);
const gameSchema = z.strictObject({
  player: z.strictObject({
    name: z.string().min(1).max(12),
    avatar: integer(1),
    money: integer(9999999),
    map: z.enum(['dawn', 'route', 'moss', 'forest', 'gym']),
    x: integer(23),
    y: integer(15),
    facing: z.enum(['up', 'down', 'left', 'right']),
    healMap: z.enum(['dawn', 'moss']),
  }),
  progress: z.strictObject({
    chapter: integer(2, 1),
    badges: integer(1),
    flags: z.record(z.string().max(50), z.boolean()),
  }),
  creatures: z.record(idSchema, creatureSchema),
  party: z.array(idSchema).min(1).max(6),
  box: z.array(idSchema).max(360),
  inventory: z.record(idSchema, integer(999)),
  dex: z.strictObject({ seen: z.array(idSchema).max(250), caught: z.array(idSchema).max(250) }),
  rng: integer(4294967295, 1),
  sequence: integer(999999999),
  steps: integer(999999999),
  encounterCooldown: integer(20),
  playTimeSeconds: integer(315360000),
  battle: z
    .strictObject({
      id: idSchema,
      kind: z.enum(['wild', 'trainer']),
      event: event.nullable(),
      name: z.string().max(40),
      enemies: z.array(creatureSchema).min(1).max(6),
      enemyIndex: integer(5),
      playerId: idSchema,
      participants: z.array(idSchema).min(1).max(6),
      phase: z.enum(['choose', 'forcedSwitch', 'ended']),
      turn: integer(100000, 1),
      aiMove: integer(3, -1),
      playerStages: stages,
      enemyStages: stages,
      logs: z.array(z.string().max(200)).max(100),
      result: z.enum(['win', 'lose', 'caught', 'escaped']).nullable(),
      runAttempts: integer(100000),
      tutorialCatch: z.boolean(),
    })
    .nullable(),
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
]);
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`存档无效：${message}`);
}
export function validateGame(input: unknown): GameState {
  const parsed = gameSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(`存档结构无效：${parsed.error.issues[0]?.path.join('.') ?? '未知字段'}`);
  const game = parsed.data as GameState;
  invariant(Object.keys(game.creatures).length <= 366, '精灵数量超限');
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
    invariant(new Set(c.moves.map((m) => m.id)).size === c.moves.length, '技能重复');
    for (const m of c.moves) invariant(MOVES[m.id] && m.pp <= MOVES[m.id]!.pp, '技能或 PP 无效');
    invariant(c.status === 'sleep' || c.sleepTurns === 0, '睡眠回合无效');
  };
  Object.values(game.creatures).forEach(checkCreature);
  invariant(
    Object.keys(game.inventory).every((id) => Object.hasOwn(ITEMS, id)),
    '未知道具',
  );
  invariant(
    Object.keys(game.progress.flags).every((flag) => FLAGS.has(flag)),
    '未知剧情标记',
  );
  const flags = game.progress.flags;
  invariant(
    !flags.logMoved || (flags.clueOne && flags.clueTwo && flags.forestScout),
    '倒木进度冲突',
  );
  invariant(!flags.rescued || flags.forestGuard, '救援进度冲突');
  invariant(!flags.questReward || flags.rescued, '救援奖励进度冲突');
  invariant(
    !game.progress.badges ||
      (flags.leader && flags.questReward && flags.gymScout && flags.gymKeeper && flags.vineCut),
    '徽章进度冲突',
  );
  invariant(game.progress.chapter === (game.progress.badges ? 2 : 1), '章节进度冲突');
  invariant(safePosition(game.player.map, game.player.x, game.player.y, flags), '位置不可站立');
  invariant(
    !MAPS[game.player.map].npcs.some(
      (n) =>
        n.x === game.player.x &&
        n.y === game.player.y &&
        !(n.id === 'forestLog' && flags.logMoved) &&
        !(n.id === 'lostCreature' && flags.rescued) &&
        !(n.role === 'trainer' && n.event !== 'training' && flags[n.event!]),
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
    Object.values(game.creatures).every((c) => game.dex.caught.includes(c.speciesId)),
    '精灵未登记到图鉴',
  );
  for (const p of game.pending)
    invariant(
      game.creatures[p.creatureId] &&
        (p.kind === 'move'
          ? MOVES[p.moveId]
          : SPECIES[game.creatures[p.creatureId]!.speciesId]!.evolutions.some(
              (e) => e.toId === p.toId,
            )),
      '成长选项引用无效',
    );
  if (game.dialogue) invariant(game.dialogue.index < game.dialogue.lines.length, '对话位置越界');
  if (game.battle) {
    const b = game.battle;
    b.enemies.forEach(checkCreature);
    invariant(
      b.enemyIndex < b.enemies.length &&
        game.party.includes(b.playerId) &&
        b.participants.every((id) => game.party.includes(id)),
      '战斗引用无效',
    );
    invariant((b.phase === 'ended') === (b.result !== null), '战斗结算状态冲突');
    invariant(
      b.phase === 'ended' ||
        ((b.phase === 'forcedSwitch'
          ? game.creatures[b.playerId]!.hp === 0
          : game.creatures[b.playerId]!.hp > 0) &&
          b.enemies[b.enemyIndex]!.hp > 0),
      '战斗体力状态冲突',
    );
  } else
    invariant(
      game.party.some((id) => game.creatures[id]!.hp > 0),
      '队伍无法继续',
    );
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
  if (snapshot.schemaVersion !== SCHEMA_VERSION || snapshot.contentVersion !== CONTENT_VERSION)
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
