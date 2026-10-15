import { ITEMS, learnset, MOVES, SPECIES, STARTERS } from '../content/catalog';
import { MAPS, npcVisible, terrainPassable } from '../content/world';
import { battleAction, healParty, startBattle } from './battle';
import { Command, GameState, MapId, StoryEvent } from './model';
import {
  canEvolve,
  changeMaxHp,
  creatureName,
  gainXp,
  learnAvailable,
  makeCreature,
  random,
  record,
  statsFor,
  xpAt,
} from './rules';

export function newGame(name: string, avatar: number, starterId: string, seed: number): GameState {
  if (!STARTERS.includes(starterId)) throw new Error('请选择一个初始伙伴');
  const state: GameState = {
    player: {
      name: name.trim().slice(0, 12) || '旅人',
      avatar,
      money: 1000,
      map: 'dawn',
      x: 8,
      y: 7,
      facing: 'up',
      healMap: 'dawn',
    },
    progress: { chapter: 1, badges: 0, flags: {} },
    creatures: {},
    party: [],
    box: [],
    inventory: { ball: 10, potion: 5, antidote: 2, candy: 0 },
    dex: { seen: [], caught: [] },
    rng: seed >>> 0 || 1,
    sequence: 0,
    steps: 0,
    encounterCooldown: 8,
    playTimeSeconds: 0,
    battle: null,
    pending: [],
    dialogue: null,
    notice: '冒险已准备就绪。',
  };
  const starter = makeCreature(state, starterId, 5);
  state.creatures[starter.id] = starter;
  state.party.push(starter.id);
  state.dex.seen.push(starterId);
  state.dex.caught.push(starterId);
  talk(state, '岚博士', [
    `${state.player.name}，欢迎来到星苔地区。${creatureName(starter)}已经选择与你同行。`,
    '用左侧方向键行走，靠近人物后按 A 交谈。也可以轻点相邻地格移动。',
    '阿澈在镇子东侧等你，先来一场友好的练习吧。菜单里可以查看任务、保存和传档。',
  ]);
  return state;
}
export function talk(
  state: GameState,
  speaker: string,
  lines: string[],
  after: StoryEvent | null = null,
): void {
  state.dialogue = { speaker, lines, index: 0, after };
}
function storyEvent(state: GameState, event: StoryEvent): void {
  if (event === 'rescue') return;
  if (event === 'catchTutorial') {
    startBattle(state, event, { speciesId: 'creature_037', level: 4, tutorial: true });
    return;
  }
  startBattle(state, event);
}
function interact(state: GameState): void {
  const {
    player,
    progress: { flags },
  } = state;
  const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[player.facing]!;
  const x = player.x + delta[0]!;
  const y = player.y + delta[1]!;
  const npc = MAPS[player.map].npcs.find((n) => n.x === x && n.y === y && npcVisible(state, n));
  if (!npc) {
    state.notice = '靠近人物、石碑或发光物，朝向它再按 A。';
    return;
  }
  switch (npc.role) {
    case 'professor':
      talk(state, npc.name, [
        '沿着东侧道路前往苔丘镇吧。不同属性会互相克制，伙伴们的力量需要一起发挥。',
        '捕捉球、治疗所和训练场都能反复补给，不必担心失败。',
      ]);
      break;
    case 'rival':
      talk(
        state,
        npc.name,
        flags.rival
          ? ['一号路见！把野生精灵的体力降低，再使用星纹球。']
          : ['伙伴看起来精神不错！来一场练习对战吧。即使输了，我也会帮你恢复。'],
        flags.rival ? null : 'rival',
      );
      break;
    case 'healer':
      healParty(state);
      player.healMap = player.map === 'dawn' ? 'dawn' : 'moss';
      talk(state, npc.name, [
        '伙伴们的 HP、PP 和异常状态已全部恢复。旅途顺利！',
        '打开菜单可管理队伍与仓库、回忆已掌握的技能，或进行存档互传。',
      ]);
      break;
    case 'shop':
      talk(state, npc.name, [
        '补给店已开张！打开「背包」可以购买星纹球和恢复品。免费治疗就在镇子西北侧。',
      ]);
      flags.shop = true;
      break;
    case 'quest':
      if (npc.id === 'catchGuide') {
        if (!flags.catchTutorial) {
          if (state.inventory.ball! < 1) state.inventory.ball = 3;
          talk(
            state,
            npc.name,
            [
              '看，草丛里有绒团鼠！打开「背包」→「精灵球」，选择星纹球并投出。这次练习我会帮你稳住星纹球。',
            ],
            'catchTutorial',
          );
        } else
          talk(state, npc.name, ['捕捉时降低 HP 或施加异常状态会更容易成功。前往东边的苔丘镇吧！']);
      } else if (!flags.quest) {
        if (!flags.catchTutorial) {
          talk(state, npc.name, [
            '欢迎来到苔丘镇。先回一号路，让阿澈带你学习捕捉，再来帮我调查吧。',
          ]);
          break;
        }
        flags.quest = true;
        talk(state, npc.name, [
          '我的研究伙伴萤灯蛾在北面的苔影森林失踪了。请调查断枝和微光脚印。',
          '采集员青弥能帮你移开倒木。找到伙伴后回来找我，道馆的榆岚也会等你的消息。',
          '榆岚擅长草系。一号路的风翎雀是不错的帮手；先在镇南训练场练习，出发前来治疗所休息。',
        ]);
      } else if (flags.rescued && !flags.questReward) {
        flags.questReward = true;
        player.money += 500;
        state.inventory.candy! += 2;
        state.inventory.ball! += 5;
        talk(state, npc.name, [
          '你救回了萤灯蛾！这些扭曲的晶矿……定序社又在研究精灵的力量。',
          '获得旅费 500、成长果 ×2、星纹球 ×5。东侧道馆已开放，去挑战榆岚吧！',
        ]);
      } else
        talk(state, npc.name, [
          flags.questReward
            ? '榆岚在东侧道馆等你。森林的朋友们会记住你的善意。'
            : '森林里有两处线索。调查后请采集员帮忙，再从南面推动倒木。',
        ]);
      break;
    case 'sign':
      talk(state, npc.name, [
        player.map === 'forest'
          ? '林间调查：折断的枝条在西南方，闪光的脚印在中部东侧。采集员站在西侧草丛。'
          : '东行：晨光一号路 → 苔丘镇。方向键行走，A 调查；菜单可随时查看目标。',
      ]);
      break;
    case 'trainer':
      if (npc.event === 'forestGuard' && !flags.logMoved) {
        talk(state, npc.name, ['先移开倒木，调查通往深处的路径。']);
        break;
      }
      talk(
        state,
        npc.name,
        [
          npc.event === 'training'
            ? '训练场随时欢迎你。伙伴的等级越高，我也会派出更强的对手！'
            : npc.event === 'forestScout'
              ? '我来帮你！先让我看看你和伙伴是否足以面对森林深处的危险。'
              : '让我们用精灵的力量来对话吧！',
        ],
        npc.event!,
      );
      break;
    case 'clue':
      if (!flags.quest) {
        talk(state, '调查', ['有精灵经过的痕迹。先向苔丘镇的研究员了解情况。']);
        break;
      }
      flags[npc.id] = true;
      talk(state, '调查', [
        npc.id === 'clueOne'
          ? '新折断的枝条上留着金色鳞粉。萤灯蛾确实往森林深处去了。'
          : '脚印旁的晶矿在微微发热。有人曾把它摆成奇怪的阵列。',
        '线索已记录到任务日志。',
      ]);
      break;
    case 'log':
      if (!flags.clueOne || !flags.clueTwo || !flags.forestScout) {
        talk(state, '倒木', ['树干沉重。先调查两处线索，并请采集员青弥协助。']);
        break;
      }
      if (player.facing !== 'up') {
        talk(state, '倒木', ['从南侧朝北推，树干就能滚到凹地里。']);
        break;
      }
      flags.logMoved = true;
      talk(state, '采集员青弥', ['一、二——推！树干滚进凹地，北面的路畅通了。']);
      break;
    case 'rescue':
      if (!flags.forestGuard) {
        talk(state, '调查', ['附近的定序社调查员还在阻挠，先击退他。']);
        break;
      }
      flags.rescued = true;
      state.inventory.potion! += 2;
      talk(state, '受困的萤灯蛾', [
        '你小心拆开缠住翅膀的晶丝。萤灯蛾发出温暖的光，飞回苔丘镇。',
        '获得草露药 ×2。回去向研究员穗禾报告吧。',
      ]);
      break;
    case 'chest':
      if (flags[npc.id]) {
        talk(state, '旅行补给', ['已经取过这里的补给了。']);
        break;
      }
      flags[npc.id] = true;
      state.inventory.ball! += 3;
      state.inventory.potion! += 2;
      talk(state, '旅行补给', ['获得星纹球 ×3、草露药 ×2。']);
      break;
    case 'gate':
      if (!flags.questReward) {
        talk(state, '道馆入口', ['榆岚正在协助森林救援。先帮助穗禾，完成救援后向她报告。']);
        break;
      }
      player.map = 'gym';
      player.x = 11;
      player.y = 14;
      player.facing = 'up';
      state.notice = '触碰晨光石碑，打开第一道藤门。';
      break;
    case 'switch':
      if (npc.id === 'gymSwitchTwo' && !flags.gymScout) {
        talk(state, npc.name, ['先完成学徒芽芽的考验，雨露才会回应。']);
        break;
      }
      flags[npc.id] = true;
      talk(state, npc.name, ['掌心触到温暖的石面，藤蔓缓缓退开。通道打开了！']);
      break;
    case 'leader':
      if (state.progress.badges) {
        talk(state, npc.name, ['枝叶徽章属于你与每一位伙伴。下一条路等待着你，先享受这片森林吧。']);
        break;
      }
      if (!flags.gymScout || !flags.gymKeeper) {
        talk(state, npc.name, ['先完成两位学徒的考验，学习森林的呼吸。']);
        break;
      }
      talk(
        state,
        npc.name,
        ['你让微弱的光重新飞起来。现在，让我见识你和伙伴共同成长的力量！'],
        'leader',
      );
      break;
  }
}
function walk(state: GameState, direction: GameState['player']['facing']): void {
  const p = state.player;
  p.facing = direction;
  const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction]!;
  const x = p.x + dx!;
  const y = p.y + dy!;
  if (!terrainPassable(p.map, x, y, state.progress.flags)) return;
  const map = MAPS[p.map];
  if (map.npcs.some((n) => n.x === x && n.y === y && npcVisible(state, n))) return;
  const portal = map.portals.find((v) => v.x === x && v.y === y);
  if (portal) {
    if (portal.flag && !state.progress.flags[portal.flag]) {
      state.notice = portal.blockedText!;
      return;
    }
    p.map = portal.map;
    p.x = portal.toX;
    p.y = portal.toY;
    state.notice = `到达${MAPS[p.map].name}`;
    state.encounterCooldown = 5;
    return;
  }
  p.x = x;
  p.y = y;
  state.steps += 1;
  if (state.encounterCooldown > 0) {
    state.encounterCooldown -= 1;
    return;
  }
  if (
    map.rows[y]?.[x] === 'g' &&
    map.encounters.length &&
    state.progress.flags.rival &&
    random(state) < 0.15
  ) {
    let choice = random(state) * map.encounters.reduce((sum, e) => sum + e.weight, 0);
    const encounter = map.encounters.find((e) => (choice -= e.weight) < 0) ?? map.encounters[0]!;
    startBattle(state, null, {
      speciesId: encounter.speciesId,
      level: encounter.min + Math.floor(random(state) * (encounter.max - encounter.min + 1)),
    });
  }
}
// A command always produces a complete stable checkpoint before presentation.
export function reduceGame(current: GameState, command: Command): GameState {
  const state: GameState = JSON.parse(JSON.stringify(current));
  if (command.kind === 'tick') {
    state.playTimeSeconds += Math.max(0, Math.min(10, Math.floor(command.seconds)));
    return state;
  }
  if (command.kind === 'nextDialogue') {
    if (!state.dialogue) return current;
    const d = state.dialogue;
    if (d.index < d.lines.length - 1) d.index += 1;
    else {
      state.dialogue = null;
      if (d.after) storyEvent(state, d.after);
    }
    return state;
  }
  if (state.dialogue) return current;
  if (command.kind === 'closeBattle') {
    if (state.battle?.phase === 'ended') state.battle = null;
    return state;
  }
  if (command.kind === 'battle') {
    battleAction(state, command.action);
    return state;
  }
  if (state.battle) return current;
  if (command.kind === 'evolve') {
    const c = state.creatures[command.creatureId];
    state.pending = state.pending.filter(
      (p) =>
        !(p.kind === 'evolution' && p.creatureId === command.creatureId && p.toId === command.toId),
    );
    if (!c || !command.accept || !canEvolve(c, command.toId, state.inventory)) return state;
    const edge = SPECIES[c.speciesId]!.evolutions.find((e) => e.toId === command.toId)!;
    const oldMax = statsFor(c).hp;
    const oldName = creatureName(c);
    c.speciesId = command.toId;
    changeMaxHp(c, oldMax);
    if (edge.condition.kind === 'item' && edge.condition.consumeItem)
      state.inventory[edge.condition.itemId]! -= 1;
    record(c, 'evolved', `${oldName} → ${SPECIES[c.speciesId]!.name}`);
    if (!state.dex.seen.includes(c.speciesId)) state.dex.seen.push(c.speciesId);
    if (!state.dex.caught.includes(c.speciesId)) state.dex.caught.push(c.speciesId);
    learnAvailable(state, c, 0);
    state.notice = `${oldName}进化成${creatureName(c)}！`;
    return state;
  }
  if (command.kind === 'learn') {
    const pending = state.pending.find(
      (p) =>
        p.kind === 'move' && p.creatureId === command.creatureId && p.moveId === command.moveId,
    );
    if (!pending) return current;
    const c = state.creatures[command.creatureId]!;
    if (command.replace !== null && command.replace >= 0 && command.replace < c.moves.length) {
      c.moves[command.replace] = { id: command.moveId, pp: MOVES[command.moveId]!.pp };
      record(c, 'learned', `学会${MOVES[command.moveId]!.name}`);
    }
    state.pending = state.pending.filter((p) => p !== pending);
    return state;
  }
  if (state.pending.length) return current;
  switch (command.kind) {
    case 'walk':
      walk(state, command.direction);
      break;
    case 'interact':
      interact(state);
      break;
    case 'useItem': {
      const c = state.creatures[command.creatureId];
      if (!c || !(state.inventory[command.itemId]! > 0)) return current;
      let used = false;
      if (command.itemId === 'potion' && c.hp > 0 && c.hp < statsFor(c).hp) {
        c.hp = Math.min(statsFor(c).hp, c.hp + 30);
        used = true;
      }
      if (command.itemId === 'antidote' && c.status) {
        c.status = null;
        c.sleepTurns = 0;
        used = true;
      }
      if (command.itemId === 'candy' && c.level < 100) {
        gainXp(state, c, xpAt(c.level + 1, SPECIES[c.speciesId]!.experienceCurve) - c.experience);
        used = true;
      }
      if (used) {
        state.inventory[command.itemId]! -= 1;
        state.notice = `${creatureName(c)}使用了${ITEMS[command.itemId]!.name}。`;
      } else state.notice = '现在使用没有效果，道具已保留。';
      break;
    }
    case 'buy': {
      const item = ITEMS[command.itemId];
      const qty = command.quantity;
      if (
        state.player.map !== 'moss' ||
        !state.progress.flags.shop ||
        !item ||
        !Number.isSafeInteger(qty) ||
        qty < 1 ||
        qty > 99 ||
        (state.inventory[command.itemId] ?? 0) + qty > 999 ||
        state.player.money < item.price * qty
      ) {
        state.notice = '无法购买，请检查地点、旅费或道具数量。';
        break;
      }
      state.player.money -= item.price * qty;
      state.inventory[command.itemId] = (state.inventory[command.itemId] ?? 0) + qty;
      state.notice = `购买${item.name} ×${qty}。`;
      break;
    }
    case 'lead': {
      const index = state.party.indexOf(command.creatureId);
      if (index >= 0) {
        state.party.splice(index, 1);
        state.party.unshift(command.creatureId);
        state.notice = '已设为队伍首位。';
      }
      break;
    }
    case 'box': {
      if (state.player.map !== 'dawn' && state.player.map !== 'moss') {
        state.notice = '仓库只能在城镇使用。';
        break;
      }
      const from = command.withdraw ? state.box : state.party;
      const to = command.withdraw ? state.party : state.box;
      if (
        from.includes(command.creatureId) &&
        to.length < (command.withdraw ? 6 : 360) &&
        (command.withdraw ||
          (from.length > 1 &&
            from.some((id) => id !== command.creatureId && state.creatures[id]!.hp > 0)))
      ) {
        from.splice(from.indexOf(command.creatureId), 1);
        to.push(command.creatureId);
        state.notice = command.withdraw ? '伙伴回到队伍。' : '伙伴已在仓库休息。';
      } else state.notice = '请为队伍保留一只可以战斗的伙伴，并检查容量。';
      break;
    }
    case 'recall': {
      const c = state.creatures[command.creatureId];
      if (
        c &&
        ['dawn', 'moss'].includes(state.player.map) &&
        command.replace >= 0 &&
        command.replace < c.moves.length &&
        learnset(c.speciesId).some((m) => m.moveId === command.moveId && m.level <= c.level) &&
        !c.moves.some((m) => m.id === command.moveId)
      ) {
        c.moves[command.replace] = { id: command.moveId, pp: MOVES[command.moveId]!.pp };
        record(c, 'learned', `回忆${MOVES[command.moveId]!.name}`);
        state.notice = '技能回忆完成。';
      }
      break;
    }
  }
  return state;
}
export function safeForTransfer(state: GameState | null): boolean {
  return !state || (!state.battle && !state.dialogue && state.pending.length === 0);
}
export function safePosition(
  map: MapId,
  x: number,
  y: number,
  flags: Record<string, boolean>,
): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && terrainPassable(map, x, y, flags);
}
