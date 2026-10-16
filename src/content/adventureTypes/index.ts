import type { GameMap, Encounter } from '../world';
import type { MapId, StoryEvent, TownId } from '../../game/model';

export interface AdventureTrainer {
  name: string;
  team: [string, number][];
  reward: number;
  practice?: boolean;
}
export interface AdventureRule {
  jump?: { map: MapId; x: number; y: number };
  masterBallSource?: string;
  clears?: string[];
  when?: string[];
  absent?: string[];
  sets?: string[];
  lines: string[];
  money?: number;
  items?: Record<string, number>;
}
export interface AdventureInteraction {
  requires?: string[];
  locked?: string[];
  rules: AdventureRule[];
  repeat: string[];
}
export interface AdventureGym {
  number: number;
  town: TownId;
  map: MapId;
  gate: string;
  leader: StoryEvent;
  scout: StoryEvent;
  keeper: StoryEvent;
  switches: [string, string];
  badge: string;
  tool: string;
  toolName: string;
  entrance: { x: number; y: number };
  barriers: [number, number, string][];
  switchDescriptions?: [string, string];
  intro?: string;
  lesson?: string;
}
export interface AdventureEncounter {
  speciesId: string;
  level: number;
  requires: string[];
  awakened: string;
  caught: string;
  name: string;
}
export interface AdventureChapter {
  number: number;
  title: string;
  town: TownId;
  maps: GameMap[];
  trainers: Partial<Record<StoryEvent, AdventureTrainer>>;
  gym: AdventureGym;
  interactions: Record<string, AdventureInteraction>;
  prerequisites: Record<string, string[]>;
  milestones: [string, string][];
  objectives: Partial<Record<MapId, [string, string][]>>;
  rest: { x: number; y: number };
  finds: Partial<Record<MapId, [number, number][]>>;
  indoor: MapId[];
  encounters?: Partial<Record<StoryEvent, AdventureEncounter>>;
  links: {
    from: MapId;
    exit: GameMap['portals'][number];
    paths: [number, number, number, number][];
  }[];
}
export function terrain(width: number, height: number, ground = '.') {
  const cells = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? '#' : ground,
    ),
  );
  return {
    fill(x: number, y: number, w: number, h: number, tile: string) {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) cells[yy]![xx] = tile;
    },
    rows: () => cells.map((r) => r.join('')),
  };
}
export const encounter = (number: number, min: number, max: number, weight: number): Encounter => ({
  speciesId: `creature_${String(number).padStart(3, '0')}`,
  min,
  max,
  weight,
});
