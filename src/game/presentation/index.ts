import { GYM_REWARDS, MAPS } from '../../content/world';
import { SPECIES } from '../../content/catalog';
import { atCenter } from '../fieldSkills';
import { facingNpc } from '../exploration';
import { battleFigure } from '../battleVisuals';
import { canEvolve, creatureName } from '../rules';
import { hasFieldAccess } from '../../content/keyItems';
import type { BattleFigure, Command, GameState } from '../model';

type FieldEffect = 'rock' | 'log' | 'cut' | 'gate' | 'surfEnter' | 'surfExit';
export type JourneyEvent =
  | {
      kind: 'evolution';
      from: BattleFigure;
      toId: string;
      command: Extract<Command, { kind: 'evolve' }>;
    }
  | { kind: 'healing'; party: BattleFigure[] }
  | {
      kind: 'field';
      effect: FieldEffect;
      title: string;
      description: string;
      partner: BattleFigure | null;
    }
  | {
      kind: 'reward';
      title: string;
      description: string;
      badges: string[];
      champion: boolean;
      party: BattleFigure[];
    };

export const presentationParty = (game: GameState) =>
  game.party.map((id) => battleFigure(game.creatures[id]!));
export function commandPresentation(game: GameState, command: Command): JourneyEvent | null {
  if (game.battle || game.dialogue || game.progress.flags.starterChoice) return null;
  if (command.kind === 'evolve' && command.accept) {
    const c = game.creatures[command.creatureId];
    if (c && canEvolve(c, command.toId, game.inventory, game))
      return { kind: 'evolution', from: battleFigure(c), toId: command.toId, command };
  }
  if (game.pending.length || !game.party.length) return null;
  if (
    (command.kind === 'centerHeal' && atCenter(game)) ||
    (command.kind === 'interact' && facingNpc(game)?.role === 'healer')
  )
    return { kind: 'healing', party: presentationParty(game) };
  return null;
}

export function fieldPresentation(
  before: GameState,
  after: GameState,
  command: Command,
): JourneyEvent | null {
  if (before.battle || before.player.map !== after.player.map) return null;
  const partner = before.party.map((id) => before.creatures[id]!).find((c) => c.hp > 0);
  const base = { kind: 'field' as const, partner: partner ? battleFigure(partner) : null };
  const onWater = (g: GameState) =>
    ['~', 'W'].includes(MAPS[g.player.map].rows[g.player.y]?.[g.player.x] ?? '');
  if (command.kind === 'walk' && onWater(before) !== onWater(after))
    return {
      ...base,
      effect: onWater(after) ? 'surfEnter' : 'surfExit',
      title: onWater(after) ? '乘浪出发' : '回到岸边',
      description: onWater(after) ? '伙伴与你一起，驶向新的水路。' : '收起渡水装备，继续沿岸探索。',
    };
  if (after.battle || command.kind !== 'interact' || before.dialogue) return null;
  const npc = facingNpc(before);
  if (!npc) return null;
  const f = before.progress.flags,
    next = after.progress.flags;
  if (npc.role === 'rock' && !f[npc.id] && next[npc.id])
    return {
      ...base,
      effect: 'rock',
      title: '碎岩开路',
      description: '碎石散开，前方的道路畅通了。',
    };
  if (npc.role === 'log' && !f.logMoved && next.logMoved)
    return hasFieldAccess(before, 'vineCut')
      ? {
          ...base,
          effect: 'cut',
          title: '剪藤开路',
          description: '剪开缠枝，与同伴一起把倒木移到路旁。',
        }
      : {
          ...base,
          effect: 'log',
          title: '合力移开倒木',
          description: '一、二——推！伙伴与同伴一起清出道路。',
        };
  if (
    (npc.role === 'switch' || npc.role === 'mechanism') &&
    Object.keys(next).some((flag) => !f[flag] && next[flag])
  )
    return {
      ...base,
      effect: 'gate',
      title: '机关启动',
      description: '机关缓缓归位，新的通道打开了。',
    };
  return null;
}

export function rewardPresentation(
  beforeBattle: GameState | null,
  after: GameState,
): JourneyEvent | null {
  if (!beforeBattle) return null;
  const badges = GYM_REWARDS.filter(
    (r) => !beforeBattle.progress.flags[r.leader] && after.progress.flags[r.leader],
  ).map((r) => r.badge);
  const champion =
    (!beforeBattle.progress.flags.champion && !!after.progress.flags.champion) ||
    (after.league?.wins ?? 0) > (beforeBattle.league?.wins ?? 0);
  if (!badges.length && !champion) return null;
  return {
    kind: 'reward',
    title: champion ? '新的联盟冠军' : `获得${badges.join('、')}`,
    description: champion
      ? '与你并肩走来的每一位伙伴，都将记入冠军名录。'
      : '这份证明，属于你和一路同行的伙伴。',
    badges,
    champion,
    party: presentationParty(after),
  };
}

export function journeyEventDuration(event: JourneyEvent) {
  return event.kind === 'evolution'
    ? 3600
    : event.kind === 'healing'
      ? 1700 + event.party.length * 130
      : event.kind === 'reward'
        ? event.champion
          ? 3800
          : 2600
        : 1500;
}
export function journeyEventTitle(event: JourneyEvent) {
  return event.kind === 'evolution'
    ? `${creatureName(event.from)}正在进化`
    : event.kind === 'healing'
      ? '让伙伴恢复精神'
      : event.title;
}
export const evolutionResultName = (event: Extract<JourneyEvent, { kind: 'evolution' }>) =>
  SPECIES[event.toId]!.name;
