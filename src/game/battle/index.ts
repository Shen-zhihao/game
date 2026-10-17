import { coastEncounter } from '../coastStory';
import { adventureEncounter } from '../../content/adventure';
import { finishLeagueBattle } from '../league';
import { rememberRecoveryTowns, returnToNearestCenter } from '../recovery';
import { canLearnMove, ITEMS, MOVES, SPECIES, STARTERS } from '../../content/catalog';
import { battleScene } from '../battleVisuals';
import { emptyStats, ensureTraining } from '../growth';
import { BALLS, consumeMasterBall, resolveCapture } from '../capture';
import { WEATHER, weatherAt } from '../environment';
import { addBattleMoney, distributeExperience, ensureRewards, settleKnockout } from '../rewards';
import { isSupply, supplyReason, applySupply } from '../items';
import { endHeldTurn, triggerHeldItem } from '../heldItems';
import {
  badgeCount,
  GYM_TRAINERS,
  GYM_REWARDS,
  PRACTICE_TRAINERS,
  TRAINERS,
  MAPS,
  npcDefeated,
  npcVictoryFlag,
} from '../../content/world';
import {
  Battle,
  BattleAction,
  BattleMoveEvent,
  Creature,
  GameState,
  Stages,
  StoryEvent,
} from '../model';
import {
  chanceLabel,
  COMBAT_STAGE_NAMES,
  criticalChance,
  hitChance,
  roundPace,
  stageLimit,
} from '../combat';
import {
  calculateDamage,
  abilityFor,
  captureChance,
  creatureName,
  makeCreature,
  nextId,
  random,
  statsFor,
  typeMultiplier,
} from '../rules';

