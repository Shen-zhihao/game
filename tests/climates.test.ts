import { describe, expect, it } from 'vitest';
import { climateFor, naturalWeatherChoices } from '../src/content/climates';
import { MAPS, TOWN_REST } from '../src/content/world';
import { reduceGame } from '../src/game/engine';
import { isIndoor, weatherAt } from '../src/game/environment';
import type { WeatherId } from '../src/game/model';
import { createSnapshot, decodeSnapshot } from '../src/persistence/snapshot';
import { fixture, testEntropy } from './helpers';

describe('完整地区的战斗外自然天气', () => {
  it('后续海湾、高山、火山、湖畔采用对应区域气候，所有室外区域均有可轮换天气', () => {
    expect(climateFor('kelpCove')).toEqual(climateFor('harbor'));
    expect(climateFor('windSanctuary').weights.snow).toBeGreaterThan(
      climateFor('dawn').weights.snow,
    );
    expect(climateFor('furnace').weights.snow).toBe(0);
    expect(climateFor('kelpCove').weights.snow).toBe(0);
    expect(climateFor('lake').weights.fog).toBeGreaterThan(climateFor('dawn').weights.fog);
    for (const map of Object.values(MAPS).filter((m) => !isIndoor(m.id))) {
      const profile = climateFor(map.id);
      expect(Object.values(profile.weights).reduce((n, weight) => n + weight, 0)).toBe(100);
      for (const current of Object.keys(profile.weights) as WeatherId[]) {
        const choices = naturalWeatherChoices(map.id, current);
        expect(choices.length).toBeGreaterThan(1);
        expect(choices.every(([weather, weight]) => weather !== current && weight > 0)).toBe(true);
      }
    }
  });
  it('火山环境真实轮换且不降雪，天气与倒计时冷读取保留；室内暂停', () => {
    let g = fixture();
    g.player.map = 'furnace';
    Object.assign(g.player, TOWN_REST.furnace);
    const seen = new Set<WeatherId>();
    for (let i = 0; i < 40; i++) {
      g.environment!.remaining = 1;
      const rng = g.rng;
      g = reduceGame(g, { kind: 'tick', seconds: 1 });
      expect(g.rng).toBe(rng);
      expect(weatherAt(g)).not.toBe('snow');
      seen.add(weatherAt(g));
      expect(g.environment!.remaining).toBeGreaterThanOrEqual(180);
      expect(g.environment!.remaining).toBeLessThanOrEqual(360);
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
    const cold = decodeSnapshot(JSON.stringify(createSnapshot(g, testEntropy, null))).game;
    expect(cold.environment).toEqual(g.environment);
    g.environment!.weather = 'snow';
    expect(weatherAt(g)).toBe('clear');
    expect(weatherAt(g, 'wind')).toBe('snow');
    g.player.map = 'fireGym';
    const env = structuredClone(g.environment);
    expect(reduceGame(g, { kind: 'tick', seconds: 10 }).environment).toEqual(env);
  });
});
