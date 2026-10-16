import type { WeatherId } from '../model';

/** Stable, irregular sampling: opening a menu must not reshuffle the weather. */
export function weatherNoise(index: number, salt = 0) {
  let n = Math.imul(index + 1, 0x45d9f3b) ^ Math.imul(salt + 1, 0x27d4eb2d);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 0x100000000;
}
export const isRain = (weather: WeatherId) => weather === 'rain' || weather === 'storm';
export function weatherTimings(weather: WeatherId) {
  if (isRain(weather))
    return [1750, 1510, 1220, 1030, 820, 690].map((n) => (weather === 'storm' ? n * 0.72 : n));
  if (weather === 'snow') return [15500, 13700, 11100, 9400, 7900, 6700];
  if (weather === 'sand') return [7200, 6400, 5700, 4800, 4100, 3500];
  return [21000, 17300, 25000, 19400, 22900, 18000];
}
export interface WeatherParticle {
  id: number;
  clock: number;
  phase: number;
  x: number;
  y: number;
  size: number;
  length: number;
  opacity: number;
  drift: number;
}
export function weatherParticles(
  weather: WeatherId,
  width: number,
  height: number,
): WeatherParticle[] {
  if (!isRain(weather) && weather !== 'snow' && weather !== 'sand') return [];
  const rain = isRain(weather);
  const density = weather === 'storm' ? 10000 : rain ? 15000 : weather === 'snow' ? 21000 : 17000;
  const count = Math.max(16, Math.min(110, Math.round((width * height) / density)));
  return Array.from({ length: count }, (_, id) => {
    const depth = (id % 6) / 5;
    return {
      id,
      clock: id % 6,
      phase: weatherNoise(id, 7),
      x: weatherNoise(id, 1) * (width + 180) - 50,
      y: weatherNoise(id, 2) * (height + 100) - 50,
      size: rain ? 0.65 + depth * 0.65 : 1.3 + depth * 2.5,
      length: rain ? (weather === 'storm' ? 14 : 8) + depth * 15 : 1.3 + depth * 2.5,
      opacity: rain
        ? 0.12 + depth * 0.22
        : weather === 'snow'
          ? 0.23 + depth * 0.42
          : 0.14 + depth * 0.19,
      drift: rain ? (weather === 'storm' ? 0.24 : 0.12) * height : 12 + weatherNoise(id, 5) * 28,
    };
  });
}

/** Ground marks belong to actual visible ground, so a splash never floats across a roof. */
export function rainSplashSites(
  rows: string[],
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
) {
  const sites: { x: number; y: number; phase: number; water: boolean }[] = [];
  for (let yy = Math.max(1, y - radiusY); yy <= Math.min(rows.length - 2, y + radiusY); yy++)
    for (
      let xx = Math.max(1, x - radiusX);
      xx <= Math.min(rows[0]!.length - 2, x + radiusX);
      xx++
    ) {
      const tile = rows[yy]?.[xx] ?? '';
      const index = yy * rows[0]!.length + xx;
      if (!':=.~W'.includes(tile) || weatherNoise(index, 13) > 0.12) continue;
      sites.push({
        x: xx + 0.2 + weatherNoise(index, 19) * 0.6,
        y: yy + 0.3 + weatherNoise(index, 23) * 0.4,
        phase: weatherNoise(index, 29),
        water: tile === '~' || tile === 'W',
      });
    }
  const order = (point: { x: number; y: number }) =>
    weatherNoise(Math.floor(point.x) + Math.floor(point.y) * rows[0]!.length, 31);
  return sites.sort((a, b) => order(a) - order(b)).slice(0, 24);
}