export function emptyStages(): Stages {
  return {
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
    accuracy: 0,
    evasion: 0,
    critical: 0,
    criticalGuard: 0,
  };
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
      ? calculateDamage(
          enemy,
          player,
          m.id,
          b.enemyStages,
          b.playerStages,
          1,
          false,
          b.weather?.kind,
        ).damage *
        hitChance(m.id, b.enemyStages, b.playerStages, b.weather?.kind, enemy) *
        (1 + criticalChance(m.id, b.enemyStages, b.playerStages, enemy))
      : 3;
    if (move.weather) score = move.weather === b.weather?.kind ? 0 : 5;
    if (move.effect?.heal) score = enemy.hp < statsFor(enemy).hp / 2 ? 18 : 0;
    if (move.effect?.status) score = player.status ? 0 : 7;
    if (move.effect?.status && abilityFor(player).immuneStatus === move.effect.status) score = 0;
    if (move.effect?.stage) {
      const { stage, amount = 0, target } = move.effect;
      const current = (target === 'self' ? b.enemyStages : b.playerStages)[stage] ?? 0;
      const limit = stageLimit(stage);
      score = Math.max(-limit, Math.min(limit, current + amount)) === current ? 0 : 4;
    }
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
  rememberRecoveryTowns(state);
  const npc = event ? MAPS[state.player.map].npcs.find((n) => n.event === event) : undefined;
  if (
    !wild &&
    event &&
    (npc
      ? npcDefeated(state.progress.flags, npc)
      : !PRACTICE_TRAINERS.has(event) && state.progress.flags[event])
  ) {
    state.notice = '这场对战已经获胜，再去和对方聊聊旅途见闻吧。';
    return;
  }
  const playerId = state.party.find((id) => state.creatures[id]!.hp > 0);
  if (!playerId) {
    healParty(state);
    state.notice = '伙伴需要休息，已恢复体力。';
    return;
  }
  const trainer = event && event in TRAINERS ? TRAINERS[event as keyof typeof TRAINERS] : null;
  const enemies = wild
    ? [makeCreature(state, wild.speciesId, wild.level, event !== 'openingRescue')]
    : trainer!.team.map(([speciesId, level]) =>
        makeCreature(
          state,
          speciesId,
          PRACTICE_TRAINERS.has(event!)
            ? Math.max(
                2,
                Math.min(
                  event === 'training'
                    ? 15
                    : event === 'coastTraining'
                      ? 28
                      : event === 'highlandTraining'
                        ? 20
                        : 100,
                  state.creatures[playerId]!.level - 1,
                ),
              )
            : level + (GYM_TRAINERS.has(event!) ? state.progress.badges * 4 : 0),
          event !== 'rival',
        ),
      );
  if (event === 'rival' && state.progress.flags.opening) {
    const family = SPECIES[state.creatures[state.party[0]!]!.speciesId]!.familyId;
    const starter = STARTERS.findIndex((id) => SPECIES[id]!.familyId === family);
    enemies[0] = makeCreature(state, STARTERS[(Math.max(0, starter) + 1) % STARTERS.length]!, 5);
    enemies[0]!.moves = ['tackle', 'growl'].map((id) => ({ id, pp: MOVES[id]!.pp }));
  }
  for (const c of enemies)
    if (!state.dex.seen.includes(c.speciesId)) state.dex.seen.push(c.speciesId);
  if (!wild && event !== 'rival')
    enemies.forEach((c, i) => {
      c.heldItem =
        GYM_TRAINERS.has(event!) || event?.startsWith('league')
          ? i % 2 === 0
            ? 'held_berry'
            : 'held_shell'
          : null;
    });
  state.battle = {
    id: nextId(state, 'battle'),
    ...(npc && !wild ? { npcId: npc.id } : {}),
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
    weather: { kind: weatherAt(state), ambient: weatherAt(state), turns: null },
    rewards: { defeated: [], experience: 0, money: 0, completion: false },
  };
  if (state.battle.weather!.kind !== 'clear')
    state.battle.logs.push(
      `场地天气：${WEATHER[state.battle.weather!.kind].name}。${WEATHER[state.battle.weather!.kind].battle}`,
    );
  triggerHeldItem(state.creatures[playerId]!, state.battle.logs);
  state.battle.aiMove = aiMove(state);
}
function finish(state: GameState, result: Battle['result']): void {
  const b = state.battle!;
  if (b.phase === 'ended') return;
  delete b.actionRound;
  ensureRewards(b);
  b.phase = 'ended';
  b.result = result;
  if (result === 'caught')
    distributeExperience(state, Math.floor(b.enemies[b.enemyIndex]!.level * 16));
  if (result === 'win' && b.event === 'openingRescue') {
    state.progress.flags.professorRescued = true;
    healParty(state);
    b.logs.push('绒团鼠安静下来，跑回草丛。岚博士终于脱险了！', '岚博士：谢谢你！和我回研究所吧。');
  }
  if (result === 'win' && b.event && b.event in TRAINERS) {
    const npc = MAPS[state.player.map].npcs.find((n) =>
      b.npcId ? n.id === b.npcId : n.event === b.event,
    );
    if (npc && PRACTICE_TRAINERS.has(b.event)) state.progress.flags[npcVictoryFlag(npc.id)] = true;
    if (
      npc?.defeatedPosition &&
      npc.defeatedPosition[0] === state.player.x &&
      npc.defeatedPosition[1] === state.player.y
    )
      Object.assign(state.player, { x: npc.x, y: npc.y });
    const key = b.event as keyof typeof TRAINERS;
    if (PRACTICE_TRAINERS.has(key) || !state.progress.flags[key]) {
      addBattleMoney(state, TRAINERS[key].reward, '训练师胜利奖励');
      if (!PRACTICE_TRAINERS.has(key)) state.progress.flags[key] = true;
      if (key === 'rival') {
        healParty(state);
        b.logs.push(
          state.progress.flags.opening
            ? '阿澈：配合得不错！一起回研究所，让博士看看你的成长吧。'
            : '阿澈：旅途开始了！到一号路，我教你捕捉。',
        );
      }
      const gymReward = GYM_REWARDS.find((g) => g.leader === key);
      if (gymReward) {
        state.progress.badges = badgeCount(state.progress.flags);
        state.progress.chapter = 1 + state.progress.badges;
        state.progress.flags[gymReward.tool] = true;
        state.inventory.candy = Math.min(999, (state.inventory.candy ?? 0) + 2);
        state.inventory.ultra_ball = Math.min(999, (state.inventory.ultra_ball ?? 0) + 2);
        const tier = state.progress.badges;
        distributeExperience(state, b.enemies.reduce((sum, e) => sum + e.level, 0) * 16 * tier);
        addBattleMoney(state, 300 * tier, `第 ${tier} 枚徽章额外奖励`);
        b.logs.push(
          `获得${gymReward.badge}与${gymReward.toolName}！`,
          `已集齐 ${state.progress.badges}/8 枚不同徽章。${GYM_REWARDS.length} 座已开放道馆可自由选择顺序，继续探索与培养伙伴吧。`,
          '馆主额外赠礼：成长果 ×2、高级星纹球 ×2。',
        );
      }
    }
  }
  if (result === 'lose') {
    if (b.event === 'openingRescue') {
      b.logs.push('岚博士躲到篱笆后暂避。先回镇子让伙伴休整，再去入口的背包旁帮他。');
    } else if (b.event === 'rival' && !state.progress.flags.opening) {
      b.logs.push('阿澈：先让伙伴休息一下，准备好后再来练习吧。');
    } else {
      const loss = Math.floor(state.player.money * 0.05);
      state.player.money -= loss;
      b.logs.push(`伙伴们疲惫了。回治疗所休息，支付旅费 ${loss}。`);
    }
    healParty(state);
    const center = returnToNearestCenter(state);
    b.logs.push(`已在${MAPS[center.town].name}精灵中心复活，全队 HP、PP 与异常状态已恢复。`);
  }
  if (b.event === 'mistEncounter') {
    if (result === 'caught') {
      state.progress.flags.mistCaught = true;
      b.logs.push('雾铃灵回应了旧约，成为你的伙伴。这段旧铃故事已记入日志。');
    } else b.logs.push('雾铃灵退回残碑的雾中。准备好后，可以再次到残碑前唤醒它。');
  }
  if (b.event === 'bellEncounter') {
    if (result === 'caught') {
      state.progress.flags.bellCaught = true;
      b.logs.push('鸣钟石找到了新的同行者，旧矿车旁的约定终于延续。');
    } else b.logs.push('鸣钟石退回钟石中。工牌拓印仍在，准备好后可以再来。');
  }
  const coast = coastEncounter(b.event);
  if (coast) {
    if (result === 'caught') {
      state.progress.flags[coast.caught] = true;
      b.logs.push(`${coast.name}选择与你同行，海岸旧约已记入日志。`);
    } else b.logs.push(`${coast.name}回到浅礁。调查记录仍在，准备好后可以再次来回应它。`);
  }
  const regional = adventureEncounter(b.event);
  if (regional) {
    if (result === 'caught') {
      state.progress.flags[regional.caught] = true;
      b.logs.push(`${regional.name}选择与你同行，调查旧约记入日志。`);
    } else b.logs.push(`${regional.name}回到栖地。记录仍在，可随时回来再次相遇。`);
  }
  if (result === 'caught' && b.event === 'catchTutorial') state.progress.flags.catchTutorial = true;
  finishLeagueBattle(state, result, b.event);
  ensureRewards(b).completion = true;
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
type RoundImmobility = NonNullable<Battle['actionRound']>['immobility'];
function attack(
  state: GameState,
  player: boolean,
  index: number,
  blocked: RoundImmobility,
  struggle: boolean,
): boolean {
  const b = state.battle!;
  const attacker = player ? state.creatures[b.playerId]! : b.enemies[b.enemyIndex]!;
  const defender = player ? b.enemies[b.enemyIndex]! : state.creatures[b.playerId]!;
  if (attacker.hp <= 0 || defender.hp <= 0) return false;
  const slot = struggle ? null : attacker.moves[index];
  if (!struggle && (!slot || slot.pp <= 0)) {
    b.logs.push(`${creatureName(attacker)}所选技能的 PP 已耗尽，后续出手取消。`);
    return false;
  }
  let condition = blocked[attacker.id];
  if (!condition || condition.status !== attacker.status) {
    const unable = immobilized(state, attacker);
    condition = { status: attacker.status, blocked: unable };
    blocked[attacker.id] = condition;
  }
  if (condition.blocked) return false;
  const move = MOVES[slot?.id ?? 'struggle']!;
  if (!canLearnMove(attacker.speciesId, move.id)) {
    b.logs.push(`${creatureName(attacker)}无法使用其他精灵的专属技能。`);
    return false;
  }
  const attackerStages = player ? b.playerStages : b.enemyStages;
  const defenderStages = player ? b.enemyStages : b.playerStages;
  if (slot) slot.pp -= 1;
  const visual: BattleMoveEvent = {
    kind: 'move',
    logIndex: b.logs.length,
    endLogIndex: b.logs.length,
    side: player ? 'player' : 'enemy',
    moveId: move.id,
    outcome: 'hit',
    critical: false,
    before: battleScene(state),
    after: battleScene(state),
  };
  (b.visualEvents ??= []).push(visual);
  try {
    b.logs.push(`${creatureName(attacker)}使用了${move.name}！`);
    if (
      random(state) >= hitChance(move.id, attackerStages, defenderStages, b.weather?.kind, attacker)
    ) {
      visual.outcome = 'miss';
      b.logs.push('没有命中。');
      return true;
    }
    const multiplier = typeMultiplier(move.type, SPECIES[defender.speciesId]!.types);
    const trait = abilityFor(defender);
    if (move.type && trait.immuneType === move.type && move.effect?.target !== 'self') {
      visual.outcome = 'immune';
      if (trait.immuneType === 'electric' && defender.hp > 0) {
        const before = defender.hp;
        defender.hp = Math.min(
          statsFor(defender).hp,
          defender.hp + Math.max(1, Math.floor(statsFor(defender).hp / 4)),
        );
        b.logs.push(
          `${creatureName(defender)}的${trait.name}吸收了电流，恢复${defender.hp - before}点体力。`,
        );
      } else b.logs.push(`${creatureName(defender)}的${trait.name}挡住了这个招式。`);
      return true;
    }
    if (multiplier === 0 && (move.power || move.effect?.target !== 'self')) {
      visual.outcome = 'immune';
      b.logs.push('对方免疫这个属性。');
      return true;
    }
    if (move.power) {
      const critical =
        random(state) < criticalChance(move.id, attackerStages, defenderStages, attacker);
      visual.critical = critical;
      const { damage } = calculateDamage(
        attacker,
        defender,
        move.id,
        player ? b.playerStages : b.enemyStages,
        player ? b.enemyStages : b.playerStages,
        0.9 + random(state) * 0.1,
        critical,
        b.weather?.kind,
      );
      const sturdy = trait.sturdy && defender.hp === statsFor(defender).hp && damage >= defender.hp;
      const dealt = Math.min(defender.hp, sturdy ? Math.max(0, defender.hp - 1) : damage);
      defender.hp -= dealt;
      if (sturdy) b.logs.push(`${creatureName(defender)}的${trait.name}让它留下了1点体力！`);
      b.logs.push(
        `造成 ${dealt} 点伤害${multiplier > 1 ? '，效果绝佳' : multiplier < 1 ? '，效果不佳' : ''}${critical ? '，命中要害（双倍伤害）' : ''}。`,
      );
      if (move.id === 'struggle')
        attacker.hp = Math.max(0, attacker.hp - Math.max(1, Math.floor(statsFor(attacker).hp / 4)));
    }
    const effect = move.effect;
    if (move.weather) {
      b.weather = { kind: move.weather, ambient: b.weather?.ambient ?? 'clear', turns: 5 };
      b.logs.push(
        `${WEATHER[move.weather].name}笼罩场地，持续五轮（含本轮）。${WEATHER[move.weather].battle}`,
      );
    }
    if (effect?.heal) {
      const old = attacker.hp;
      attacker.hp = Math.min(
        statsFor(attacker).hp,
        attacker.hp +
          Math.floor(
            statsFor(attacker).hp *
              (move.id === 'recover'
                ? b.weather?.kind === 'sun'
                  ? 2 / 3
                  : ['rain', 'storm', 'sand', 'snow'].includes(b.weather?.kind ?? '')
                    ? 0.25
                    : effect.heal
                : effect.heal),
          ),
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
      const before = stages[effect.stage] ?? 0;
      const limit = stageLimit(effect.stage);
      const after = Math.max(-limit, Math.min(limit, before + (effect.amount ?? 0)));
      stages[effect.stage] = after;
      const subject = effect.target === 'self' ? creatureName(attacker) : creatureName(defender);
      b.logs.push(
        after === before
          ? `${subject}的${COMBAT_STAGE_NAMES[effect.stage]}已达到${(effect.amount ?? 0) > 0 ? '上限' : '下限'}。`
          : `${subject}的${COMBAT_STAGE_NAMES[effect.stage]}${after > before ? '提升' : '降低'}了！`,
      );
      if (effect.stage === 'critical' || effect.stage === 'criticalGuard') {
        const affected = effect.target === 'self' ? attackerStages : defenderStages;
        const opposing = effect.target === 'self' ? defenderStages : attackerStages;
        const rate =
          effect.stage === 'critical'
            ? criticalChance(
                'tackle',
                affected,
                opposing,
                effect.target === 'self' ? attacker : defender,
              )
            : criticalChance(
                'tackle',
                opposing,
                affected,
                effect.target === 'self' ? defender : attacker,
              );
        b.logs.push(
          `${subject}${effect.stage === 'criticalGuard' ? '受到普通攻击时，对方' : '当前普通攻击'}要害率 ${chanceLabel(rate)}；要害伤害 ×2。`,
        );
      }
    }
    if (
      effect?.status &&
      !defender.status &&
      defender.hp > 0 &&
      random(state) < (effect.chance ?? 1)
    ) {
      const types = SPECIES[defender.speciesId]!.types;
      const immune =
        trait.immuneStatus === effect.status ||
        (effect.status === 'burn' && types.includes('fire')) ||
        (effect.status === 'poison' && (types.includes('poison') || types.includes('steel'))) ||
        (effect.status === 'paralysis' && types.includes('electric'));
      if (!immune) {
        defender.status = effect.status;
        defender.sleepTurns = effect.status === 'sleep' ? 1 + Math.floor(random(state) * 3) : 0;
        b.logs.push(`${creatureName(defender)}陷入异常状态。`);
      } else
        b.logs.push(
          `${creatureName(defender)}${trait.immuneStatus === effect.status ? `的${trait.name}` : '的属性'}避免了异常状态。`,
        );
    }
    return true;
  } finally {
    triggerHeldItem(attacker, b.logs);
    triggerHeldItem(defender, b.logs);
    visual.endLogIndex = b.logs.length - 1;
    visual.after = battleScene(state);
  }
}
function resolveFaints(state: GameState): boolean {
  const b = state.battle!;
  const enemy = b.enemies[b.enemyIndex]!;
  // Pay each defeated opponent before advancing or handling simultaneous recoil loss.
  if (enemy.hp <= 0) settleKnockout(state);
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
    (b.visualEvents ??= []).push({
      kind: 'scene',
      logIndex: b.logs.length,
      scene: battleScene(state),
    });
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
  if (b.event === 'openingRescue' && (action.kind === 'run' || action.kind === 'ball'))
    return '岚博士还在危险中，先用借来的伙伴把绒团鼠赶开！';
  if (
    action.kind === 'ball' &&
    state.progress.flags.opening &&
    !state.progress.flags.fieldKitReceived
  )
    return '先回研究所领取图鉴和捕捉补给，再开始捕捉。';
  if (b.phase === 'forcedSwitch' && action.kind !== 'switch') return '请先选择仍能战斗的伙伴。';
  if (action.kind === 'switch') {
    const c = state.creatures[action.creatureId];
    if (!c || !state.party.includes(c.id)) return '这只精灵不在队伍中。';
    if (c.hp <= 0) return '这只精灵已失去战斗能力。';
    if (c.id === b.playerId) return '这只精灵已经在场上了。';
  }
  if (isSupply(action.kind) && 'creatureId' in action) {
    const c = state.creatures[action.creatureId];
    if (!c || !state.party.includes(c.id)) return '请选择队伍中的精灵。';
    if (!(state.inventory[action.kind]! > 0)) return '这个道具已经用完了。';
    const reason = supplyReason(c, action.kind);
    if (reason) return reason;
  }
  if (action.kind === 'ball') {
    if (b.kind !== 'wild') return '不能捕捉训练师的伙伴。';
    if (state.party.length >= 6 && state.box.length >= 360)
      return '队伍和仓库已满，不会消耗星纹球。';
    const ballId = action.ballId ?? 'ball';
    if (!Object.hasOwn(BALLS, ballId)) return '请选择有效的精灵球。';
    if (!((state.inventory[ballId] ?? 0) > 0)) return `没有${ITEMS[ballId]!.name}了。`;
  }
  if (action.kind === 'run' && b.kind !== 'wild') return '训练师对战不能逃跑。';
  if (action.kind === 'move') {
    const c = state.creatures[b.playerId]!;
    if (c.moves.some((m) => m.pp > 0) && (!c.moves[action.index] || c.moves[action.index]!.pp <= 0))
      return '技能 PP 已耗尽。';
    const selected = c.moves[action.index];
    if (selected && !canLearnMove(c.speciesId, selected.id)) return '这招专属技能不属于当前精灵。';
  }
  return null;
}
export function battleAction(state: GameState, action: BattleAction): void {
  const b = state.battle;
  if (!b || b.phase === 'ended') return;
  b.visualEvents = [];
  try {
    const reason = battleActionReason(state, action);
    if (reason) {
      b.logs = [reason];
      return;
    }
    // Lock the team's action budget before switching or applying items. Switching cannot refill it.
    if (b.phase !== 'forcedSwitch' && !b.actionRound) {
      const player = state.creatures[b.playerId]!;
      const enemy = b.enemies[b.enemyIndex]!;
      const pace = roundPace(player, enemy, b.playerStages, b.enemyStages, b.weather?.kind);
      const playerMove =
        action.kind === 'move'
          ? MOVES[player.moves.some((m) => m.pp > 0) ? player.moves[action.index]!.id : 'struggle']!
          : null;
      const enemyMove = MOVES[enemy.moves[b.aiMove]?.id ?? 'struggle']!;
      const enemyFirst =
        !!playerMove &&
        (playerMove.priority !== enemyMove.priority
          ? enemyMove.priority > playerMove.priority
          : pace.playerSpeed !== pace.enemySpeed
            ? pace.enemySpeed > pace.playerSpeed
            : random(state) >= 0.5);
      b.actionRound = {
        playerTotal: pace.playerActions,
        enemyTotal: pace.enemyActions,
        playerRemaining: pace.playerActions,
        enemyRemaining: pace.enemyActions,
        enemyFirst,
        immobility: {},
      };
    }
    if (action.kind === 'switch') {
      const c = state.creatures[action.creatureId]!;
      const forced = b.phase === 'forcedSwitch';
      const previous = creatureName(state.creatures[b.playerId]!);
      b.logs = forced
        ? [`上吧，${creatureName(c)}！`]
        : [`${previous}，回来吧！`, `上吧，${creatureName(c)}！`];
      const outgoing = state.creatures[b.playerId]!,
        trait = abilityFor(outgoing);
      if (!forced && outgoing.hp > 0 && trait.switchHeal && outgoing.hp < statsFor(outgoing).hp) {
        const old = outgoing.hp;
        outgoing.hp = Math.min(
          statsFor(outgoing).hp,
          outgoing.hp + Math.max(1, Math.floor(statsFor(outgoing).hp * trait.switchHeal)),
        );
        b.logs.push(`${previous}的${trait.name}恢复了${outgoing.hp - old}点体力。`);
      }
      triggerHeldItem(c, b.logs);
      b.playerId = c.id;
      b.visualEvents.push({
        kind: 'scene',
        logIndex: b.logs.length - 1,
        scene: battleScene(state),
      });
      b.playerStages = emptyStages();
      if (!b.participants.includes(c.id)) b.participants.push(c.id);
      if (forced) {
        delete b.actionRound;
        b.phase = 'choose';
        b.aiMove = aiMove(state);
        return;
      }
    }
    const player = state.creatures[b.playerId]!;
    const enemy = b.enemies[b.enemyIndex]!;
    if (action.kind !== 'switch') b.logs = [];
    if (action.kind === 'ball') {
      const ballId = action.ballId ?? 'ball';
      const scene = battleScene(state);
      if (ballId === 'master_ball') consumeMasterBall(state);
      else state.inventory[ballId]! -= 1;
      const { caught, shakes } = resolveCapture(
        BALLS[ballId].guaranteed || b.tutorialCatch
          ? 1
          : captureChance(enemy, BALLS[ballId].multiplier),
        () => random(state),
      );
      b.logs.push(`向${creatureName(enemy)}投出了${ITEMS[ballId]!.name}！`);
      b.visualEvents.push({ kind: 'capture', logIndex: 0, ballId, caught, shakes, scene });
      if (caught) {
        const oldMax = statsFor(enemy).hp;
        const training = ensureTraining(enemy);
        training.mode = 'manual';
        training.allocated = emptyStats();
        // The captured creature keeps its earned rolls; its trainer chooses the allocation.
        enemy.hp = Math.max(
          1,
          Math.min(statsFor(enemy).hp, enemy.hp + statsFor(enemy).hp - oldMax),
        );
        state.creatures[enemy.id] = enemy;
        (state.party.length < 6 ? state.party : state.box).push(enemy.id);
        if (!state.dex.caught.includes(enemy.speciesId)) state.dex.caught.push(enemy.speciesId);
        b.logs.push(
          `捕捉成功！${creatureName(enemy)}加入${state.party.includes(enemy.id) ? '队伍' : '仓库'}。`,
        );
        if (!state.progress.flags.firstCatch) {
          state.progress.flags.firstCatch = true;
          state.inventory.candy = Math.min(999, (state.inventory.candy ?? 0) + 1);
          b.logs.push('首次捕捉奖励：成长果 ×1。');
        }
        // Capture research XP belongs to the existing team, not the newly caught creature.
        const party = state.party;
        state.party = party.filter((id) => id !== enemy.id);
        finish(state, 'caught');
        state.party = party;
        return;
      }
      b.logs.push(
        shakes === 0
          ? `精灵立刻挣脱了${ITEMS[ballId]!.name}！试着降低它的 HP 或施加异常状态。`
          : `${ITEMS[ballId]!.name}摇晃了${shakes}次……${shakes === 3 ? '就差一点！' : ''}精灵挣脱了！`,
      );
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
    if (isSupply(action.kind) && 'creatureId' in action) {
      const target = state.creatures[action.creatureId]!;
      const before = target.hp;
      applySupply(target, action.kind);
      b.logs.push(
        `对${creatureName(target)}使用了${ITEMS[action.kind]!.name}${['potion', 'super_potion', 'hyper_potion', 'revive'].includes(action.kind) ? `，恢复 ${target.hp - before} 点 HP` : action.kind === 'ether' ? '，各技能恢复最多 10 PP' : '，异常状态解除了'}。`,
      );
      state.inventory[action.kind]! -= 1;
    }
    const round = b.actionRound!;
    const performEnemy = () => {
      while (round.enemyRemaining > 0 && player.hp > 0 && enemy.hp > 0) {
        const struggle = !enemy.moves.some((m) => m.pp > 0);
        round.enemyRemaining--;
        if (!attack(state, false, b.aiMove, round.immobility, struggle)) {
          round.enemyRemaining = 0;
          break;
        }
        if (round.enemyRemaining > 0 && player.hp > 0 && enemy.hp > 0) b.aiMove = aiMove(state);
      }
    };
    if (round.enemyFirst) performEnemy();
    if (player.hp > 0 && enemy.hp > 0) {
      round.playerRemaining--;
      if (action.kind === 'move')
        attack(state, true, action.index, round.immobility, !player.moves.some((m) => m.pp > 0));
    }
    if (round.playerRemaining <= 0) performEnemy();
    if (player.hp > 0 && enemy.hp > 0 && round.playerRemaining > 0) {
      b.logs.push(
        `本回合还可操作 ${round.playerRemaining}/${round.playerTotal} 次，请重新选择技能、道具或换人。`,
      );
      b.phase = 'choose';
      return;
    }
    delete b.actionRound;
    for (const c of [player, enemy]) {
      if (c.hp > 0 && (c.status === 'poison' || c.status === 'burn')) {
        const loss = Math.max(1, Math.floor(statsFor(c).hp / (c.status === 'poison' ? 8 : 16)));
        c.hp = Math.max(0, c.hp - loss);
        b.logs.push(`${creatureName(c)}受到 ${loss} 点异常伤害。`);
      }
    }
    if (b.weather?.kind === 'sand')
      for (const c of [player, enemy]) {
        if (
          c.hp <= 0 ||
          SPECIES[c.speciesId]!.types.some((t) => ['rock', 'ground', 'steel'].includes(t))
        )
          continue;
        const loss = Math.max(1, Math.floor(statsFor(c).hp / 16));
        c.hp = Math.max(0, c.hp - loss);
        b.logs.push(`${creatureName(c)}受到扬沙伤害 ${loss}。`);
      }
    for (const c of [player, enemy]) endHeldTurn(c, b.logs);
    if (b.weather?.turns !== null && b.weather?.turns !== undefined && --b.weather.turns === 0) {
      b.weather.kind = b.weather.ambient;
      b.weather.turns = null;
      b.logs.push(`技能天气结束，场地回到${WEATHER[b.weather.kind].name}。`);
    }
    const stopped = resolveFaints(state);
    b.turn += 1;
    if (!stopped) b.phase = 'choose';
    if (state.battle?.result === null) b.aiMove = aiMove(state);
  } finally {
    if (b.logs.length)
      b.visualEvents.push({
        kind: 'scene',
        logIndex: b.logs.length - 1,
        scene: battleScene(state),
      });
  }
}
