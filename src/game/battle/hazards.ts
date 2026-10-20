import { SPECIES } from '../../content/catalog';
import type { Battle, Creature } from '../model';
import { abilityFor, creatureName, statsFor, typeMultiplier } from '../rules';
import { triggerHeldItem } from '../heldItems';

export type HazardSide = 'player' | 'enemy';
export interface EntryHazards {
  rocks?: boolean;
  spikes?: number;
}
export function grounded(creature: Creature): boolean {
  return (
    !SPECIES[creature.speciesId]!.types.includes('flying') &&
    abilityFor(creature).immuneType !== 'ground'
  );
}
export function hazardDamage(creature: Creature, hazards?: EntryHazards): number {
  const hp = statsFor(creature).hp;
  const rock = hazards?.rocks
    ? Math.max(1, Math.floor((hp * typeMultiplier('rock', SPECIES[creature.speciesId]!.types)) / 8))
    : 0;
  const layers = hazards?.spikes ?? 0;
  const spikes =
    layers && grounded(creature)
      ? Math.max(1, Math.floor(hp * [0, 1 / 8, 1 / 6, 1 / 4][layers]!))
      : 0;
  return rock + spikes;
}
export function hazardLabel(hazards?: EntryHazards): string {
  return (
    [hazards?.rocks ? '隐形岩' : '', hazards?.spikes ? `地刺${hazards.spikes}层` : '']
      .filter(Boolean)
      .join('／') || '无'
  );
}
/** Entry only: called after the active identity changes, never on load or initial send-out. */
export function applyEntryHazards(b: Battle, side: HazardSide, creature: Creature): void {
  const hazards = b.hazards?.[side];
  if (!hazards || creature.hp <= 0) return;
  const loss = Math.min(creature.hp, hazardDamage(creature, hazards));
  if (loss > 0) {
    creature.hp -= loss;
    b.logs.push(`${creatureName(creature)}踏入${hazardLabel(hazards)}，损失 ${loss} 点体力。`);
    triggerHeldItem(creature, b.logs);
  } else if (hazards.spikes) b.logs.push(`${creatureName(creature)}浮空避开了地刺。`);
}
