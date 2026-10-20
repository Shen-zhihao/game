import { canLearnMove, isOrdinarySpecies, learnset, MOVES, SPECIES } from '../../content/catalog';
import { worldMapFor } from '../../content/buildings';
import type { GameState } from '../model';
import { fieldSkill } from '../fieldSkills';
import { boxTransferReason } from '../party';
import { creatureName, makeCreature, record } from '../rules';
import { copyableMove } from '../skills';

export const NURSERY_BREEDING_STEPS = 64;
export const NURSERY_HATCH_STEPS = 128;
export const NURSERY_MIN_LEVEL = 10;
export interface NurseryEgg {
  speciesId: string;
  inheritedMoves: string[];
  steps: number;
}
export interface NurseryState {
  /** Reserved partners remain owned in the box, never duplicated in another roster. */
  parents: string[];
  breedingSteps: number;
  waitingEgg: NurseryEgg | null;
  carriedEgg: NurseryEgg | null;
}
export type NurseryAction =
  { kind: 'deposit' | 'withdraw'; creatureId: string } | { kind: 'collect' | 'hatch' };
export function nurseryFor(state: GameState): NurseryState {
  return state.nursery ?? { parents: [], breedingSteps: 0, waitingEgg: null, carriedEgg: null };
}
/** A persistent next-step summary, including readiness after a notice has faded. */
export function nurseryStatus(state: GameState): string {
  const nursery = nurseryFor(state);
  if (!state.progress.flags.catchTutorial) return '完成捕捉入门后，回晨芽镇开启培育。';
  if (nursery.carriedEgg) {
    const remaining = Math.max(0, NURSERY_HATCH_STEPS - nursery.carriedEgg.steps);
    return remaining
      ? `随身蛋还需行走 ${remaining} 步；到达步数后在此确认孵化。`
      : '随身蛋已经可以孵化！在安全状态下点击“确认孵化”。';
  }
  if (nursery.waitingEgg) return '培育屋发现了一枚蛋！回晨芽镇领取后开始孵化计步。';
  if (nursery.parents.length === 2)
    return `双亲正在培育，还需实际行走 ${NURSERY_BREEDING_STEPS - nursery.breedingSteps} 步发现蛋。`;
  return nursery.parents.length === 1
    ? '已寄养一位伙伴，再选择一位同进化家族的 Lv.10 以上普通伙伴。'
    : '先在晨芽镇寄养两位同进化家族的 Lv.10 以上普通伙伴。';
}
export const isNurseryParent = (state: GameState, id: string): boolean =>
  nurseryFor(state).parents.includes(id);
