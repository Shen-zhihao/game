import type { GameMap } from '../world';
import type { MapId } from '../../game/model';

/** Additive annexes: every pre-existing tile and saved position stays valid. */
export function installFieldExploration(maps: Record<MapId, GameMap>): void {
  const ice = maps.windSanctuary;
  const grid = ice.rows.map((r) => [...r]);
  while (grid.length < 48) grid.push(Array(44).fill('#'));
  const carve = (x: number, y: number, tile = 'I') => {
    grid[y]![x] = tile;
  };
  for (let y = 29; y <= 36; y++) carve(35, y, ':');
  for (let x = 29; x <= 35; x++) carve(x, 36);
  for (let y = 36; y <= 40; y++) carve(29, y);
  for (let x = 29; x <= 39; x++) carve(x, 40);
  for (let y = 40; y <= 44; y++) carve(39, y);
  for (let x = 31; x <= 39; x++) carve(x, 44);
  for (let y = 44; y <= 46; y++) carve(31, y);
  for (let x = 31; x <= 41; x++) carve(x, 46);
  // Wrong turns begin at real stopping points; retracing always returns to a route.
  for (let x = 27; x <= 29; x++) carve(x, 40);
  for (let y = 38; y <= 40; y++) carve(27, y);
  for (let x = 39; x <= 41; x++) carve(x, 44);
  for (let y = 42; y <= 44; y++) carve(41, y);
  // Side branches make the stopping points meaningful; all dead ends are reversible.
  for (let y = 38; y <= 42; y++) carve(34, y);
  for (let x = 34; x <= 37; x++) carve(x, 38);
  carve(35, 36, ':');
  carve(40, 46, ':');
  carve(41, 46, ':');
  ice.rows = grid.map((r) => r.join(''));
  ice.npcs.push(
    {
      id: 'iceTrailSign',
      name: '霜镜冰窟路牌',
      x: 34,
      y: 34,
      role: 'sign',
      lines: [
        '南侧是霜镜冰窟。踏入亮蓝冰面会沿一个方向滑到墙边，停稳后才能转向；斜向输入也会归为上下左右。',
        '沿入口向左滑，善用墙壁停步。尽头有一次性补给和安全返回绳。',
      ],
    },
    { id: 'iceTrailCache', name: '霜镜探险箱', x: 41, y: 46, role: 'chest' },
    { id: 'iceTrailReturn', name: '冰窟安全返回绳', x: 40, y: 45, role: 'mechanism' },
  );
  const lake = maps.lakeRoute;
  const water = lake.rows.map((r) => [...r.padEnd(57, '#')]);
  const paint = (x: number, y: number, tile = ':') => {
    water[y]![x] = tile;
  };
  for (let x = 38; x <= 49; x++) paint(x, 20);
  for (let y = 17; y <= 20; y++) paint(49, y);
  for (let y = 12; y <= 16; y++) paint(49, y, 'V');
  for (let y = 7; y <= 11; y++) for (let x = 47; x <= 55; x++) paint(x, y, y < 10 ? '.' : ':');
  lake.rows = water.map((r) => r.join(''));
  lake.npcs.push(
    {
      id: 'waterfallSign',
      name: '镜河攀瀑说明牌',
      x: 48,
      y: 18,
      role: 'sign',
      lines: [
        '北侧瀑布通往隐藏的镜源台地。具备冲浪能力，并取得流羽馆滑翔装备后，可用安全绳进行攀瀑。',
        '朝北走入瀑布即可连续上攀；从顶部向南可安全下行，不再检查装备。台地还有返回绳。',
      ],
    },
    { id: 'waterfallCache', name: '镜源台地藏箱', x: 53, y: 8, role: 'chest' },
    { id: 'waterfallReturn', name: '镜源安全返回绳', x: 51, y: 11, role: 'mechanism' },
  );
  // Optional backtracking: previously visited regions gain tool-gated, one-time caches.
  maps.forest.npcs.push({
    id: 'forestRevisitCache',
    name: '藤后旧补给箱',
    x: 24,
    y: 19,
    role: 'chest',
  });
  maps.mine.npcs.push({
    id: 'mineRevisitCache',
    name: '岩缝旧补给箱',
    x: 27,
    y: 23,
    role: 'chest',
  });
}
export const hasFieldAnnex = (map: MapId) => map === 'windSanctuary' || map === 'lakeRoute';
