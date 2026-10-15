import { randomBytes } from 'node:crypto';
import { SPECIES } from '../src/content/catalog';
import { MAPS, npcVisible, terrainPassable } from '../src/content/world';
import { reduceGame, newGame } from '../src/game/engine';
import { Command, Direction, GameState, MapId } from '../src/game/model';
import { calculateDamage, statsFor } from '../src/game/rules';
import { validateGame } from '../src/persistence/snapshot';

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
  constructor(starter: string, seed: number) {
    this.game = newGame('林间旅人', 0, starter, seed);
    this.dismiss();
  }
  act(command: Command) {
    this.commands.push(command);
    this.game = reduceGame(this.game, command);
    validateGame(this.game);
  }
  dismiss() {
    while (this.game.dialogue) this.act({ kind: 'nextDialogue' });
  }
  choices() {
    for (let i = 0; this.game.pending.length && i < 100; i++) {
      const p = this.game.pending[0]!;
      const c = this.game.creatures[p.creatureId]!;
      const replace = c.moves.findIndex((m) => m.id === 'growl');
      this.act(
        p.kind === 'evolution'
          ? { kind: 'evolve', creatureId: p.creatureId, toId: p.toId, accept: true }
          : {
              kind: 'learn',
              creatureId: p.creatureId,
              moveId: p.moveId,
              replace: replace >= 0 ? replace : 0,
            },
      );
    }
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
      if (c.hp < statsFor(c).hp * 0.55 && this.game.inventory.potion! > 0) {
        this.act({ kind: 'battle', action: { kind: 'potion', creatureId: c.id } });
        continue;
      }
      if (catchIt && b.kind === 'wild') {
        if (!this.game.inventory.ball) throw new Error('Need more capture balls');
        let weak = -1;
        let damage = Infinity;
        c.moves.forEach((m, i) => {
          const d =
            m.pp > 0 ? calculateDamage(c, e, m.id, b.playerStages, b.enemyStages).damage : 0;
          if (d > 0 && d < damage && d < e.hp * 0.8) {
            weak = i;
            damage = d;
          }
        });
        this.act({
          kind: 'battle',
          action:
            !b.tutorialCatch && e.hp > statsFor(e).hp * 0.45 && weak >= 0
              ? { kind: 'move', index: weak }
              : { kind: 'ball' },
        });
        continue;
      }
      if (b.kind === 'wild' && !b.tutorialCatch) {
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
          m.pp > 0 ? calculateDamage(c, e, m.id, b.playerStages, b.enemyStages).damage : -1;
        if (damage > score) {
          score = damage;
          best = i;
        }
      });
      this.act({ kind: 'battle', action: { kind: 'move', index: best } });
    }
    if (budget <= 0) throw new Error('Battle did not terminate');
    const result = this.game.battle?.result;
    if (
      result === 'lose' &&
      this.game.battle?.kind === 'trainer' &&
      this.game.battle?.event !== 'rival'
    )
      throw new Error(
        `Lost ${this.game.battle?.event} with ${SPECIES[this.game.creatures[this.game.party[0]!]!.speciesId]!.name}`,
      );
    this.act({ kind: 'closeBattle' });
    this.choices();
    return result;
  }
  pathTo(x: number, y: number): Direction[] {
    const g = this.game;
    const map = MAPS[g.player.map];
    const queue: { x: number; y: number; path: Direction[] }[] = [
      { x: g.player.x, y: g.player.y, path: [] },
    ];
    const visited = new Set([`${g.player.x},${g.player.y}`]);
    while (queue.length) {
      const current = queue.shift()!;
      if (current.x === x && current.y === y) return current.path;
      for (const [direction, dx, dy] of directions) {
        const xx = current.x + dx;
        const yy = current.y + dy;
        const key = `${xx},${yy}`;
        if (
          visited.has(key) ||
          !terrainPassable(map.id, xx, yy, g.progress.flags) ||
          map.npcs.some((n) => n.x === xx && n.y === yy && npcVisible(g, n)) ||
          map.portals.some((p) => p.x === xx && p.y === yy && (xx !== x || yy !== y))
        )
          continue;
        visited.add(key);
        queue.push({ x: xx, y: yy, path: [...current.path, direction] });
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
  npc(id: string) {
    const map = MAPS[this.game.player.map];
    const n = map.npcs.find((n) => n.id === id)!;
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
    if (this.game.battle) this.battle(id === 'catchGuide');
  }
  portal(to: MapId) {
    const portal = MAPS[this.game.player.map].portals.find((p) => p.map === to)!;
    this.go(portal.x, portal.y);
    if (this.game.player.map !== to)
      throw new Error(`Portal to ${to} blocked: ${this.game.notice}`);
  }
  heal() {
    this.npc(this.game.player.map === 'dawn' ? 'dawnHeal' : 'mossHeal');
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
export function playChapter(starter: string, seed = 789) {
  const bot = new PlayerBot(starter, seed);
  bot.npc('rival');
  bot.heal();
  bot.portal('route');
  bot.npc('catchGuide');
  bot.portal('moss');
  bot.heal();
  bot.npc('shop');
  bot.npc('researcher');
  bot.act({ kind: 'buy', itemId: 'ball', quantity: 5 });
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
