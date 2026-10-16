import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALL_SPECIES, spriteFor } from '../src/content/catalog';
import {
  BATTLE_SCENES,
  MAP_BATTLE_THEMES,
  battleAnchors,
  battleTheme,
} from '../src/content/battleScenes';
import { spriteFrame, spriteLayout } from '../src/content/spriteFrames';
import { MAPS } from '../src/content/world';

describe('完整精灵轮廓与地区战场', () => {
  it('250个形态都有真实取图区，PNG尺寸一致，火焰和尾部留出完整边距', () => {
    for (const species of ALL_SPECIES) {
      const sprite = spriteFor(species.id)!;
      const f = spriteFrame(sprite);
      const png = readFileSync(`assets/creatures-${sprite.atlas}.png`);
      expect(png.readUInt32BE(16)).toBe(f.atlasWidth);
      expect(png.readUInt32BE(20)).toBe(f.atlasHeight);
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.y).toBeGreaterThanOrEqual(0);
      expect(f.x + f.width).toBeLessThanOrEqual(f.atlasWidth);
      expect(f.y + f.height).toBeLessThanOrEqual(f.atlasHeight);
      for (const size of [48, 100, 228]) {
        const box = spriteLayout(sprite, size).crop;
        expect(box.left).toBeGreaterThanOrEqual(size * 0.07 - 1e-8);
        expect(box.top).toBeGreaterThanOrEqual(size * 0.07 - 1e-8);
        expect(box.left + box.width).toBeLessThanOrEqual(size * 0.93 + 1e-8);
        expect(box.top + box.height).toBeLessThanOrEqual(size * 0.93 + 1e-8);
      }
    }
    expect(spriteFor('creature_017')!.atlas).toBe('moth');
    const dragon = spriteFrame(spriteFor('creature_250')!);
    expect(dragon.x + dragon.width).not.toBe(dragon.atlasWidth * 0.75);
  });
  it('46张地图明确选择9种战场，主题城市、路线与道馆一致，联盟精英有主题区分', () => {
    expect(Object.keys(MAP_BATTLE_THEMES).sort()).toEqual(Object.keys(MAPS).sort());
    expect(new Set(Object.values(MAP_BATTLE_THEMES)).size).toBe(9);
    for (const scene of Object.values(BATTLE_SCENES))
      expect(existsSync(`assets/maps/${scene.file}`)).toBe(true);
    expect(battleTheme('volt')).toBe(battleTheme('electricGym'));
    expect(battleTheme('furnace')).toBe(battleTheme('fireGym'));
    expect(battleTheme('lake')).not.toBe(battleTheme('volt'));
    expect(battleTheme('star')).not.toBe(battleTheme('furnace'));
    expect(battleTheme('leagueHall', 'leagueIce')).toBe('wind');
    expect(battleTheme('leagueHall', 'leagueChampion')).toBe('league');
  });
  it('场景与角色特效共享cover定位，在不同尺寸下坐标有限且保持对角站位', () => {
    for (const theme of Object.keys(BATTLE_SCENES) as (keyof typeof BATTLE_SCENES)[])
      for (const [width, height] of [
        [1280, 540],
        [844, 276],
        [667, 261],
      ]) {
        const a = battleAnchors(theme, width!, height!);
        expect(Number.isFinite(a.player.x) && Number.isFinite(a.enemy.y)).toBe(true);
        expect(a.player.x).toBeLessThan(a.enemy.x);
        expect(a.player.y).toBeGreaterThan(a.enemy.y);
      }
  });
});
