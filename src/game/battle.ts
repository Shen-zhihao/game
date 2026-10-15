import { MOVES, SPECIES } from '../content/catalog';
import { TRAINERS } from '../content/world';
import { Battle, BattleAction, Creature, GameState, Stages, StoryEvent } from './model';
import {
  calculateDamage,
  captureChance,
  creatureName,
  effectiveStat,
  gainXp,
  makeCreature,
  nextId,
  random,
  statsFor,
  typeMultiplier,
} from './rules';

export function emptyStages(): Stages {
  return { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
}
export function healParty(state: GameState): void {
  for (const id of state.party) {
    const c = state.creatures[id]!;
    c.hp = statsFor(c).hp;
    c.status = null;
    c.sleepTurns = 0;
    c.moves.forEach((m) => {
      m.pp = MOVES[m.id]!.pp;
    });
  }
}
function aiMove(state: GameState): number {
  const b = state.battle!;
  const enemy = b.enemies[b.enemyIndex]!;
  const player = state.creatures[b.playerId]!;
  let best = -1;
  let bestScore = -1;
  enemy.moves.forEach((m, i) => {
    if (m.pp <= 0) return;
    const move = MOVES[m.id]!;
    let score = move.power
      ? calculateDamage(enemy, player, m.id, b.enemyStages, b.playerStages).damage
      : 3;
    if (move.effect?.heal) score = enemy.hp < statsFor(enemy).hp / 2 ? 18 : 0;
    if (move.effect?.status) score = player.status ? 0 : 7;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  return best;
}
export function startBattle(
  state: GameState,
  event: StoryEvent | null,
  wild?: { speciesId: string; level: number; tutorial?: boolean },
): void {
  const playerId = state.party.find((id) => state.creatures[id]!.hp > 0);
  if (!playerId) {
    healParty(state);
    state.notice = '伙伴需要休息，已恢复体力。';
    return;
  }
  const trainer = event && event in TRAINERS ? TRAINERS[event as keyof typeof TRAINERS] : null;
  const enemies = wild
    ? [makeCreature(state, wild.speciesId, wild.level)]
    : trainer!.team.map(([speciesId, level]) =>
        makeCreature(
          state,
          speciesId,
          event === 'training'
            ? Math.max(7, Math.min(15, state.creatures[playerId]!.level - 1))
            : level,
        ),
      );
  for (const c of enemies)
    if (!state.dex.seen.includes(c.speciesId)) state.dex.seen.push(c.speciesId);
  state.battle = {
    id: nextId(state, 'battle'),
    kind: wild ? 'wild' : 'trainer',
    event,
    name: wild ? '野生精灵' : trainer!.name,
    enemies,
    enemyIndex: 0,
    playerId,
    participants: [playerId],
    phase: 'choose',
    turn: 1,
    aiMove: 0,
    playerStages: emptyStages(),
    enemyStages: emptyStages(),
    logs: [
      wild ? `野生的${creatureName(enemies[0]!)}出现了！` : `${trainer!.name}发起了对战！`,
      '选择技能，或切换伙伴、使用道具。',
    ],
    result: null,
    runAttempts: 0,
    tutorialCatch: wild?.tutorial ?? false,
  };
  state.battle.aiMove = aiMove(state);
}
function finish(state: GameState, result: Battle['result']): void {
  const b = state.battle!;
  if (b.phase === 'ended') return;
  b.phase = 'ended';
  b.result = result;
  if (result === 'win' || result === 'caught') {
    const pool =
      b.enemies.reduce((sum, c) => sum + c.level * 32, 0) *
      (b.kind === 'trainer' ? 1.3 : 1) *
      (result === 'caught' ? 0.5 : 1);
    const participants = b.participants.filter((id) => state.creatures[id]!.hp > 0);
    for (const id of state.party) {
      const c = state.creatures[id]!;
      if (c.hp <= 0 || !participants.length) continue;
      const amount = Math.floor(
        participants.includes(id) ? pool / participants.length : pool * 0.25,
      );
      const levels = gainXp(state, c, amount);
      b.logs.push(`${creatureName(c)}获得 ${amount} 经验${levels ? `，升到 Lv.${c.level}` : ''}。`);
    }
  }
  if (result === 'win' && b.event && b.event in TRAINERS) {
    const key = b.event as keyof typeof TRAINERS;
    if (key === 'training' || !state.progress.flags[key]) {
      state.player.money += TRAINERS[key].reward;
      b.logs.push(`获得旅费 ${TRAINERS[key].reward}。`);
      if (key !== 'training') state.progress.flags[key] = true;
      if (key === 'rival') {
        healParty(state);
        b.logs.push('阿澈：旅途开始了！到一号路，我教你捕捉。');
      }
      if (key === 'leader') {
        state.progress.badges = 1;
        state.progress.chapter = 2;
        state.progress.flags.vineCut = true;
        state.inventory.candy = (state.inventory.candy ?? 0) + 2;
        b.logs.push(
          '获得枝叶徽章与剪藤工具！第一章「晨光与微芒」完成。',
          '后续道路将在下一章开放。你可以继续探索和培养伙伴。',
        );
      }
    }
  }
  if (result === 'lose') {
    if (b.event === 'rival') {
      state.progress.flags.rival = true;
      b.logs.push('阿澈：很好的练习！我会在一号路等你。');
    } else {
      const loss = Math.floor(state.player.money * 0.05);
      state.player.money -= loss;
      b.logs.push(`伙伴们疲惫了。回治疗所休息，支付旅费 ${loss}。`);
    }
    healParty(state);
    state.player.map = state.player.healMap;
    state.player.x = 6;
    state.player.y = state.player.healMap === 'dawn' ? 12 : 5;
    state.player.facing = 'left';
  }
  if (result === 'caught' && b.event === 'catchTutorial') state.progress.flags.catchTutorial = true;
  state.encounterCooldown = 7;
}
function immobilized(state: GameState, creature: Creature): boolean {
  if (creature.status === 'sleep') {
    if (creature.sleepTurns > 0) {
      creature.sleepTurns -= 1;
      state.battle!.logs.push(`${creatureName(creature)}还在睡觉。`);
      return true;
    }
    creature.status = null;
    state.battle!.logs.push(`${creatureName(creature)}醒来了！`);
  }
  if (creature.status === 'paralysis' && random(state) < 0.25) {
    state.battle!.logs.push(`${creatureName(creature)}麻痹了，没能行动。`);
    return true;
  }
  return false;
}
function attack(state: GameState, player: boolean, index: number): void {
  const b = state.battle!;
  const attacker = player ? state.creatures[b.playerId]! : b.enemies[b.enemyIndex]!;
  const defender = player ? b.enemies[b.enemyIndex]! : state.creatures[b.playerId]!;
  if (attacker.hp <= 0 || defender.hp <= 0) return;
  const hasMoves = attacker.moves.some((m) => m.pp > 0);
  const slot = hasMoves ? attacker.moves[index] : null;
  if (hasMoves && (!slot || slot.pp <= 0)) return;
  if (immobilized(state, attacker)) return;
  const move = MOVES[slot?.id ?? 'struggle']!;
  if (slot) slot.pp -= 1;
  b.logs.push(`${creatureName(attacker)}使用了${move.name}！`);
  if (random(state) * 100 >= move.accuracy) {
    b.logs.push('没有命中。');
    return;
  }
  const multiplier = typeMultiplier(move.type, SPECIES[defender.speciesId]!.types);
  if (multiplier === 0 && (move.power || move.effect?.target !== 'self')) {
    b.logs.push('对方免疫这个属性。');
    return;
  }
  if (move.power) {
    const critical = random(state) < 1 / 16;
    const { damage } = calculateDamage(
      attacker,
      defender,
      move.id,
      player ? b.playerStages : b.enemyStages,
      player ? b.enemyStages : b.playerStages,
      0.9 + random(state) * 0.1,
      critical,
    );
    defender.hp = Math.max(0, defender.hp - damage);
    b.logs.push(
      `造成 ${damage} 点伤害${multiplier > 1 ? '，效果绝佳' : multiplier < 1 ? '，效果不佳' : ''}${critical ? '，命中要害' : ''}。`,
    );
    if (move.id === 'struggle')
      attacker.hp = Math.max(0, attacker.hp - Math.max(1, Math.floor(statsFor(attacker).hp / 4)));
  }
  const effect = move.effect;
  if (effect?.heal) {
    const old = attacker.hp;
    attacker.hp = Math.min(
      statsFor(attacker).hp,
      attacker.hp + Math.floor(statsFor(attacker).hp * effect.heal),
    );
    b.logs.push(`恢复 ${attacker.hp - old} 点体力。`);
  }
  if (effect?.stage) {
    const stages =
      effect.target === 'self'
        ? player
          ? b.playerStages
          : b.enemyStages
        : player
          ? b.enemyStages
          : b.playerStages;
    stages[effect.stage] = Math.max(-6, Math.min(6, stages[effect.stage] + (effect.amount ?? 0)));
    b.logs.push(effect.target === 'self' ? '自身能力提升了。' : '对方能力降低了。');
  }
  if (
    effect?.status &&
    !defender.status &&
    defender.hp > 0 &&
    random(state) < (effect.chance ?? 1)
  ) {
    const types = SPECIES[defender.speciesId]!.types;
    const immune =
      (effect.status === 'burn' && types.includes('fire')) ||
      (effect.status === 'poison' && (types.includes('poison') || types.includes('steel'))) ||
      (effect.status === 'paralysis' && types.includes('electric'));
    if (!immune) {
      defender.status = effect.status;
      defender.sleepTurns = effect.status === 'sleep' ? 1 + Math.floor(random(state) * 3) : 0;
      b.logs.push(`${creatureName(defender)}陷入异常状态。`);
    }
  }
}
function resolveFaints(state: GameState): boolean {
  const b = state.battle!;
  const enemy = b.enemies[b.enemyIndex]!;
  if (!state.party.some((id) => state.creatures[id]!.hp > 0)) {
    finish(state, 'lose');
    return true;
  }
  if (enemy.hp <= 0) {
    b.logs.push(`${creatureName(enemy)}失去了战斗能力。`);
    if (b.enemyIndex === b.enemies.length - 1) {
      finish(state, 'win');
      return true;
    }
    b.enemyIndex += 1;
    b.enemyStages = emptyStages();
    b.logs.push(`${b.name}派出了${creatureName(b.enemies[b.enemyIndex]!)}。`);
  }
  if (state.creatures[b.playerId]!.hp <= 0) {
    b.phase = 'forcedSwitch';
    b.logs.push('请选择仍能战斗的伙伴。');
    return true;
  }
  return false;
}
export function battleActionReason(state: GameState, action: BattleAction): string | null {
  const b = state.battle;
  if (!b || b.phase === 'ended') return '这场对战已经结束。';
  if (b.phase === 'forcedSwitch' && action.kind !== 'switch') return '请先选择仍能战斗的伙伴。';
  if (action.kind === 'switch') {
    const c = state.creatures[action.creatureId];
    if (!c || !state.party.includes(c.id)) return '这只精灵不在队伍中。';
    if (c.hp <= 0) return '这只精灵已失去战斗能力。';
    if (c.id === b.playerId) return '这只精灵已经在场上了。';
  }
  if (action.kind === 'potion' || action.kind === 'antidote') {
    const c = state.creatures[action.creatureId];
    if (!c || !state.party.includes(c.id)) return '请选择队伍中的精灵。';
    if (!(state.inventory[action.kind]! > 0)) return '这个道具已经用完了。';
    if (c.hp <= 0) return '这个道具不能让昏厥的精灵恢复。';
    if (action.kind === 'potion' && c.hp >= statsFor(c).hp) return '体力已满，不需要使用草露药。';
    if (action.kind === 'antidote' && !c.status) return '没有异常状态，不需要使用清醒露。';
  }
  if (action.kind === 'ball') {
    if (b.kind !== 'wild') return '不能捕捉训练师的伙伴。';
    if (state.party.length >= 6 && state.box.length >= 360)
      return '队伍和仓库已满，不会消耗星纹球。';
    if (!(state.inventory.ball! > 0)) return '没有星纹球了，去补给店补充吧。';
  }
  if (action.kind === 'run' && b.kind !== 'wild') return '训练师对战不能逃跑。';
  if (action.kind === 'move') {
    const c = state.creatures[b.playerId]!;
    if (c.moves.some((m) => m.pp > 0) && (!c.moves[action.index] || c.moves[action.index]!.pp <= 0))
      return '技能 PP 已耗尽。';
  }
  return null;
}
export function battleAction(state: GameState, action: BattleAction): void {
  const b = state.battle;
  if (!b || b.phase === 'ended') return;
  const reason = battleActionReason(state, action);
  if (reason) {
    b.logs = [reason];
    return;
  }
  if (action.kind === 'switch') {
    const c = state.creatures[action.creatureId]!;
    const forced = b.phase === 'forcedSwitch';
    const previous = creatureName(state.creatures[b.playerId]!);
    b.logs = forced
      ? [`上吧，${creatureName(c)}！`]
      : [`${previous}，回来吧！`, `上吧，${creatureName(c)}！`];
    b.playerId = c.id;
    b.playerStages = emptyStages();
    if (!b.participants.includes(c.id)) b.participants.push(c.id);
    if (forced) {
      b.phase = 'choose';
      b.aiMove = aiMove(state);
      return;
    }
  }
  const player = state.creatures[b.playerId]!;
  const enemy = b.enemies[b.enemyIndex]!;
  if (action.kind !== 'switch') b.logs = [];
  if (action.kind === 'ball') {
    state.inventory.ball! -= 1;
    if (b.tutorialCatch || random(state) < captureChance(enemy)) {
      state.creatures[enemy.id] = enemy;
      (state.party.length < 6 ? state.party : state.box).push(enemy.id);
      if (!state.dex.caught.includes(enemy.speciesId)) state.dex.caught.push(enemy.speciesId);
      b.logs.push(
        `捕捉成功！${creatureName(enemy)}加入${state.party.includes(enemy.id) ? '队伍' : '仓库'}。`,
      );
      if (!state.progress.flags.firstCatch) {
        state.progress.flags.firstCatch = true;
        state.inventory.candy = (state.inventory.candy ?? 0) + 1;
        b.logs.push('首次捕捉奖励：成长果 ×1。');
      }
      finish(state, 'caught');
      return;
    }
    b.logs.push('星纹球摇晃了几下……精灵挣脱了！');
  }
  if (action.kind === 'run') {
    b.runAttempts += 1;
    if (
      b.runAttempts >= 3 ||
      random(state) < Math.min(0.9, 0.4 + (statsFor(player).speed / statsFor(enemy).speed) * 0.15)
    ) {
      b.logs.push('成功脱离了战斗。');
      finish(state, 'escaped');
      return;
    }
    b.logs.push('没能逃脱！');
  }
  if (action.kind === 'potion' || action.kind === 'antidote') {
    const target = state.creatures[action.creatureId]!;
    if (action.kind === 'potion') {
      const before = target.hp;
      target.hp = Math.min(statsFor(target).hp, target.hp + 30);
      b.logs.push(`对${creatureName(target)}使用了草露药，恢复 ${target.hp - before} 点 HP。`);
    } else {
      target.status = null;
      target.sleepTurns = 0;
      b.logs.push(`对${creatureName(target)}使用了清醒露，异常状态解除了。`);
    }
    state.inventory[action.kind]! -= 1;
  }
  const plannedEnemy = b.aiMove;
  if (action.kind === 'move') {
    const playerMove =
      MOVES[player.moves.some((m) => m.pp > 0) ? player.moves[action.index]!.id : 'struggle']!;
    const enemyMove = MOVES[enemy.moves[plannedEnemy]?.id ?? 'struggle']!;
    const ps = effectiveStat(player, 'speed', b.playerStages);
    const es = effectiveStat(enemy, 'speed', b.enemyStages);
    const first =
      playerMove.priority !== enemyMove.priority
        ? playerMove.priority > enemyMove.priority
        : ps !== es
          ? ps > es
          : random(state) < 0.5;
    attack(state, first, first ? action.index : plannedEnemy);
    // A faint always cancels the opposing queued action, including simultaneous recoil.
    if (player.hp > 0 && enemy.hp > 0) attack(state, !first, first ? plannedEnemy : action.index);
  } else attack(state, false, plannedEnemy);
  for (const c of [player, enemy]) {
    if (c.hp > 0 && (c.status === 'poison' || c.status === 'burn')) {
      const loss = Math.max(1, Math.floor(statsFor(c).hp / (c.status === 'poison' ? 8 : 16)));
      c.hp = Math.max(0, c.hp - loss);
      b.logs.push(`${creatureName(c)}受到 ${loss} 点异常伤害。`);
    }
  }
  const stopped = resolveFaints(state);
  b.turn += 1;
  if (!stopped) b.phase = 'choose';
  if (state.battle?.result === null) b.aiMove = aiMove(state);
}