export function nurseryOffspringSpecies(state: GameState): string | null {
  const parent = state.creatures[nurseryFor(state).parents[0] ?? ''];
  if (!parent) return null;
  return (
    Object.values(SPECIES).find(
      (species) =>
        species.familyId === SPECIES[parent.speciesId]?.familyId &&
        species.evolvesFromId === null &&
        isOrdinarySpecies(species.id),
    )?.id ?? null
  );
}
export function nurseryParentReason(state: GameState, id: string): string | null {
  const nursery = nurseryFor(state);
  const creature = state.creatures[id];
  if (!creature || ![...state.party, ...state.box].includes(id)) return '请选择自己的伙伴。';
  if (nursery.parents.includes(id)) return '这位伙伴已经在培育屋照料中。';
  if (nursery.parents.length >= 2) return '培育屋最多照料两位伙伴，请先取回一位。';
  if (!isOrdinarySpecies(creature.speciesId)) return '特殊剧情精灵不能参与培育。';
  if (creature.level < NURSERY_MIN_LEVEL) return '参与培育的伙伴需要达到 Lv.10。';
  const first = state.creatures[nursery.parents[0] ?? ''];
  if (first && SPECIES[first.speciesId]!.familyId !== SPECIES[creature.speciesId]!.familyId)
    return '请选择同一进化家族的两位不同伙伴。';
  if (state.party.includes(id)) return boxTransferReason(state, id, false);
  return null;
}
export function inheritedNurseryMoves(state: GameState): string[] {
  const nursery = nurseryFor(state);
  const speciesId = nurseryOffspringSpecies(state);
  if (nursery.parents.length !== 2 || !speciesId) return [];
  const parents = nursery.parents.map((id) => state.creatures[id]);
  return [
    ...new Set(
      learnset(speciesId)
        .sort((a, b) => b.level - a.level)
        .map((m) => m.moveId),
    ),
  ]
    .filter(
      (id) =>
        copyableMove(id) &&
        canLearnMove(speciesId, id) &&
        !fieldSkill(id) &&
        parents.every((parent) => parent?.moves.some((move) => move.id === id)),
    )
    .slice(0, 2);
}
export function nurseryActionReason(state: GameState, action: NurseryAction): string | null {
  if (
    state.battle ||
    state.dialogue ||
    state.pending.length ||
    state.progress.flags.starterChoice ||
    state.activities?.active ||
    state.challenge?.active ||
    state.league?.active ||
    state.world?.trainerChallenge
  )
    return '请先完成战斗、对话、挑战或成长选择，再使用培育屋。';
  if (!state.progress.flags.catchTutorial) return '完成捕捉入门后即可使用培育屋。';
  if (action.kind !== 'hatch' && worldMapFor(state.player.map) !== 'dawn')
    return '请回到晨芽镇，在菜单的培育屋办理寄养、取回与领蛋。';
  const nursery = nurseryFor(state);
  switch (action.kind) {
    case 'deposit':
      return nurseryParentReason(state, action.creatureId);
    case 'withdraw':
      return nursery.parents.includes(action.creatureId) ? null : '这位伙伴不在培育屋。';
    case 'collect':
      if (nursery.carriedEgg) return '已经携带一枚蛋，请先完成孵化。';
      return nursery.waitingEgg ? null : '目前没有可领取的蛋。';
    case 'hatch':
      if (!nursery.carriedEgg) return '请先到晨芽镇领取一枚蛋。';
      if (nursery.carriedEgg.steps < NURSERY_HATCH_STEPS) return '蛋还需要陪伴行走一段路。';
      return state.party.length >= 6 && state.box.length >= 360
        ? '队伍和仓库已满，请先腾出一个位置；蛋会保留。'
        : null;
  }
}
export function applyNurseryAction(state: GameState, action: NurseryAction): void {
  const reason = nurseryActionReason(state, action);
  if (reason) {
    state.notice = reason;
    return;
  }
  const nursery = (state.nursery ??= nurseryFor(state));
  switch (action.kind) {
    case 'deposit': {
      const index = state.party.indexOf(action.creatureId);
      if (index >= 0) {
        state.party.splice(index, 1);
        state.box.push(action.creatureId);
      }
      nursery.parents.push(action.creatureId);
      nursery.breedingSteps = 0;
      state.notice = `${creatureName(state.creatures[action.creatureId]!)}已交给培育屋照料，仍占用一个仓库位置。`;
      break;
    }
    case 'withdraw':
      nursery.parents = nursery.parents.filter((id) => id !== action.creatureId);
      nursery.breedingSteps = 0;
      state.notice = '伙伴已结束寄养并留在仓库，可再将它加入队伍。已有的蛋不会丢失。';
      break;
    case 'collect':
      nursery.carriedEgg = nursery.waitingEgg;
      nursery.waitingEgg = null;
      state.notice = '领取了精灵蛋！实际行走128步后，可在培育屋菜单确认孵化。';
      break;
    case 'hatch': {
      const egg = nursery.carriedEgg!;
      const creature = makeCreature(state, egg.speciesId, 1);
      const inherited = egg.inheritedMoves;
      const natural = creature.moves.filter((move) => !inherited.includes(move.id));
      creature.moves = [
        ...natural.slice(0, 4 - inherited.length),
        ...inherited.map((id) => ({ id, pp: MOVES[id]!.pp })),
      ];
      creature.taughtMoves = [...inherited];
      creature.history = [{ kind: 'caught', label: '从精灵蛋中孵化，成为新的伙伴', level: 1 }];
      for (const id of inherited) record(creature, 'learned', `遗传学会${MOVES[id]!.name}`);
      state.creatures[creature.id] = creature;
      const inParty = state.party.length < 6;
      (inParty ? state.party : state.box).push(creature.id);
      if (!state.dex.seen.includes(creature.speciesId)) state.dex.seen.push(creature.speciesId);
      if (!state.dex.caught.includes(creature.speciesId)) state.dex.caught.push(creature.speciesId);
      nursery.carriedEgg = null;
      nursery.breedingSteps = 0;
      state.notice = `${creatureName(creature)}孵化了！Lv.1 的新伙伴已${inParty ? '加入队伍' : '送入仓库'}。`;
      break;
    }
  }
}
/** Called exactly once per successful tile/portal traversal; no ticking or idle progress. */
export function walkNursery(state: GameState): void {
  const nursery = state.nursery;
  if (!nursery || state.challenge?.active || state.league?.active) return;
  if (nursery.carriedEgg) {
    const previousSteps = nursery.carriedEgg.steps;
    nursery.carriedEgg.steps = Math.min(NURSERY_HATCH_STEPS, previousSteps + 1);
    if (previousSteps < NURSERY_HATCH_STEPS && nursery.carriedEgg.steps === NURSERY_HATCH_STEPS)
      state.notice = '精灵蛋可以孵化了！打开菜单 → 培育屋，确认迎接新伙伴。';
    return;
  }
  if (nursery.waitingEgg || nursery.parents.length !== 2) return;
  nursery.breedingSteps = Math.min(NURSERY_BREEDING_STEPS, nursery.breedingSteps + 1);
  if (nursery.breedingSteps < NURSERY_BREEDING_STEPS) return;
  const speciesId = nurseryOffspringSpecies(state);
  if (!speciesId) return;
  nursery.waitingEgg = { speciesId, inheritedMoves: inheritedNurseryMoves(state), steps: 0 };
  nursery.breedingSteps = 0;
  state.notice = '培育屋发现了一枚精灵蛋！回晨芽镇，打开菜单 → 培育屋领取。';
}

