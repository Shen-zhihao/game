import {
  CITY_BUILDING_KINDS,
  CITY_IDENTITIES,
  CITY_TOWNS,
  cityLayout,
  districtFlag,
  districtQuestId,
} from '../../content/cityDistricts';
import { CITY_QUESTS, servicesUnlocked } from '../../content/cities';
import { PRODUCTION_PRODUCTS } from '../../content/production';
import type { Npc } from '../../content/world';
import { dayPeriodFor } from '../calendar';
import type { GameState, TownId } from '../model';
import { viewProductionResult } from '../production';
import { PRODUCTION_STORIES } from '../../content/productionRewards';

const CITY_PRODUCTION_MILESTONES = {
  dawn: {
    id: 'dawn_picnic',
    feedback:
      '你送来的晨露野餐篮已经摆在向阳花园的长椅旁。观察员们可以一边野餐，一边分享晨夜见闻了，谢谢你！',
  },
  stone: {
    id: 'echo_lamp',
    feedback:
      '你送来的昼夜矿晶灯已经摆在层岩纪念园的长椅旁。晶光陪着观察员整理矿山见闻，大家都记得你的帮助。',
  },
  harbor: {
    id: 'tide_mosaic',
    feedback:
      '你送来的潮汐星光画已经展在潮声滨园的长椅旁。居民们从空贝壳与海玻璃里，看到了你记录的昼夜潮汐。',
  },
} as const;

/** The display is earned by delivery, never by crafting, opening a menu, or talking again. */
export function cityProductionMilestone(game: GameState, town: TownId) {
  const milestone = CITY_PRODUCTION_MILESTONES[town as keyof typeof CITY_PRODUCTION_MILESTONES];
  if (!milestone || (game.production?.orders[milestone.id]?.count ?? 0) <= 0) return null;
  const layout = cityLayout(town);
  return {
    ...milestone,
    name: PRODUCTION_PRODUCTS[milestone.id].name,
    // This lawn cell is beside the garden bench, not a path, doorway or NPC position.
    x: layout.gardenX - 2,
    y: layout.gardenY - 2,
  };
}

/** Street and indoor interactions feed the same persistent ledger as the quest board. */
export function interactCityDistrict(
  game: GameState,
  npc: Npc,
  talk: (speaker: string, lines: string[]) => void,
): boolean {
  const town = CITY_TOWNS.find((id) => npc.id.startsWith(`district_${id}_`));
  if (!town) return false;
  const identity = CITY_IDENTITIES[town];
  const point = npc.id.slice(`district_${town}_`.length);
  if (!servicesUnlocked(game)) {
    talk(npc.name, ['欢迎来街区散步。先完成基础捕捉练习，再来与邻居一起筹备活动吧。']);
    return true;
  }
  const flags = game.progress.flags;
  const ledger = (game.cityServices ??= { merit: 0, quests: {}, exchanges: {} });
  const quest = point.startsWith('craft_')
    ? 'craft'
    : CITY_BUILDING_KINDS.some((kind) => kind === point)
      ? 'neighbors'
      : point === 'festival'
        ? 'festival'
        : 'tour';
  const questId = districtQuestId(town, quest);
  const task = CITY_QUESTS[questId]!;
  const milestone = cityProductionMilestone(game, town);
  if (milestone && point === 'garden') {
    // Reading the actual garden guide closes the objective, not merely opening its map.
    viewProductionResult(game, town as 'dawn' | 'stone' | 'harbor');
  }
  if (task.prerequisite && ledger.quests[task.prerequisite] !== 'claimed') {
    talk(npc.name, [
      ...(milestone ? [milestone.feedback] : []),
      `${identity.celebration}还在筹备。先帮烘焙坊、工坊和书馆整理工作记录，再交付筹备委托；我会在这里等大家。`,
    ]);
    return true;
  }
  const first = !flags[districtFlag(town, point)];
  ledger.quests[questId] ??= 'active';
  flags[districtFlag(town, point)] = true;
  const lines: string[] = [];
  if (point === 'festival') lines.push(identity.ending);
  else if (point.startsWith('craft_')) {
    const index = ['bakery', 'workshop', 'library'].indexOf(point.slice(6));
    lines.push(
      first
        ? identity.actions[index]!
        : `你已经整理过${identity.craft[index]}，居民们把这份帮助记在心里。`,
    );
  } else {
    const index = CITY_BUILDING_KINDS.findIndex((kind) => kind === point);
    if (index >= 0) {
      lines.push(`欢迎来到${identity.houses[index]}，我是${identity.people[index]}。`);
      lines.push(
        index < 3
          ? `我们在为${identity.celebration}做准备，东南侧的${identity.craft[index]}等你帮忙整理。调查工作记录会另外记入筹备委托。`
          : index === 3
            ? `这里有大家共用的补给箱，委托板也在任务菜单里。街区的小事会一直等你，不影响道馆挑战。`
            : index === 4
              ? `等大家备好物资，去${identity.quarters[2]}找筹备人，我们一起参加${identity.celebration}。`
              : `这些花会摆在${identity.quarters[2]}。集市、工坊街和花园各有一块导览牌，散步时可以看看。`,
      );
    } else {
      const title =
        point === 'market'
          ? identity.quarters[0]
          : point === 'garden'
            ? identity.quarters[2]
            : identity.quarters[1];
      lines.push(
        `${title}：东侧两条街有烘焙坊、工坊、书馆和会馆；南侧是茶舍、温室与花园环路。所有房屋都能从正门进入。`,
      );
      lines.push(
        `本地的${identity.celebration}由邻居共同筹备。沿路阅读三块导览牌，可以补全漫游手帖。`,
      );
    }
  }
  if (milestone) lines.push(milestone.feedback);
  if (point === 'garden') {
    const story = PRODUCTION_STORIES.find((entry) => entry.town === town);
    if (story && (game.production?.collection.stamps ?? 0) >= story.stamps)
      lines.push(`${story.speaker}的邻里故事「${story.title}」：${story.body}`);
    if (milestone)
      lines.push('本城进阶手作目标已完成。邻里纪念会一直留在这里，欢迎继续制作与布置花园。');
  }
  if (town === 'dawn' && point === 'bakery')
    lines.push('交谈后可在这里制作与交付晨芽烘焙；育苗小园得到的麦穗和香草，都能派上用场。');
  else if (town === 'stone' && point === 'workshop')
    lines.push('交谈后可在这里制作与交付石脊手作；把岩层寻宝得到的石料与矿晶带来吧。');
  else if (town === 'harbor' && point === 'market')
    lines.push(
      `潮声夜市每日 18:00 至次日 06:00 营业，${dayPeriodFor(game) === 'night' ? '现在已开市' : '现在正在备摊'}。交谈后可在这里查看配方，夜间制作与交付；材料和订单不会过期。`,
    );
  lines.push(
    ledger.quests[questId] === 'claimed'
      ? '这份委托已完成，欢迎常来。'
      : `${first ? '已记入' : '可在'}任务管理「${task.name}」，目标完成后到本城委托板领奖。`,
  );
  game.notice = first ? `街区记录已更新：${task.name}` : `正在查看：${task.name}`;
  talk(npc.name, lines);
  return true;
}
