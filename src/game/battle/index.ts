import {
  beginJournal,
  beginJournalAction,
  finishJournalAction,
  journalDamage,
} from '../battleJournal';
import { recordFishingCatch } from '../fishing';
import { applyEntryHazards, hazardLabel } from './hazards';
import { trainerTactic } from '../../content/trainerTactics';
import { clearFieldEffects, endSeedTurn } from './volatile';
import {
  gymRematch,
  gymRematchEntryReason,
  registerGymRematch,
  finishGymRematch,
} from '../gymRematches';
import {
  chooseEnemyMove,
  chooseEnemyItem,
  trainerMedicine,
  chooseEnemySwitch,
  curateTrainerTeam,
  recordEnemySupport,
  tacticalMoveScore,
  expectedHitCount,
} from './strategy';
import { statusName } from '../statusLabels';
import { coastEncounter } from '../coastStory';
import { adventureEncounter } from '../../content/adventure';
import { finishLeagueBattle } from '../league';
import { rememberRecoveryTowns, returnToNearestCenter } from '../recovery';
import { canLearnMove, ITEMS, MOVES, SPECIES, STARTERS } from '../../content/catalog';
import { battleScene } from '../battleVisuals';
import { emptyStats, ensureTraining } from '../growth';
import { BALLS, ballEffect, consumeMasterBall, resolveCapture } from '../capture';
import { WEATHER, weatherAt } from '../environment';
import { addBattleMoney, distributeExperience, ensureRewards, settleKnockout } from '../rewards';
import { isSupply, supplyReason, applySupply } from '../items';
import { endHeldTurn, triggerHeldItem } from '../heldItems';
import {
  badgeCount,
  canStartTrainerBattle,
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
  hasUsableBattleMove,
  MAX_PROTECT_CHAIN,
  protectSuccessChance,
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
  effectiveStat,
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
    delete c.confusionTurns;
    c.moves.forEach((m) => {
      m.pp = MOVES[m.id]!.pp;
    });
  }
}
function aiMove(state: GameState): number {
  const b = state.battle!;
  if (b.kind === 'trainer' && (b.ruleChallenge || trainerTactic(b.event)))
    return chooseEnemyMove(state);
  const enemy = b.enemies[b.enemyIndex]!;
  const player = state.creatures[b.playerId]!;
  const estimate = (attacker: Creature, defender: Creature, ours: Stages, theirs: Stages) =>
    Math.max(
      0,
      ...attacker.moves
        .filter((m) => m.pp > 0 && MOVES[m.id]!.power > 0)
        .map(
          (m) =>
            calculateDamage(attacker, defender, m.id, ours, theirs, 1, false, b.weather?.kind)
              .damage *
            expectedHitCount(m.id) *
            hitChance(m.id, ours, theirs, b.weather?.kind, attacker),
        ),
    );
  const damage = estimate(enemy, player, b.enemyStages, b.playerStages);
  const incoming = estimate(player, enemy, b.playerStages, b.enemyStages);
  let best = -1;
  let bestScore = -1;
  enemy.moves.forEach((m, i) => {
    if (m.pp <= 0) return;
    const move = MOVES[m.id]!;
    if (
      move.effect?.protect &&
      b.actionRound &&
      b.actionRound.enemyRemaining < b.actionRound.enemyTotal
    )
      return;
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
        expectedHitCount(m.id) *
        hitChance(m.id, b.enemyStages, b.playerStages, b.weather?.kind, enemy) *
        (1 + criticalChance(m.id, b.enemyStages, b.playerStages, enemy))
      : 3;
    if (move.weather) score = move.weather === b.weather?.kind ? 0 : 5;
    if (move.effect?.heal) score = enemy.hp < statsFor(enemy).hp / 2 ? 18 : 0;
    if (move.effect?.status && !move.power) score = player.status ? 0 : 7;
    if (
      move.effect?.status &&
      !move.power &&
      abilityFor(player).immuneStatus === move.effect.status
    )
      score = 0;
    if (move.effect?.confusion && !move.power) score = player.confusionTurns ? 0 : 7;
    if (
      move.effect?.status === 'freeze' &&
      (SPECIES[player.speciesId]!.types.includes('ice') || b.weather?.kind === 'sun')
    )
      score = move.power ? score : 0;
    if (move.effect?.stage) {
      const { stage, amount = 0, target } = move.effect;
      const current = (target === 'self' ? b.enemyStages : b.playerStages)[stage] ?? 0;
      const limit = stageLimit(stage);
      score = Math.max(-limit, Math.min(limit, current + amount)) === current ? 0 : 4;
    }
    if (enemy.status === 'freeze' && !(move.type === 'fire' && move.power > 0)) score *= 0.2;
    score = tacticalMoveScore(state, move.id, score, damage, incoming);
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
  if (!wild && event && !canStartTrainerBattle(state.player.map, event)) {
    state.notice = '城镇里的普通训练师不进行对战，可以继续交谈或到镇外练习。';
    return;
  }
  const rematch = !wild ? gymRematch(event) : undefined;
  if (rematch) {
    const reason = gymRematchEntryReason(state, rematch);
    if (reason) {
      state.notice = reason;
      return;
    }
  }
  rememberRecoveryTowns(state);
  const npc = event
    ? MAPS[state.player.map].npcs.find((n) => n.event === (rematch?.leader ?? event))
    : undefined;
  if (
    !wild &&
    !rematch &&
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
  const trainer =
    rematch ?? (event && event in TRAINERS ? TRAINERS[event as keyof typeof TRAINERS] : null);
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
  if (!wild) curateTrainerTeam(event, enemies);
  for (const c of enemies)
    if (!state.dex.seen.includes(c.speciesId)) state.dex.seen.push(c.speciesId);
  if (!wild && event !== 'rival')
    enemies.forEach((c, i) => {
      c.heldItem = rematch
        ? rematch.heldItems[i]!
        : GYM_TRAINERS.has(event!) || event?.startsWith('league')
          ? i % 2 === 0
            ? 'held_berry'
            : 'held_shell'
          : null;
    });
  if (rematch) registerGymRematch(state, rematch.event);
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
    ...(!wild && trainerMedicine(event) ? { enemyMedicine: trainerMedicine(event) } : {}),
  };
  const tactic = !wild ? trainerTactic(event) : null;
  if (tactic) state.battle.logs.push(`对手战术：${tactic.name}。换人会消耗对手整轮行动。`);
  if (state.battle.enemyMedicine)
    state.battle.logs.push(
      `对手携带${ITEMS[state.battle.enemyMedicine.itemId]!.name} ×${state.battle.enemyMedicine.remaining}；低体力用药会消耗对手整轮行动。`,
    );
  if (state.battle.weather!.kind !== 'clear')
    state.battle.logs.push(
      `场地天气：${WEATHER[state.battle.weather!.kind].name}。${WEATHER[state.battle.weather!.kind].battle}`,
    );
  triggerHeldItem(state.creatures[playerId]!, state.battle.logs);
  state.battle.aiMove = aiMove(state);
  beginJournal(state.battle);
}
function finish(state: GameState, result: Battle['result']): void {
  const b = state.battle!;
  if (b.phase === 'ended') return;
  delete b.actionRound;
  delete b.volatiles;
  for (const c of [...state.party.map((id) => state.creatures[id]!), ...b.enemies])
    delete c.confusionTurns;
  ensureRewards(b);
  b.phase = 'ended';
  b.result = result;
  if (b.ruleChallenge) {
    ensureRewards(b).completion = true;
    b.logs.push(result === 'win' ? '规则挑战获胜！' : '本轮规则挑战结束。');
    return;
  }
  if (result === 'caught') recordFishingCatch(state);
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
  const rematch = gymRematch(b.event);
  if (result === 'win' && rematch) addBattleMoney(state, rematch.reward, '道馆再战胜利奖励');
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
  finishGymRematch(state);
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
  if (creature.status === 'freeze') {
    if (random(state) < 0.2) {
      creature.status = null;
      state.battle!.logs.push(`${creatureName(creature)}解冻了！`);
    } else {
      state.battle!.logs.push(`${creatureName(creature)}被冻住了，没能行动。`);
      return true;
    }
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
  const move = MOVES[slot?.id ?? 'struggle']!;
  // A selected damaging fire move thaws its user even after a previous blocked fast action.
  if (attacker.status === 'freeze' && move.type === 'fire' && move.power > 0) {
    attacker.status = null;
    b.logs.push(`${creatureName(attacker)}借助火焰解冻了！`);
  }
  let condition = blocked[attacker.id];
  if (!condition || condition.status !== attacker.status) {
    const unable = immobilized(state, attacker);
    condition = { ...condition, status: attacker.status, blocked: unable };
    blocked[attacker.id] = condition;
  }
  if (condition.blocked) return false;
  // Separate from major-status checks: neither repeated actions nor a new status rerolls confusion.
  if (condition.confusionTurns !== (attacker.confusionTurns ?? 0)) {
    condition.confusionBlocked = false;
    let remaining = attacker.confusionTurns ?? 0;
    if (attacker.confusionTurns) {
      attacker.confusionTurns--;
      remaining = attacker.confusionTurns;
      b.logs.push(`${creatureName(attacker)}正处于混乱中！`);
      if (random(state) < 1 / 3) {
        const stages = player ? b.playerStages : b.enemyStages;
        const damage = Math.max(
          1,
          Math.floor(
            (((2 * attacker.level) / 5 + 2) *
              40 *
              effectiveStat(attacker, 'attack', stages, b.weather?.kind)) /
              effectiveStat(attacker, 'defense', stages, b.weather?.kind) /
              50,
          ) + 2,
        );
        const loss = Math.min(attacker.hp, damage);
        attacker.hp -= loss;
        journalDamage(b, attacker, loss, 'confusion');
        condition.confusionBlocked = true;
        b.logs.push(`${creatureName(attacker)}因混乱伤到了自己，损失 ${loss} 点体力，没能行动。`);
        triggerHeldItem(attacker, b.logs);
      }
      if (!attacker.confusionTurns) b.logs.push(`${creatureName(attacker)}恢复了清醒。`);
    }
    // Keep the pre-cure token so a cleansing berry re-enables later fast actions.
    condition.confusionTurns = remaining;
  }
  if (condition.confusionBlocked) return false;
  if (!canLearnMove(attacker.speciesId, move.id)) {
    b.logs.push(`${creatureName(attacker)}无法使用其他精灵的专属技能。`);
    return false;
  }
  const attackerStages = player ? b.playerStages : b.enemyStages;
  const defenderStages = player ? b.enemyStages : b.playerStages;
  if (slot) slot.pp -= 1;
  if (!player) recordEnemySupport(b, move.id);
  let visual: BattleMoveEvent = {
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
    // Traps target a side, not the active creature: Protect, evasion and type immunity do not block placement.
    if (move.effect?.hazard) {
      const side = player ? 'enemy' : 'player';
      const field = ((b.hazards ??= {})[side] ??= {});
      if (move.effect.hazard === 'rocks') {
        if (field.rocks) b.logs.push('对方场地已有隐形岩，无法重复布置。');
        else {
          field.rocks = true;
          b.logs.push('对方场地布下隐形岩！换入时按岩石属性相性受到伤害。');
        }
      } else if ((field.spikes ?? 0) >= 3) b.logs.push('对方地刺已达三层，无法继续叠加。');
      else {
        field.spikes = (field.spikes ?? 0) + 1;
        b.logs.push(`对方场地地刺增加到 ${field.spikes} 层！浮空伙伴不受地刺伤害。`);
      }
      return true;
    }
    if (move.effect?.clearHazards) {
      const side = player ? 'player' : 'enemy';
      const label = hazardLabel(b.hazards?.[side]);
      if (b.hazards) delete b.hazards[side];
      b.logs.push(label === '无' ? '己方场地没有需要清除的陷阱。' : `清除了己方场地的${label}！`);
      return true;
    }
    if (move.effect?.protect) {
      const chance = protectSuccessChance(b, attacker.id);
      const previous = b.volatiles?.[attacker.id];
      const chain = previous?.lastProtectTurn === b.turn - 1 ? (previous.protectChain ?? 0) : 0;
      (b.volatiles ??= {})[attacker.id] = {
        ...previous,
        lastProtectTurn: b.turn,
        protectChain: Math.min(MAX_PROTECT_CHAIN, chain + 1),
      };
      if (random(state) < chance) {
        (b.actionRound!.protected ??= []).push(attacker.id);
        b.logs.push(`${creatureName(attacker)}守住了！本轮抵挡所有对手招式，但仍受到持续伤害。`);
      } else {
        visual.outcome = 'miss';
        b.logs.push(`连续使用守住失败了（本次成功率 ${chanceLabel(chance)}）。`);
      }
      return true;
    }
    if (move.effect?.target !== 'self' && b.actionRound?.protected?.includes(defender.id)) {
      visual.outcome = 'blocked';
      b.logs.push(`${creatureName(defender)}的守住挡下了招式！`);
      return true;
    }
    if (
      random(state) >= hitChance(move.id, attackerStages, defenderStages, b.weather?.kind, attacker)
    ) {
      visual.outcome = 'miss';
      b.logs.push('没有命中。');
      return true;
    }
    const multiplier = typeMultiplier(move.type, SPECIES[defender.speciesId]!.types);
    const trait = abilityFor(defender);
    if (
      move.type &&
      trait.immuneType === move.type &&
      move.effect?.target !== 'self' &&
      !move.effect?.confusion
    ) {
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
    if (
      multiplier === 0 &&
      (move.power || (move.effect?.target !== 'self' && !move.effect?.confusion))
    ) {
      visual.outcome = 'immune';
      b.logs.push('对方免疫这个属性。');
      return true;
    }
    if (move.power) {
      const roll = move.effect?.hits === '2-5' ? random(state) : 0;
      const hitCount =
        move.effect?.hits === '2-5'
          ? roll < 0.35
            ? 2
            : roll < 0.7
              ? 3
              : roll < 0.85
                ? 4
                : 5
          : (move.effect?.hits ?? 1);
      let totalDealt = 0;
      let landed = 0;
      for (let hit = 0; hit < hitCount && attacker.hp > 0 && defender.hp > 0; hit++) {
        if (hit > 0) {
          visual.endLogIndex = b.logs.length - 1;
          visual.after = battleScene(state);
          visual = {
            ...visual,
            logIndex: b.logs.length,
            endLogIndex: b.logs.length,
            critical: false,
            before: battleScene(state),
            after: battleScene(state),
          };
          b.visualEvents!.push(visual);
        }
        const critical =
          random(state) < criticalChance(move.id, attackerStages, defenderStages, attacker);
        visual.critical = critical;
        const { damage } = calculateDamage(
          attacker,
          defender,
          move.id,
          attackerStages,
          defenderStages,
          0.9 + random(state) * 0.1,
          critical,
          b.weather?.kind,
        );
        const sturdy =
          trait.sturdy && defender.hp === statsFor(defender).hp && damage >= defender.hp;
        const dealt = Math.min(defender.hp, sturdy ? Math.max(0, defender.hp - 1) : damage);
        defender.hp -= dealt;
        journalDamage(b, defender, dealt, 'move');
        totalDealt += dealt;
        landed++;
        if (sturdy) b.logs.push(`${creatureName(defender)}的${trait.name}让它留下了1点体力！`);
        b.logs.push(
          `${hitCount > 1 ? `第 ${hit + 1} 击：` : ''}造成 ${dealt} 点伤害${multiplier > 1 ? '，效果绝佳' : multiplier < 1 ? '，效果不佳' : ''}${critical ? '，命中要害（双倍伤害）' : ''}。`,
        );
        if (dealt > 0 && move.type === 'fire' && defender.status === 'freeze' && defender.hp > 0) {
          defender.status = null;
          b.logs.push(`${creatureName(defender)}被火焰解冻了！`);
        }
        if (move.effect?.drain && dealt > 0 && attacker.hp > 0) {
          const healed = Math.min(
            statsFor(attacker).hp - attacker.hp,
            Math.max(1, Math.floor(dealt * move.effect.drain)),
          );
          attacker.hp += healed;
          b.logs.push(`按实际造成的 ${dealt} 点伤害，吸取恢复 ${healed} 点体力。`);
        }
        // Berries can trigger between hits; a fainted target cannot be revived by them.
        if (hitCount > 1) {
          triggerHeldItem(attacker, b.logs);
          triggerHeldItem(defender, b.logs);
        }
      }
      if (hitCount > 1) b.logs.push(`连续命中 ${landed} 次，共造成 ${totalDealt} 点实际伤害。`);
      if (move.id === 'struggle' || (move.effect?.recoil && totalDealt > 0)) {
        const recoil =
          move.id === 'struggle'
            ? Math.max(1, Math.floor(statsFor(attacker).hp / 4))
            : Math.max(1, Math.floor(totalDealt * move.effect!.recoil!));
        const lost = Math.min(attacker.hp, recoil);
        attacker.hp -= lost;
        journalDamage(b, attacker, lost, 'recoil');
        b.logs.push(`${creatureName(attacker)}受到反冲，损失 ${lost} 点体力。`);
      }
    }
    const effect = move.effect;
    if (effect?.seed && defender.hp > 0) {
      if (SPECIES[defender.speciesId]!.types.includes('grass')) {
        visual.outcome = 'immune';
        b.logs.push(`${creatureName(defender)}的草属性使寄生种子无法生效。`);
      } else if (b.volatiles?.[defender.id]?.seededBy) {
        b.logs.push(`${creatureName(defender)}已经被寄生，不能重复播种。`);
      } else {
        const record = ((b.volatiles ??= {})[defender.id] ??= {});
        record.seededBy = player ? 'player' : 'enemy';
        b.logs.push(`${creatureName(defender)}被种下寄生种子！每轮结束时吸取体力，换下场可解除。`);
      }
    }
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
        (effect.status === 'paralysis' && types.includes('electric')) ||
        (effect.status === 'freeze' && (types.includes('ice') || b.weather?.kind === 'sun'));
      if (!immune) {
        defender.status = effect.status;
        defender.sleepTurns = effect.status === 'sleep' ? 1 + Math.floor(random(state) * 3) : 0;
        b.logs.push(`${creatureName(defender)}陷入${statusName(effect.status)}状态。`);
      } else
        b.logs.push(
          `${creatureName(defender)}${effect.status === 'freeze' && b.weather?.kind === 'sun' ? '在晴天下' : trait.immuneStatus === effect.status ? `的${trait.name}` : '的属性'}避免了异常状态。`,
        );
    }
    if (
      effect?.confusion &&
      !defender.confusionTurns &&
      defender.hp > 0 &&
      random(state) < (effect.chance ?? 1)
    ) {
      defender.confusionTurns = 2 + Math.floor(random(state) * 4);
      const cached = blocked[defender.id];
      if (cached) {
        delete cached.confusionTurns;
        delete cached.confusionBlocked;
      }
      b.logs.push(`${creatureName(defender)}陷入混乱！`);
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
  for (const c of [...state.party.map((id) => state.creatures[id]!), ...b.enemies])
    if (c.hp <= 0) {
      delete c.confusionTurns;
      clearFieldEffects(b, c);
    }
  // Pay each defeated opponent before advancing or handling simultaneous recoil loss.
  if (enemy.hp <= 0) settleKnockout(state);
  if (!state.party.some((id) => state.creatures[id]!.hp > 0)) {
    finish(state, 'lose');
    return true;
  }
  if (enemy.hp <= 0) {
    b.logs.push(`${creatureName(enemy)}失去了战斗能力。`);
    const replacement = b.enemies.findIndex((candidate) => candidate.hp > 0);
    if (replacement < 0) {
      finish(state, 'win');
      return true;
    }
    b.enemyIndex = replacement;
    b.enemyStages = emptyStages();
    (b.visualEvents ??= []).push({
      kind: 'scene',
      logIndex: b.logs.length,
      scene: battleScene(state),
    });
    b.logs.push(`${b.name}派出了${creatureName(b.enemies[b.enemyIndex]!)}。`);
    applyEntryHazards(b, 'enemy', b.enemies[b.enemyIndex]!);
    // Chain through every reserve knocked out on entry, paying each reward once.
    if (b.enemies[b.enemyIndex]!.hp <= 0) return resolveFaints(state);
  }
  if (state.creatures[b.playerId]!.hp <= 0) {
    b.phase = 'forcedSwitch';
    b.logs.push('请选择仍能战斗的伙伴。');
    return true;
  }
  return false;
}
function settleRoundEnd(state: GameState): void {
  const b = state.battle!;
  const player = state.creatures[b.playerId]!;
  const enemy = b.enemies[b.enemyIndex]!;
  delete b.actionRound;
  for (const c of [player, enemy]) {
    if (c.hp > 0 && (c.status === 'poison' || c.status === 'burn')) {
      const loss = Math.max(1, Math.floor(statsFor(c).hp / (c.status === 'poison' ? 8 : 16)));
      const actual = Math.min(c.hp, loss);
      c.hp = Math.max(0, c.hp - loss);
      journalDamage(b, c, actual, 'status');
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
      const actual = Math.min(c.hp, loss);
      c.hp = Math.max(0, c.hp - loss);
      journalDamage(b, c, actual, 'weather');
      b.logs.push(`${creatureName(c)}受到扬沙伤害 ${loss}。`);
    }
  endSeedTurn(state);
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
}
export function battleActionReason(state: GameState, action: BattleAction): string | null {
  const b = state.battle;
  if (!b || b.phase === 'ended') return '这场对战已经结束。';
  if (b.ruleChallenge && action.kind !== 'move' && action.kind !== 'switch')
    return '规则挑战仅可使用技能与切换伙伴。';
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
    if (
      hasUsableBattleMove(c, b, true) &&
      (!c.moves[action.index] || c.moves[action.index]!.pp <= 0)
    )
      return '技能 PP 已耗尽。';
    const selected = c.moves[action.index];
    if (selected && !canLearnMove(c.speciesId, selected.id)) return '这招专属技能不属于当前精灵。';
    if (
      selected &&
      c.moves.some((m) => m.pp > 0) &&
      MOVES[selected.id]!.effect?.protect &&
      b.actionRound &&
      b.actionRound.playerRemaining < b.actionRound.playerTotal
    )
      return '守住只能在本轮第一次行动使用，并消耗本轮全部行动。';
  }
  return null;
}
export function battleAction(state: GameState, action: BattleAction): void {
  const b = state.battle;
  if (!b || b.phase === 'ended') return;
  beginJournalAction(b);
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
          ? MOVES[
              hasUsableBattleMove(player, b, true) ? player.moves[action.index]!.id : 'struggle'
            ]!
          : null;
      const enemyMove = MOVES[enemy.moves[b.aiMove]?.id ?? 'struggle']!;
      const enemyFirst = !playerMove
        ? !!enemyMove.effect?.protect
        : playerMove.priority !== enemyMove.priority
          ? enemyMove.priority > playerMove.priority
          : pace.playerSpeed !== pace.enemySpeed
            ? pace.enemySpeed > pace.playerSpeed
            : random(state) >= 0.5;
      const enemyItem = chooseEnemyItem(state);
      b.actionRound = {
        playerTotal: pace.playerActions,
        enemyTotal: pace.enemyActions,
        playerRemaining: pace.playerActions,
        enemyRemaining: pace.enemyActions,
        enemyFirst,
        enemyItem,
        enemySwitchIndex: enemyItem ? undefined : chooseEnemySwitch(state),
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
      delete outgoing.confusionTurns;
      clearFieldEffects(b, outgoing);
      delete b.actionRound?.immobility[outgoing.id];
      triggerHeldItem(c, b.logs);
      b.playerId = c.id;
      b.visualEvents.push({
        kind: 'scene',
        logIndex: b.logs.length - 1,
        scene: battleScene(state),
      });
      b.playerStages = emptyStages();
      if (!b.participants.includes(c.id)) b.participants.push(c.id);
      applyEntryHazards(b, 'player', c);
      if (c.hp <= 0) {
        if (forced) {
          delete b.actionRound;
          resolveFaints(state);
          if (b.result === null) b.aiMove = aiMove(state);
        } else settleRoundEnd(state);
        return;
      }
      if (forced) {
        delete b.actionRound;
        b.phase = 'choose';
        b.aiMove = aiMove(state);
        return;
      }
    }
    const player = state.creatures[b.playerId]!;
    let enemy = b.enemies[b.enemyIndex]!;
    if (action.kind !== 'switch') b.logs = [];
    const switchIndex = b.actionRound?.enemySwitchIndex;
    if (switchIndex !== undefined) {
      delete b.actionRound!.enemySwitchIndex;
      const incoming = b.enemies[switchIndex];
      if (incoming && incoming.hp > 0 && switchIndex !== b.enemyIndex) {
        const outgoing = enemy;
        b.logs.push(`${b.name}收回了${creatureName(outgoing)}，派出${creatureName(incoming)}！`);
        const trait = abilityFor(outgoing);
        if (outgoing.hp > 0 && trait.switchHeal && outgoing.hp < statsFor(outgoing).hp) {
          const before = outgoing.hp;
          outgoing.hp = Math.min(
            statsFor(outgoing).hp,
            outgoing.hp + Math.max(1, Math.floor(statsFor(outgoing).hp * trait.switchHeal)),
          );
          b.logs.push(
            `${creatureName(outgoing)}的${trait.name}恢复了${outgoing.hp - before}点体力。`,
          );
        }
        delete outgoing.confusionTurns;
        clearFieldEffects(b, outgoing);
        delete b.actionRound!.immobility[outgoing.id];
        b.enemyIndex = switchIndex;
        b.enemyStages = emptyStages();
        b.aiTactics ??= { lastSwitchTurn: -10, switches: 0, lastSupportTurn: -10 };
        b.aiTactics.lastSwitchTurn = b.turn;
        b.aiTactics.switches++;
        b.actionRound!.enemyRemaining = 0;
        enemy = incoming;
        triggerHeldItem(enemy, b.logs);
        b.visualEvents.push({
          kind: 'scene',
          logIndex: b.logs.length - 1,
          scene: battleScene(state),
        });
        applyEntryHazards(b, 'enemy', enemy);
        if (enemy.hp <= 0) {
          const stopped = resolveFaints(state);
          if (stopped) {
            delete b.actionRound;
            return;
          }
          enemy = b.enemies[b.enemyIndex]!;
        }
        b.aiMove = aiMove(state);
      }
    }
    const enemyItem = b.actionRound?.enemyItem;
    if (enemyItem) {
      delete b.actionRound!.enemyItem;
      const beforeHeal = enemy.hp;
      if (
        b.enemyMedicine?.itemId === enemyItem &&
        b.enemyMedicine.remaining > 0 &&
        applySupply(enemy, enemyItem)
      ) {
        b.enemyMedicine.remaining--;
        b.actionRound!.enemyRemaining = 0;
        b.logs.push(
          `${b.name}对${creatureName(enemy)}使用了${ITEMS[enemyItem]!.name}，恢复 ${enemy.hp - beforeHeal} 点体力！剩余 ${b.enemyMedicine.remaining} 次用药；本轮不再攻击或换人。`,
        );
        b.visualEvents.push({
          kind: 'scene',
          logIndex: b.logs.length - 1,
          scene: battleScene(state),
        });
      }
    }
    if (action.kind === 'ball') {
      const ballId = action.ballId ?? 'ball';
      const scene = battleScene(state);
      if (ballId === 'master_ball') consumeMasterBall(state);
      else state.inventory[ballId]! -= 1;
      const { caught, shakes } = resolveCapture(
        BALLS[ballId].guaranteed || b.tutorialCatch
          ? 1
          : captureChance(enemy, ballEffect(state, ballId).multiplier),
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
      if (action.kind === 'antidote' || action.kind === 'revive') {
        const cached = b.actionRound?.immobility[target.id];
        if (cached) {
          delete cached.confusionTurns;
          delete cached.confusionBlocked;
        }
      }
      b.logs.push(
        `对${creatureName(target)}使用了${ITEMS[action.kind]!.name}${['potion', 'super_potion', 'hyper_potion', 'revive'].includes(action.kind) ? `，恢复 ${target.hp - before} 点 HP` : action.kind === 'ether' ? '，各技能恢复最多 10 PP' : '，异常状态解除了'}。`,
      );
      state.inventory[action.kind]! -= 1;
    }
    const round = b.actionRound!;
    const performEnemy = () => {
      while (round.enemyRemaining > 0 && player.hp > 0 && enemy.hp > 0) {
        const struggle = !hasUsableBattleMove(enemy, b, false);
        round.enemyRemaining--;
        if (!struggle && MOVES[enemy.moves[b.aiMove]?.id ?? 'struggle']!.effect?.protect)
          round.enemyRemaining = 0;
        if (!attack(state, false, b.aiMove, round.immobility, struggle)) {
          round.enemyRemaining = 0;
          break;
        }
        if (round.enemyRemaining > 0 && player.hp > 0 && enemy.hp > 0) b.aiMove = aiMove(state);
      }
    };
    if (round.enemyFirst) performEnemy();
    if (player.hp > 0 && enemy.hp > 0) {
      const struggle = !hasUsableBattleMove(player, b, true);
      round.playerRemaining--;
      if (action.kind === 'move') {
        if (!struggle && MOVES[player.moves[action.index]!.id]!.effect?.protect)
          round.playerRemaining = 0;
        attack(state, true, action.index, round.immobility, struggle);
      }
    }
    if (round.playerRemaining <= 0) performEnemy();
    if (player.hp > 0 && enemy.hp > 0 && round.playerRemaining > 0) {
      b.logs.push(
        `本回合还可操作 ${round.playerRemaining}/${round.playerTotal} 次，请重新选择技能、道具或换人。`,
      );
      b.phase = 'choose';
      return;
    }
    settleRoundEnd(state);
  } finally {
    finishJournalAction(state, b);
    if (b.logs.length)
      b.visualEvents.push({
        kind: 'scene',
        logIndex: b.logs.length - 1,
        scene: battleScene(state),
      });
  }
}
