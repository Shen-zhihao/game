import type { Npc } from '../world';
import { FIELD_ACTIVITIES, type ActivityKind } from '../fieldActivities';

export type FieldObjectKind =
  | 'seedlings'
  | 'waterChannels'
  | 'circuit'
  | 'mining'
  | 'bells'
  | 'forge'
  | 'mirrors'
  | 'balance'
  | 'puzzle'
  | 'weight'
  | 'bread'
  | 'sail'
  | 'branch'
  | 'tracks'
  | 'journal'
  | 'chart'
  | 'marker'
  | 'gauge'
  | 'weatherVane'
  | 'kite'
  | 'crystal'
  | 'crate'
  | 'toolbox'
  | 'observation';

const ACTIVITY_OBJECTS: Record<ActivityKind, FieldObjectKind> = {
  garden: 'seedlings',
  pipes: 'waterChannels',
  excavate: 'mining',
  fish: 'sail',
  bells: 'bells',
  forge: 'forge',
  mirrors: 'mirrors',
  balance: 'balance',
  slide: 'puzzle',
  push: 'weight',
};
const ACTIVITY_PROPS = Object.fromEntries(
  Object.values(FIELD_ACTIVITIES).map((d) => [
    d.npcId,
    d.id === 'activity_volt' || d.id.startsWith('puzzle_electric_')
      ? ('circuit' as const)
      : ACTIVITY_OBJECTS[d.kind],
  ]),
);
const ACTIVITY_GOALS = Object.fromEntries(
  Object.values(FIELD_ACTIVITIES).map((d) => [d.npcId, d.goalFlag]),
);
const CLUE_OBJECTS: Record<string, FieldObjectKind> = {
  clueOne: 'branch',
  clueTwo: 'tracks',
  mistClueOne: 'observation',
  mistClueTwo: 'observation',
  mistShrine: 'marker',
  habitat: 'observation',
  miningPlaque: 'marker',
  mineClueOne: 'mining',
  mineClueTwo: 'crystal',
  bellStone: 'bells',
  shoreObservation: 'observation',
  cargoManifest: 'journal',
  tideChart: 'chart',
  sluiceGauge: 'gauge',
  poolObservation: 'observation',
  parcelTag: 'crate',
  parcelReceipt: 'journal',
  powerManifest: 'journal',
  powerCircuit: 'circuit',
  shiftWest: 'journal',
  shiftEast: 'journal',
  kiteLine: 'kite',
  migrationLow: 'observation',
  pactStone: 'marker',
  windArchive: 'chart',
  windVane: 'weatherVane',
  migrationPeak: 'observation',
  migrationNest: 'observation',
  pactName: 'journal',
  toolCase: 'toolbox',
  oldFreight: 'marker',
  foundryCrate: 'crate',
  foundryPressure: 'gauge',
  oldLedger: 'journal',
  springCold: 'gauge',
  springWarm: 'gauge',
  oldSketch: 'chart',
  mirrorFootOne: 'tracks',
  lakeArchiveOne: 'journal',
  lakeArchiveTwo: 'chart',
  currentSketch: 'chart',
  rubbingNorth: 'chart',
  rubbingEast: 'chart',
  rubbingSouth: 'chart',
  mirrorFootTwo: 'tracks',
  coreReadout: 'chart',
  templePact: 'marker',
  nightCold: 'marker',
  nightFlame: 'marker',
  woodNote: 'observation',
  meadowNote: 'observation',
  echoPeak: 'marker',
  echoValley: 'marker',
  echoCliff: 'marker',
  mineAir: 'gauge',
  mineStone: 'gauge',
  mineWater: 'observation',
  shoreNote: 'observation',
  shipArchive: 'journal',
};

/** Visual meaning belongs to the object, rather than the generic interaction role. */
export function fieldObjectFor(npc: Pick<Npc, 'id' | 'role'>): FieldObjectKind | null {
  if (ACTIVITY_PROPS[npc.id]) return ACTIVITY_PROPS[npc.id]!;
  if (npc.id.endsWith('_craft_bakery')) return 'bread';
  if (npc.id.endsWith('_craft_library')) return 'journal';
  if (npc.id.endsWith('_craft_workshop')) return 'sail';
  if (CLUE_OBJECTS[npc.id]) return CLUE_OBJECTS[npc.id]!;
  if (npc.role === 'clue' || npc.role === 'discovery') return 'journal';
  if (npc.role === 'echo') return 'marker';
  return null;
}

export function fieldObjectSize(kind: FieldObjectKind): number {
  return ['branch', 'tracks'].includes(kind)
    ? 40
    : ['journal', 'marker', 'gauge', 'crystal', 'crate', 'toolbox'].includes(kind)
      ? 46
      : 60;
}

export const fieldObjectFlag = (npcId: string): string => ACTIVITY_GOALS[npcId] ?? npcId;
