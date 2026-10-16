import type { RegionPlace } from '../region';

export interface RegionLabel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  lines: string[];
  anchor: { x: number; y: number };
}
const intersects = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  gap = 3,
) =>
  a.x < b.x + b.width + gap &&
  a.x + a.width + gap > b.x &&
  a.y < b.y + b.height + gap &&
  a.y + a.height + gap > b.y;
const shortNames: Record<string, string> = {
  route: '一号路',
  stoneRoute: '二号碎石道',
  coastRoute: '三号矿港道',
  powerRoute: '四号滨海栈道',
  leagueHall: '联盟回廊',
  championRoad: '冠军路',
  hallOfFame: '冠军名录',
};

/** Bounded callouts retain every name; no text is painted on another name or marker. */
export function layoutRegionLabels(
  places: readonly RegionPlace[],
  selected: string,
  current: string,
): RegionLabel[] {
  const priority = (p: RegionPlace) =>
    p.id === selected ? 0 : p.id === current ? 1 : p.kind === 'town' || p.kind === 'league' ? 2 : 3;
  const ordered = [...places].sort((a, b) => priority(a) - priority(b) || a.y - b.y || a.x - b.x);
  const labels: RegionLabel[] = [];
  const markers = places.map((p) => ({ x: p.x - 10, y: p.y - 10, width: 20, height: 20 }));
  for (const place of ordered) {
    const fontSize = place.kind === 'town' || place.kind === 'league' ? 12 : 10;
    const name = shortNames[place.id] ?? place.name;
    const chars = [...name];
    const lines =
      chars.length > 7
        ? [
            chars.slice(0, Math.ceil(chars.length / 2)).join(''),
            chars.slice(Math.ceil(chars.length / 2)).join(''),
          ]
        : [name];
    const width =
      Math.max(
        ...lines.map((t) =>
          [...t].reduce((n, c) => n + (/[\x00-\x7f]/.test(c) ? fontSize * 0.58 : fontSize), 0),
        ),
      ) + 10;
    const height = lines.length * (fontSize + 3) + 6;
    const candidates: { x: number; y: number; score: number }[] = [];
    for (let y = 4; y + height <= 416; y += 4)
      for (let x = 4; x + width <= 596; x += 4) {
        const box = { x, y, width, height };
        if (labels.some((l) => intersects(box, l)) || markers.some((m) => intersects(box, m, 2)))
          continue;
        const dx = Math.max(x - place.x, 0, place.x - x - width);
        const dy = Math.max(y - place.y, 0, place.y - y - height);
        // Prefer short leaders just below their marker; longer leaders are used only in dense areas.
        candidates.push({
          x,
          y,
          score:
            dx * dx + dy * dy + Math.abs(x + width / 2 - place.x) * 3 + (y >= place.y ? 0 : 25),
        });
      }
    const best = candidates.reduce<(typeof candidates)[number] | undefined>(
      (a, b) => (!a || b.score < a.score ? b : a),
      undefined,
    );
    if (!best) throw new Error(`地区地名无法排布：${place.name}`);
    labels.push({
      id: place.id,
      x: best.x,
      y: best.y,
      width,
      height,
      fontSize,
      lines,
      anchor: { x: place.x, y: place.y },
    });
  }
  return labels;
}