/** Semantic validation supplements the strict persisted shape, without modifying a save. */
export function validNursery(state: GameState): boolean {
  const nursery = state.nursery;
  if (!nursery) return true;
  if (
    !Array.isArray(nursery.parents) ||
    nursery.parents.length > 2 ||
    new Set(nursery.parents).size !== nursery.parents.length ||
    !Number.isInteger(nursery.breedingSteps) ||
    nursery.breedingSteps < 0 ||
    nursery.breedingSteps >= NURSERY_BREEDING_STEPS
  )
    return false;
  if (
    !state.progress.flags.catchTutorial &&
    (nursery.parents.length > 0 || nursery.waitingEgg || nursery.carriedEgg)
  )
    return false;
  const parents = nursery.parents.map((id) => state.creatures[id]);
  if (
    nursery.parents.some(
      (id, i) =>
        !Object.hasOwn(state.creatures, id) ||
        !Object.hasOwn(SPECIES, parents[i]?.speciesId ?? '') ||
        !state.box.includes(id) ||
        state.party.includes(id) ||
        !parents[i] ||
        parents[i]!.level < NURSERY_MIN_LEVEL ||
        !isOrdinarySpecies(parents[i]!.speciesId),
    )
  )
    return false;
  if (
    parents.length === 2 &&
    SPECIES[parents[0]!.speciesId]!.familyId !== SPECIES[parents[1]!.speciesId]!.familyId
  )
    return false;
  if (nursery.waitingEgg && nursery.carriedEgg) return false;
  if (
    (nursery.parents.length !== 2 || nursery.waitingEgg || nursery.carriedEgg) &&
    nursery.breedingSteps !== 0
  )
    return false;
  return [nursery.waitingEgg, nursery.carriedEgg].every((egg, index) => {
    if (egg === null) return true;
    if (
      !egg ||
      !Object.hasOwn(SPECIES, egg.speciesId) ||
      !isOrdinarySpecies(egg.speciesId) ||
      SPECIES[egg.speciesId]!.evolvesFromId !== null ||
      !Number.isInteger(egg.steps) ||
      egg.steps < 0 ||
      egg.steps > (index === 0 ? 0 : NURSERY_HATCH_STEPS) ||
      !Array.isArray(egg.inheritedMoves) ||
      egg.inheritedMoves.length > 2 ||
      new Set(egg.inheritedMoves).size !== egg.inheritedMoves.length
    )
      return false;
    return egg.inheritedMoves.every(
      (id) =>
        copyableMove(id) &&
        canLearnMove(egg.speciesId, id) &&
        !fieldSkill(id) &&
        learnset(egg.speciesId).some((move) => move.moveId === id),
    );
  });
}
