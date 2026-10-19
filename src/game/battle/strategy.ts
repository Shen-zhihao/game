import { canLearnMove, learnset, MOVES, SPECIES } from '../../content/catalog';
import { trainerTactic } from '../../content/trainerTactics';
import type { Battle, Creature, GameState, Stages, WeatherId } from '../model';
import { criticalChance, hitChance, roundPace, stageLimit } from '../combat';
import { abilityFor, calculateDamage, statsFor, typeMultiplier } from '../rules';

/** Keep authored teams and level curves; give every member a legal, purposeful loadout. */
export function curateTrainerTeam(event: string | null, team: Creature[]): void {
  const tactic = trainerTactic(event);
  if (!tactic) return;
  team.forEach((creature, index) => {
    const available = learnset(creature.speciesId)
      .filter(
        (entry) => entry.level <= creature.level && canLearnMove(creature.speciesId, entry.moveId),
      )
      .map((entry) => entry.moveId);
    const attacks = available
      .filter((id) => MOVES[id]!.power > 0)
      .sort((a, b) => {
        const value = (id: string) =>
          MOVES[id]!.power *
          (SPECIES[creature.speciesId]!.types.includes(MOVES[id]!.type!) ? 1.5 : 1);
        return value(b) - value(a);
      });
    const selected = attacks.slice(0, 1);
    const coverage = attacks.find((id) => MOVES[id]!.type !== MOVES[selected[0] ?? 'tackle']!.type);
    if (coverage) selected.push(coverage);
    // The lead enables weather/control; later members alternate sustain and setup roles.
    const preferences =
      index === 0
        ? tactic.support
        : [
            ...tactic.support.slice(index % tactic.support.length),
            ...tactic.support.slice(0, index % tactic.support.length),
          ];
    for (const id of preferences) {
      if (selected.length >= 4) break;
      if (available.includes(id) && !selected.includes(id)) selected.push(id);
    }
    for (const id of attacks) {
      if (selected.length >= 4) break;
      if (!selected.includes(id)) selected.push(id);
    }
    creature.moves = selected.map((id) => ({ id, pp: MOVES[id]!.pp }));
  });
}
function expectedDamage(
  attacker: Creature,
  defender: Creature,
  id: string,
  a: Partial<Stages>,
  d: Partial<Stages>,
  weather?: WeatherId,
): number {
  const move = MOVES[id]!;
  if (!move.power) return 0;
  return (
    calculateDamage(attacker, defender, id, a, d, 1, false, weather).damage *
    hitChance(id, a, d, weather, attacker) *
    (1 + criticalChance(id, a, d, attacker)) *
    (attacker.status === 'freeze' && move.type !== 'fire' ? 0.2 : 1) *
    (attacker.confusionTurns ? 2 / 3 : 1)
  );
}
function bestDamage(
  attacker: Creature,
  defender: Creature,
  a: Partial<Stages>,
  d: Partial<Stages>,
  weather?: WeatherId,
): number {
  const usable = attacker.moves.filter((slot) => slot.pp > 0);
  return Math.max(
    0,
    ...(usable.length
      ? usable.map((slot) => expectedDamage(attacker, defender, slot.id, a, d, weather))
      : [expectedDamage(attacker, defender, 'struggle', a, d, weather)]),
  );
}
function statusImmune(defender: Creature, id: string): boolean {
  const move = MOVES[id]!,
    status = move.effect?.status;
  const types = SPECIES[defender.speciesId]!.types;
  return (
    !!defender.status ||
    abilityFor(defender).immuneStatus === status ||
    (status === 'burn' && types.includes('fire')) ||
    (status === 'poison' && (types.includes('poison') || types.includes('steel'))) ||
    (status === 'paralysis' && types.includes('electric')) ||
    (status === 'freeze' && types.includes('ice'))
  );
}
/** Only leaders and league opponents carry active medicine, never apprentices or rule challenges. */
export function trainerMedicine(event: string | null): Battle['enemyMedicine'] {
  if (
    [
      'leader',
      'rockLeader',
      'waterLeader',
      'electricLeader',
      'windLeader',
      'fireLeader',
      'psychicLeader',
      'starLeader',
    ].includes(event ?? '')
  )
    return { itemId: 'super_potion', remaining: 1 };
  if (
    ['leagueIce', 'leagueGhost', 'leagueDark', 'leagueDragon', 'leagueChampion'].includes(
      event ?? '',
    )
  )
    return { itemId: 'hyper_potion', remaining: 2 };
  return undefined;
}
export function chooseEnemyItem(state: GameState): NonNullable<Battle['actionRound']>['enemyItem'] {
  const b = state.battle!,
    medicine = b.enemyMedicine;
  if (
    b.kind !== 'trainer' ||
    b.ruleChallenge ||
    !trainerMedicine(b.event) ||
    !medicine ||
    medicine.remaining <= 0
  )
    return;
  const enemy = b.enemies[b.enemyIndex]!;
  if (enemy.hp > 0 && enemy.hp <= statsFor(enemy).hp / 3) return medicine.itemId;
  return undefined;
}
export function chooseEnemyMove(state: GameState): number {
  const b = state.battle!,
    enemy = b.enemies[b.enemyIndex]!,
    player = state.creatures[b.playerId]!;
  const tactic =
    b.kind === 'trainer' ? trainerTactic(b.ruleChallenge ? 'leagueChampion' : b.event) : null;
  const damage = bestDamage(enemy, player, b.enemyStages, b.playerStages, b.weather?.kind);
  const incoming = bestDamage(player, enemy, b.playerStages, b.enemyStages, b.weather?.kind);
  let best = -1,
    bestScore = -Infinity;
  enemy.moves.forEach((slot, index) => {
    if (slot.pp <= 0 || !canLearnMove(enemy.speciesId, slot.id)) return;
    const move = MOVES[slot.id]!,
      effect = move.effect;
    let score = expectedDamage(
      enemy,
      player,
      slot.id,
      b.enemyStages,
      b.playerStages,
      b.weather?.kind,
    );
    const immune =
      effect?.target !== 'self' &&
      !effect?.confusion &&
      (abilityFor(player).immuneType === move.type ||
        typeMultiplier(move.type, SPECIES[player.speciesId]!.types) === 0);
    if (immune) score = 0;
    const supportReady = !!tactic && b.turn - (b.aiTactics?.lastSupportTurn ?? -10) >= 2;
    if (!move.power && !immune && supportReady) {
      const safe = enemy.hp > incoming * 1.5;
      if (effect?.heal) {
        const missing = statsFor(enemy).hp - enemy.hp;
        const heal =
          statsFor(enemy).hp *
          (slot.id === 'recover'
            ? b.weather?.kind === 'sun'
              ? 2 / 3
              : ['rain', 'storm', 'sand', 'snow'].includes(b.weather?.kind ?? '')
                ? 0.25
                : effect.heal
            : effect.heal);
        score =
          missing > statsFor(enemy).hp * 0.35 && enemy.hp > incoming
            ? Math.min(missing, heal) * 1.2
            : 0;
      } else if (
        (effect?.status &&
          !statusImmune(player, slot.id) &&
          !(effect.status === 'freeze' && b.weather?.kind === 'sun')) ||
        (effect?.confusion && !player.confusionTurns)
      ) {
        score =
          safe && player.hp > damage * 1.3
            ? Math.max(8, damage * 1.35) *
              hitChance(slot.id, b.enemyStages, b.playerStages, b.weather?.kind, enemy)
            : 0;
      } else if (effect?.stage) {
        const stages = effect.target === 'self' ? b.enemyStages : b.playerStages;
        const current = stages[effect.stage] ?? 0,
          amount = effect.amount ?? 0;
        const changed =
          Math.max(
            -stageLimit(effect.stage),
            Math.min(stageLimit(effect.stage), current + amount),
          ) !== current;
        score =
          safe && changed && Math.abs(current) < 2 && player.hp > damage * 2
            ? Math.max(6, damage * 1.15)
            : 0;
      } else if (move.weather && move.weather !== b.weather?.kind) {
        const future = bestDamage(enemy, player, b.enemyStages, b.playerStages, move.weather);
        const speedBenefit =
          roundPace(player, enemy, b.playerStages, b.enemyStages, move.weather).enemyActions >
          roundPace(player, enemy, b.playerStages, b.enemyStages, b.weather?.kind).enemyActions;
        score =
          safe &&
          player.hp > damage * 2 &&
          (future > damage * 1.1 || speedBenefit || tactic?.weather === move.weather)
            ? Math.max(8, damage * 1.2)
            : 0;
      }
    }
    // Damaging secondary effects add value without replacing the actual attack damage.
    if (
      move.power &&
      !immune &&
      ((effect?.status &&
        !statusImmune(player, slot.id) &&
        !(effect.status === 'freeze' && b.weather?.kind === 'sun')) ||
        (effect?.confusion && !player.confusionTurns))
    )
      score += 3 * (effect!.chance ?? 1);
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}
export function chooseEnemySwitch(state: GameState): number | undefined {
  const b = state.battle!,
    tactic =
      b.kind === 'trainer' ? trainerTactic(b.ruleChallenge ? 'leagueChampion' : b.event) : null;
  if (
    !tactic ||
    b.turn - (b.aiTactics?.lastSwitchTurn ?? -10) < 3 ||
    (b.aiTactics?.switches ?? 0) >= tactic.switchBudget
  )
    return;
  const current = b.enemies[b.enemyIndex]!,
    player = state.creatures[b.playerId]!;
  const threat =
    bestDamage(player, current, b.playerStages, b.enemyStages, b.weather?.kind) /
    Math.max(1, current.hp);
  const offense =
    bestDamage(current, player, b.enemyStages, b.playerStages, b.weather?.kind) /
    Math.max(1, player.hp);
  // Never surrender an available knockout or pivot merely because another member is marginally better.
  if (
    (offense >= 1 &&
      current.status !== 'sleep' &&
      current.status !== 'freeze' &&
      !current.confusionTurns) ||
    (threat < 0.45 &&
      offense > 0.1 &&
      current.status !== 'sleep' &&
      current.status !== 'freeze' &&
      !current.confusionTurns)
  )
    return;
  let best: number | undefined,
    bestGain = 0.4;
  b.enemies.forEach((candidate, index) => {
    if (
      index === b.enemyIndex ||
      candidate.hp <= 0 ||
      !candidate.moves.some((slot) => slot.pp > 0 && MOVES[slot.id]!.power)
    )
      return;
    const nextThreat =
      bestDamage(player, candidate, b.playerStages, {}, b.weather?.kind) / candidate.hp;
    const nextOffense =
      bestDamage(candidate, player, {}, b.playerStages, b.weather?.kind) / Math.max(1, player.hp);
    const gain = Math.min(2, threat) - nextThreat + nextOffense - offense;
    if (nextThreat < 0.65 && nextOffense > 0.1 && gain > bestGain) {
      best = index;
      bestGain = gain;
    }
  });
  return best;
}
export function recordEnemySupport(b: Battle, moveId: string): void {
  if (!MOVES[moveId]!.power && trainerTactic(b.ruleChallenge ? 'leagueChampion' : b.event)) {
    b.aiTactics ??= { lastSwitchTurn: -10, switches: 0, lastSupportTurn: -10 };
    b.aiTactics.lastSupportTurn = b.turn;
  }
}
