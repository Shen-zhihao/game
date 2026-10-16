import { randomBytes } from 'node:crypto';
import { MOVES, SPECIES, TYPE_IDS, TYPE_CHART } from '../src/content/catalog';
import { MAPS, npcVisible, terrainPassable } from '../src/content/world';
import { worldNpcs } from '../src/game/exploration';
import { reduceGame, newGame } from '../src/game/engine';
import { BallId, Command, Direction, GameState, MapId } from '../src/game/model';
import { calculateDamage, statsFor } from '../src/game/rules';
import { roundPace } from '../src/game/combat';
import { availablePoints, recommendedAllocation } from '../src/game/growth';
import { validateGame } from '../src/persistence/snapshot';
import { canSurf } from '../src/game/fieldSkills';

export const testEntropy = (n: number): Uint8Array => new Uint8Array(randomBytes(n));
export function fixture(starter = 'creature_001', seed = 12345): GameState {
  const game = newGame('测试旅人', 0, starter, seed);
  game.dialogue = null;
  return game;
}
const directions: [Direction, number, number][] = [
  ['up', 0, -1],
  ['right', 1, 0],
  ['down', 0, 1],
  ['left', -1, 0],
];
export class PlayerBot {
  game: GameState;
  commands: Command[] = [];
  captureBall: BallId = 'ball';
  constructor(starter: string, seed: number, opening = false) {
    this.game = newGame('林间旅人', 0, opening ? null : starter, seed);
    this.dismiss();
  }
  act(command: Command) {
    this.commands.push(command);
    this.game = reduceGame(this.game, command);
    validateGame(this.game);
  }
  dismiss() {
    while (this.game.dialogue) this.act({ kind: 'nextDialogue' });
    this.allocate();
  }
  allocate() {
    if (
      this.game.dialogue ||
      this.game.battle ||
      this.game.pending.length ||
      (this.game.progress.flags.opening && !this.game.progress.flags.partnerReceived)
    )
      return;
    for (const id of this.game.party) {
      const c = this.game.creatures[id]!;
      if (availablePoints(c))
        this.act({ kind: 'allocate', creatureId: id, points: recommendedAllocation(c) });
    }
  }
  choices() {
    for (let i = 0; this.game.pending.length && !this.game.dialogue && i < 100; i++) {
      const p = this.game.pending[0]!;
      const c = this.game.creatures[p.creatureId]!;
      // Keep useful attacks instead of blindly overwriting the first slot at every level.
      const value = (ids: string[]) =>
        TYPE_IDS.reduce(
          (sum, target) =>
            sum +
            Math.max(
              0,
              ...ids.map((id) => {
                const m = MOVES[id]!,
                  s = statsFor(c);
                return (
                  (m.power *
                    (m.type && SPECIES[c.speciesId]!.types.includes(m.type) ? 1.5 : 1) *
                    (m.type ? TYPE_CHART[m.type][target] : 1) *
                    (m.category === 'physical' ? s.attack : s.specialAttack)) /
                  Math.max(s.attack, s.specialAttack)
                );
              }),
            ),
          0,
        ) /
          TYPE_IDS.length +
        (ids.some((id) => MOVES[id]!.effect?.heal) ? 30 : 0);
      let replace: number | null = null;
      if (p.kind === 'move') {
        let score = value(c.moves.map((m) => m.id));
        for (let j = 0; j < c.moves.length; j++) {
          const ids = c.moves.map((m, k) => (k === j ? p.moveId : m.id)),
            next = value(ids);
          if (next > score) {
            replace = j;
            score = next;
          }
        }
      }
      this.act(
        p.kind === 'evolution'
          ? { kind: 'evolve', creatureId: p.creatureId, toId: p.toId, accept: true }
          : {
              kind: 'learn',
              creatureId: p.creatureId,
              moveId: p.moveId,
              replace,
            },
      );
    }
    this.allocate();
  }
  battle(catchIt = false) {
    let budget = 400;
    while (this.game.battle && this.game.battle.phase !== 'ended' && budget-- > 0) {
      const b = this.game.battle;
      const c = this.game.creatures[b.playerId]!;
      const e = b.enemies[b.enemyIndex]!;
      if (b.phase === 'forcedSwitch') {
        const next = this.game.party.find((id) => this.game.creatures[id]!.hp > 0);
        if (!next) throw new Error('No living member');
        this.act({ kind: 'battle', action: { kind: 'switch', creatureId: next } });
        continue;
      }
      if (
        c.hp < statsFor(c).hp * 0.55 &&
        ((this.game.inventory.hyper_potion ?? 0) > 0 ||
          (this.game.inventory.super_potion ?? 0) > 0 ||
          (this.game.inventory.potion ?? 0) > 0)
      ) {
        const kind =
          statsFor(c).hp - c.hp >= 150 && (this.game.inventory.hyper_potion ?? 0) > 0
            ? 'hyper_potion'
            : statsFor(c).hp - c.hp >= 60 && (this.game.inventory.super_potion ?? 0) > 0
              ? 'super_potion'
              : (this.game.inventory.potion ?? 0) > 0
                ? 'potion'
                : (this.game.inventory.super_potion ?? 0) > 0
                  ? 'super_potion'
                  : 'hyper_potion';
        this.act({ kind: 'battle', action: { kind, creatureId: c.id } });
        continue;
      }
      if (catchIt && b.kind === 'wild') {
        if (!this.game.inventory[this.captureBall]) throw new Error('Need more capture balls');
        const sleep = c.moves.findIndex(
          (move) => move.pp > 0 && MOVES[move.id]!.effect?.status === 'sleep',
        );
        if (this.captureBall !== 'master_ball' && !b.tutorialCatch && !e.status && sleep >= 0) {
          this.act({ kind: 'battle', action: { kind: 'move', index: sleep } });
          continue;
        }
        let weak = -1;
        let damage = Infinity;
        const count = roundPace(c, e, b.playerStages, b.enemyStages, b.weather?.kind).playerActions;
        c.moves.forEach((m, i) => {
          const d =
            m.pp > 0
              ? calculateDamage(
                  c,
                  e,
                  m.id,
                  b.playerStages,
                  b.enemyStages,
                  1,
                  false,
                  b.weather?.kind,
                ).damage
              : 0;
          // Capturing must budget the whole combo, including possible double-damage criticals.
          if (d > 0 && d < damage && d * 2 * Math.min(count, m.pp) < e.hp * 0.8) {
            weak = i;
            damage = d;
          }
        });
        this.act({
          kind: 'battle',
          action:
            this.captureBall !== 'master_ball' &&
            !b.tutorialCatch &&
            e.hp > statsFor(e).hp * 0.45 &&
            weak >= 0
              ? { kind: 'move', index: weak }
              : { kind: 'ball', ballId: this.captureBall },
        });
        continue;
      }
      if (b.kind === 'wild' && b.event !== 'openingRescue' && !b.tutorialCatch) {
        this.act({ kind: 'battle', action: { kind: 'run' } });
        continue;
      }
      if (c.hp < statsFor(c).hp * 0.4 && this.game.inventory.potion! > 0) {
        this.act({ kind: 'battle', action: { kind: 'potion', creatureId: c.id } });
        continue;
      }
      let best = -1;
      let score = -1;
      c.moves.forEach((m, i) => {
        const damage =
          m.pp > 0
            ? calculateDamage(c, e, m.id, b.playerStages, b.enemyStages, 1, false, b.weather?.kind)
                .damage
            : -1;
        if (damage > score) {
          score = damage;
          best = i;
        }
      });
      if (score <= 0) {
        const usefulDamage = (member: typeof c, moveId: string) =>
          calculateDamage(
            member,
            e,
            moveId,
            b.playerStages,
            b.enemyStages,
            1,
            false,
            b.weather?.kind,
          ).damage;
        const canRestoreAttack = c.moves.some(
          (move) => move.pp < MOVES[move.id]!.pp && usefulDamage(c, move.id) > 0,
        );
        // Immunity does not consume PP. Restore only a useful depleted attack;
        // otherwise change partners instead of trying a full-PP medicine forever.
        if (canRestoreAttack && (this.game.inventory.ether ?? 0) > 0) {
          this.act({ kind: 'battle', action: { kind: 'ether', creatureId: c.id } });
          continue;
        }
        const next = this.game.party.find((id) => {
          const member = this.game.creatures[id]!;
          return (
            id !== c.id &&
            member.hp > 0 &&
            member.moves.some((move) => move.pp > 0 && usefulDamage(member, move.id) > 0)
          );
        });
        if (next) {
          this.act({ kind: 'battle', action: { kind: 'switch', creatureId: next } });
          continue;
        }
      }
      this.act({ kind: 'battle', action: { kind: 'move', index: best } });
    }
    if (budget <= 0) throw new Error('Battle did not terminate');
    const result = this.game.battle?.result;
    if (
      result === 'lose' &&
      this.game.battle?.kind === 'trainer' &&
      (this.game.battle?.event !== 'rival' || this.game.progress.flags.opening)
    )
      throw new Error(
        `Lost ${this.game.battle?.event} with ${SPECIES[this.game.creatures[this.game.party[0]!]!.speciesId]!.name}`,
      );
    const leagueEnding = this.game.battle?.event === 'leagueChampion';
    this.act({ kind: 'closeBattle' });
    if (leagueEnding)
      for (let i = 0; (this.game.dialogue || this.game.pending.length) && i < 20; i++) {
        this.dismiss();
        this.choices();
      }
    else this.choices();
    return result;
  }
  pathTo(x: number, y: number): Direction[] {
    const g = this.game;
    const map = MAPS[g.player.map];
    const queue: { x: number; y: number; cost: number; path: Direction[] }[] = [
      { x: g.player.x, y: g.player.y, cost: 0, path: [] },
    ];
    const visited = new Map([[`${g.player.x},${g.player.y}`, 0]]);
    while (queue.length) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift()!;
      if (current.x === x && current.y === y) return current.path;
      for (const [direction, dx, dy] of directions) {
        const xx = current.x + dx;
        const yy = current.y + dy;
        const key = `${xx},${yy}`;
        const cost = current.cost + (['g', '^'].includes(map.rows[yy]?.[xx] ?? '') ? 30 : 1);
        if (
          (visited.get(key) ?? Infinity) <= cost ||
          !terrainPassable(map.id, xx, yy, g.progress.flags) ||
          (['~', 'W'].includes(map.rows[yy]?.[xx] ?? '') && !canSurf(g)) ||
          worldNpcs(g).some((n) => n.x === xx && n.y === yy && npcVisible(g, n)) ||
          map.portals.some((p) => p.x === xx && p.y === yy && (xx !== x || yy !== y))
        )
          continue;
        visited.set(key, cost);
        queue.push({ x: xx, y: yy, cost, path: [...current.path, direction] });
      }
    }
    throw new Error(`No route in ${g.player.map}: ${g.player.x},${g.player.y} -> ${x},${y}`);
  }
  go(x: number, y: number) {
    const initialMap = this.game.player.map;
    const path = this.pathTo(x, y);
    for (const direction of path) {
      this.act({ kind: 'walk', direction });
      if (this.game.battle) this.battle();
      if (this.game.player.map !== initialMap) break;
    }
  }
  npc(id: string, catchIt = false) {
    const n = worldNpcs(this.game).find((n) => n.id === id)!;
    if (!n) throw new Error(`Missing NPC ${id} in ${this.game.player.map}`);
    let found = false;
    for (const [direction, dx, dy] of directions) {
      try {
        const path = this.pathTo(n.x - dx, n.y - dy);
        for (const d of path) {
          this.act({ kind: 'walk', direction: d });
          if (this.game.battle) this.battle();
        }
        this.act({ kind: 'walk', direction });
        found = true;
        break;
      } catch (e) {
        if (!(e instanceof Error) || !e.message.startsWith('No route')) throw e;
      }
    }
    if (!found) throw new Error(`Cannot reach ${id}`);
    this.act({ kind: 'interact' });
    this.dismiss();
    if (this.game.battle) this.battle(catchIt || id === 'catchGuide');
  }
  portal(to: MapId) {
    const portal = MAPS[this.game.player.map].portals.find((p) => p.map === to)!;
    this.go(portal.x, portal.y);
    this.dismiss();
    if (this.game.player.map !== to)
      throw new Error(`Portal to ${to} blocked: ${this.game.notice}`);
  }
  heal() {
    const healer = MAPS[this.game.player.map].npcs.find((n) => n.role === 'healer');
    if (!healer) throw new Error(`No healing centre in ${this.game.player.map}`);
    this.npc(healer.id);
  }
  hunt(speciesId: string) {
    this.go(4, 2);
    for (let i = 0; i < 1200; i++) {
      if (this.game.player.map !== 'route') {
        this.portal('route');
        this.go(4, 2);
      }
      this.act({ kind: 'walk', direction: this.game.player.x === 4 ? 'right' : 'left' });
      if (this.game.battle) {
        const desired = this.game.battle.enemies[0]!.speciesId === speciesId;
        this.battle(desired);
        if (
          desired &&
          this.game.party.some((id) => this.game.creatures[id]!.speciesId === speciesId)
        )
          return;
      }
    }
    throw new Error(`Did not encounter ${speciesId}`);
  }
}
export function playOpening(starter: string, seed = 789) {
  const bot = new PlayerBot(starter, seed, true);
  bot.npc('rival');
  bot.portal('route');
  bot.npc('professorBag');
  bot.act({ kind: 'chooseStarter', speciesId: starter });
  bot.battle();
  bot.dismiss();
  bot.portal('route');
  bot.npc('routeRival');
  bot.dismiss();
  return bot;
}
export function playChapter(starter: string, seed = 789) {
  const bot = playOpening(starter, seed);
  bot.heal();
  bot.portal('route');
  bot.npc('catchGuide');
  bot.portal('moss');
  bot.heal();
  bot.npc('shop');
  bot.npc('researcher');
  bot.act({ kind: 'buy', itemId: 'ball', quantity: 10 });
  bot.portal('route');
  bot.hunt('creature_040');
  bot.portal('moss');
  bot.heal();
  const bird = bot.game.party.find((id) => bot.game.creatures[id]!.speciesId === 'creature_040')!;
  bot.act({ kind: 'lead', creatureId: bird });
  bot.npc('mossTraining');
  bot.heal();
  bot.npc('mossTraining');
  bot.heal();
  bot.npc('mossTraining');
  bot.heal();
  for (let attempts = 0; bot.game.creatures[bird]!.level < 11 && attempts < 12; attempts++) {
    bot.npc('mossTraining');
    bot.heal();
  }
  bot.act({ kind: 'buy', itemId: 'potion', quantity: 5 });
  bot.portal('forest');
  bot.npc('clueOne');
  bot.npc('clueTwo');
  bot.npc('forestScout');
  bot.npc('forestLog');
  bot.npc('forestGuard');
  bot.npc('lostCreature');
  bot.portal('moss');
  bot.npc('researcher');
  bot.heal();
  bot.npc('gymGate');
  bot.npc('gymSwitchOne');
  bot.npc('gymScout');
  bot.npc('gymSwitchTwo');
  bot.npc('gymKeeper');
  bot.npc('leader');
  return bot;
}
