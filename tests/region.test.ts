import { describe, expect, it } from 'vitest';
import campaign from '../docs/data/campaign-plan.json';
import {
  localMapPoint,
  regionPlaceForMap,
  regionRoadOpen,
  REGION_PLACES,
  REGION_ROADS,
  REGION_SIZE,
} from '../src/content/region';
import { MAPS } from '../src/content/world';
import { MapId } from '../src/game/model';
import { ADVENTURE_GYMS } from '../src/content/adventure';

describe('地区地图与实际世界一致', () => {
  it('全部当前地图都有地点，室内道馆定位到所属城镇', () => {
    for (const map of Object.keys(MAPS) as MapId[]) {
      const place = regionPlaceForMap(map);
      expect(place.map).toBe(
        map === 'gym'
          ? 'moss'
          : map === 'rockGym'
            ? 'stone'
            : map === 'waterGym'
              ? 'harbor'
              : (ADVENTURE_GYMS.find((g) => g.map === map)?.town ?? map),
      );
      for (const portal of MAPS[map].portals) {
        const destination = regionPlaceForMap(portal.map);
        if (place.id !== destination.id) {
          expect(
            REGION_ROADS.some(
              ([a, b]) =>
                (a === place.id && b === destination.id) ||
                (b === place.id && a === destination.id),
            ),
          ).toBe(true);
        }
      }
    }
  });

  it('展示八座道馆、联盟及全部地区的相通路线，后续区域不会伪装为可进入地图', () => {
    expect(new Set(REGION_PLACES.map((p) => p.id)).size).toBe(REGION_PLACES.length);
    expect(regionRoadOpen('town-3', 'moss')).toBe(false);
    expect(regionRoadOpen('town-2', 'coastRoute')).toBe(true);
    expect(regionRoadOpen('coastRoute', 'town-3')).toBe(true);
    expect(regionRoadOpen('town-3', 'tideworks')).toBe(true);
    for (const gym of campaign.gyms) {
      const place = REGION_PLACES.find((p) => p.gym === gym.number)!;
      expect(place.name).toBe(gym.town);
      expect(place.services).toContain(gym.badge);
      expect(!!place.map).toBe(
        gym.number <= 3 || ADVENTURE_GYMS.some((g) => g.number === gym.number),
      );
    }
    const visited = new Set(['dawn']);
    for (let step = 0; step < REGION_PLACES.length; step++) {
      for (const [a, b] of REGION_ROADS) {
        expect(REGION_PLACES.some((p) => p.id === a)).toBe(true);
        expect(REGION_PLACES.some((p) => p.id === b)).toBe(true);
        if (visited.has(a)) visited.add(b);
        if (visited.has(b)) visited.add(a);
      }
    }
    expect(visited.size).toBe(REGION_PLACES.length);
    for (const place of REGION_PLACES) {
      expect(place.x).toBeGreaterThan(0);
      expect(place.y).toBeGreaterThan(0);
      expect(place.x).toBeLessThan(REGION_SIZE.width);
      expect(place.y).toBeLessThan(REGION_SIZE.height);
    }
  });

  it('30×20外景和24×16道馆的玩家与出入口，均使用各自真实尺寸定位', () => {
    for (const map of Object.keys(MAPS) as MapId[]) {
      const rows = MAPS[map].rows;
      const rightBottom = localMapPoint(map, rows[0]!.length - 1, rows.length - 1);
      expect(rightBottom.x).toBeCloseTo(1 - 0.5 / rows[0]!.length);
      expect(rightBottom.y).toBeCloseTo(1 - 0.5 / rows.length);
      for (const portal of MAPS[map].portals) {
        const pin = localMapPoint(map, portal.x, portal.y);
        expect(pin.x).toBeGreaterThan(0);
        expect(pin.y).toBeGreaterThan(0);
        expect(pin.x).toBeLessThan(1);
        expect(pin.y).toBeLessThan(1);
      }
    }
    expect(localMapPoint('dawn', 0, 0)).not.toEqual(localMapPoint('gym', 0, 0));
  });
});
