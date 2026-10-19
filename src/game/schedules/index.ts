import { MAPS, terrainPassable, type Npc } from '../../content/world';
import { dayPeriodFor, type DayPeriod } from '../calendar';
import type { GameState, MapId } from '../model';

interface ScheduleStop {
  positions: readonly (readonly [number, number])[];
  lines: string[];
}
interface CityNpcSchedule {
  map: MapId;
  id: string;
  name: string;
  stops: Record<DayPeriod, ScheduleStop>;
}

/** Flavor-only neighbors: no existing story actor, service, or quest checkpoint ever moves. */
export const CITY_NPC_SCHEDULES: readonly CityNpcSchedule[] = [
  {
    map: 'dawn',
    id: 'neighbor_dawn_morningwalker',
    name: '散步的芽晴',
    stops: {
      day: {
        positions: [
          [34, 10],
          [35, 10],
          [33, 10],
        ],
        lines: [
          '白天我在晨露集市挑面包，入夜就去南边茶舍旁听虫鸣。同一条街，换个时候走也很新鲜。',
          '想亲手烘焙，先到种籽手作屋完成「育苗小园」。每天首次成功可收下麦穗和香草，再在晨芽镇打开「城市工坊」菜单制作。',
        ],
      },
      night: {
        positions: [
          [11, 28],
          [12, 28],
          [10, 28],
        ],
        lines: [
          '茶舍旁安静下来了，我喜欢在这里陪伙伴等花香散开。天亮后再去东侧集市逛逛。',
          '晨芽烘焙白天和夜里都能做。育苗小园每天首次成功送来的麦穗和香草，会留在「城市工坊」菜单里，做成茶点还能交付邻里订单。',
        ],
      },
    },
  },
  {
    map: 'stone',
    id: 'neighbor_stone_apprentice',
    name: '石刻学徒砂禾',
    stops: {
      day: {
        positions: [
          [45, 8],
          [45, 9],
          [44, 9],
        ],
        lines: [
          '白天在工坊街看师傅刻石，晚上我会到南边纪念园外整理纹样。矿灯亮起时，石纹的影子更清楚。',
          '到石雕工坊完成「岩层寻宝」，每天首次成功能拿到石料与矿晶。在石脊城打开「城市工坊」菜单，就能把它们做成风铃或路牌。',
        ],
      },
      night: {
        positions: [
          [34, 26],
          [35, 26],
          [34, 25],
        ],
        lines: [
          '我把白天看过的石纹记在这里，等清晨再回工坊街。你看，纪念园里的矿灯像一条回家的路。',
          '石脊手作不分白天夜晚。在本城打开「城市工坊」菜单，岩层寻宝收来的材料还在，做好的风铃和路牌也能交付订单。',
        ],
      },
    },
  },
  {
    map: 'harbor',
    id: 'neighbor_harbor_sailwatcher',
    name: '观帆人汀蓝',
    stops: {
      day: {
        positions: [
          [14, 18],
          [14, 19],
          [13, 18],
        ],
        lines: [
          '白天我在老港口看帆影，夜里会去南边茶屋旁听归船的铃声。码头和花园各有各的热闹。',
          '潮声滨园北岸的「白帆垂钓」每天首次成功，会捞起空贝壳和海玻璃。18:00 后回港打开「城市工坊」菜单，就能参加白帆夜市手作。',
        ],
      },
      night: {
        positions: [
          [10, 34],
          [11, 34],
          [10, 33],
        ],
        lines: [
          '夜航的船还在陆续归港，我在茶屋旁慢慢数灯。等天亮了，再到北边老港口看白帆。',
          '白帆夜市每天 18:00 至次日 06:00 开放，在港口打开「城市工坊」菜单就能制作和交付。只用垂钓捞起的空贝壳与海玻璃，不会用到精灵。',
        ],
      },
    },
  },
];

function stopAvailable(
  game: GameState,
  map: MapId,
  [x, y]: readonly [number, number],
  occupied: readonly Npc[],
): boolean {
  if (!terrainPassable(map, x, y, {})) return false;
  if (game.player.map === map && game.player.x === x && game.player.y === y) return false;
  // Leave gateways, door approaches, and every original patrol route untouched.
  if (MAPS[map].portals.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) <= 2)) return false;
  if (
    occupied.some(
      (npc) => (npc.x === x && npc.y === y) || npc.patrol?.some(([px, py]) => px === x && py === y),
    )
  )
    return false;
  // Authored stops sit in open courts, never a one-tile corridor or dead end.
  return (
    [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ].filter(([px, py]) => terrainPassable(map, px!, py!, {})).length >= 3
  );
}

/** Pure resolution keeps sprites, collision, recovery and conversations on the same saved clock. */
export function scheduledCityNpcs(game: GameState, map: MapId, occupied: readonly Npc[]): Npc[] {
  const period = dayPeriodFor(game);
  const resolved: Npc[] = [];
  for (const schedule of CITY_NPC_SCHEDULES) {
    if (schedule.map !== map) continue;
    const stop = schedule.stops[period];
    // A player standing on the new stop at dusk/dawn gets a nearby, deterministic fallback.
    const position = stop.positions.find((point) =>
      stopAvailable(game, map, point, [...occupied, ...resolved]),
    );
    if (!position) continue;
    resolved.push({
      id: schedule.id,
      name: schedule.name,
      role: 'resident',
      x: position[0],
      y: position[1],
      lines: stop.lines,
    });
  }
  return resolved;
}
