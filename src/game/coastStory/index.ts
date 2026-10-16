import type { Npc } from '../../content/world';
import type { GameState, StoryEvent } from '../model';
import { grantMasterBall } from '../capture';

export const COAST_STORY_ENCOUNTERS = {
  coralEncounter: {
    speciesId: 'creature_097',
    level: 15,
    requires: ['reefRestored'],
    awakened: 'coralAwakened',
    caught: 'coralCaught',
    name: '珊枝鹿',
  },
  islandEncounter: {
    speciesId: 'creature_098',
    level: 17,
    requires: ['reefRestored', 'lighthouseRepaired'],
    awakened: 'islandAwakened',
    caught: 'islandCaught',
    name: '浮岛龟',
  },
  tideEncounter: {
    speciesId: 'creature_099',
    level: 16,
    requires: ['bottleDelivered', 'lighthouseRepaired'],
    awakened: 'tideAwakened',
    caught: 'tideCaught',
    name: '回潮贝',
  },
} as const;
export function coastEncounter(event: StoryEvent | null) {
  return event && event in COAST_STORY_ENCOUNTERS
    ? COAST_STORY_ENCOUNTERS[event as keyof typeof COAST_STORY_ENCOUNTERS]
    : null;
}
type Narrate = (speaker: string, lines: string[], after?: StoryEvent | null) => void;
const storyIds = new Set([
  'harborMaster',
  'cargoManifest',
  'sluiceGauge',
  'tideGuard',
  'sluiceConsole',
  'driftBottle',
  'tideChart',
  'postkeeper',
  'lighthouseKeeper',
  'lensCase',
  'oldLighthouse',
  'shoreObservation',
  'poolObservation',
  'reefCleanup',
  'coralFriend',
  'islandFriend',
  'tideShell',
]);

export function interactCoast(game: GameState, npc: Npc, talk: Narrate): boolean {
  if (!storyIds.has(npc.id)) return false;
  const f = game.progress.flags;
  const say = (lines: string[], after?: StoryEvent) => talk(npc.name, lines, after);
  const reward = (items: Record<string, number>, money = 0) => {
    game.player.money = Math.min(9999999, game.player.money + money);
    for (const [id, quantity] of Object.entries(items))
      game.inventory[id] = Math.min(999, (game.inventory[id] ?? 0) + quantity);
  };
  if (!f.catchTutorial) {
    say(['先完成基础对战和捕捉练习，再来开展海岸调查。城镇与维修路都可以自由通行。']);
    return true;
  }
  switch (npc.id) {
    case 'harborMaster':
      if (f.harborReport && grantMasterBall(game, 'harbor_report')) {
        say([
          '此前的潮闸调查已结案。岚博士补发研究谢礼：大师球 ×1！这是全篇三个限量剧情奖励之一，不会重复领取。',
        ]);
        return true;
      }
      if (!f.mineReport)
        say([
          '矿山送来的货物有些奇怪。先把森林与旧矿山的调查交给砚叔核实，我才能比对这批货运记录。',
          '水系道馆、港口居民委托和灯塔支线已经开放；不必等调查结束。',
        ]);
      else if (!f.harborQuest) {
        f.harborQuest = true;
        say([
          '砚叔的拓印到了：异常晶矿的箱号与东边仓库一致。我们先核对货运簿，再查看潮间闸的水位计。',
          '旧闸停止运行，但北侧陆上维修桥一直畅通。调查不需要渡水装备，也不需要任何徽章。',
        ]);
      } else if (f.sluiceRepaired && !f.harborReport) {
        f.harborReport = true;
        reward({ candy: 2, ball: 5, skill_copy: 1 }, 800);
        grantMasterBall(game, 'harbor_report');
        say([
          '你恢复了潮汐闸的自然流量，普通货船终于能安全进出。获得旅费 800、成长果 ×2、星纹球 ×5、复刻药 ×1、大师球 ×1（全篇最多三个）。',
          '记录已经对上：定序社借闸门涡流给晶矿装置供能，运单目的地是雷鸣市能源站 E-04。矿山共振与港口异常确实来自同一批设备。',
          '我把完整运单封存并将副本交给岚博士。沿港口东北出口走四号滨海栈道，到雷鸣市找工程师乔弧核对 E-04；道馆与居民支线自由安排。',
        ]);
      } else
        say([
          f.harborReport
            ? '普通航路已经恢复，E-04 运单已封存。港口东北出口通往雷鸣市，工程师乔弧在等你的副本；海岸支线仍可随时补做。'
            : '先查东侧仓库的货运簿和潮间闸西岸水位计，击退北面的货运员，再关闭控制台的非法供能回路。',
        ]);
      return true;
    case 'cargoManifest':
    case 'sluiceGauge':
      if (!f.harborQuest) say(['先向港务员沐舟说明矿山调查结果，取得核对许可。']);
      else {
        f[npc.id] = true;
        say([
          npc.id === 'cargoManifest'
            ? '货运簿中的箱号与矿山拓印一致，目的地写着「雷鸣市能源站 E-04」，中转能源来自潮间闸。编号已记入日志。'
            : '水位计并未损坏。闸门被外接晶矿回路锁在逆流位置，河口流速因此紊乱；旁边保留了可手动归零的检修步骤。',
        ]);
      }
      return true;
    case 'tideGuard':
      if (!f.harborQuest || !f.cargoManifest || !f.sluiceGauge) {
        say(['这里的涡流还在给设备供能。先弄清货物去向和水位异常，再来找我。']);
        return true;
      }
      return false;
    case 'sluiceConsole':
      if (f.sluiceRepaired) say(['供能旁路已隔离，闸门按自然潮位运行。回港向沐舟报告。']);
      else if (!f.tideGuard)
        say(['外接回路仍被货运员控制。先核对两份证据并完成对战，再按检修步骤操作。']);
      else {
        f.sluiceRepaired = true;
        say([
          '你先断开晶矿旁路，再松开回流锁，最后将闸门调回自然潮位。水流恢复，普通航道上的警示浮标逐渐平稳。',
          '关闭旁路不需要捕获任何精灵。带着运单和检修记录，回港找沐舟结案吧。',
        ]);
      }
      return true;
    case 'driftBottle':
      if (!f.bottleFound) {
        f.bottleFound = true;
        say([
          '瓶里是一封普通家书，落款「北堤第九次大潮，给青帆」。信纸受潮，年份模糊。',
          '港口潮汐历能核对日期，西南小屋的居民也许就是收件人。你把信夹进防水册，不会消耗或出售。',
        ]);
      } else
        say([
          f.bottleDelivered
            ? '漂流瓶里的信已经送达青帆手中。'
            : '信还夹在防水册中。去潮汐港查阅潮汐历，再找西南小屋旁的青帆。',
        ]);
      return true;
    case 'tideChart':
      if (!f.bottleFound)
        say(['港口按航季记录潮汐，查看旧信的潮汐日期可以确定收件人。不需要等待现实潮汐。']);
      else if (!f.bottleDate) {
        f.bottleDate = true;
        say([
          '你查到第九次大潮发生在旧航季，不是本月。信上的青帆应是现在负责旧码头信件的那位居民。',
          '青帆住在港口西南小屋，常在门口整理归航的来信。',
        ]);
      } else say(['旧航季的第九次大潮已核对。信件应交给港口西南的青帆。']);
      return true;
    case 'postkeeper':
      if (f.bottleDelivered)
        say([
          '这封迟到的家书我会珍藏。信里说的旧灯塔若再次亮起，潮池里等候的回潮贝也许会回应那段归航旋律。',
        ]);
      else if (!f.bottleFound || !f.bottleDate)
        say([
          '我叫青帆，替旧码头保管来信。捡到漂流瓶时，先去港口潮汐历核对航季，别把旧信认成新信。',
        ]);
      else {
        f.bottleDelivered = true;
        reward({ super_potion: 2, ball: 3 }, 250);
        say([
          '就是这封信！原来家人早把平安的消息托给海潮了。谢谢你没有只凭名字猜收件人。',
          '获得旅费 250、浓露药 ×2、星纹球 ×3。「漂流瓶的收件人」完成。',
          '信末的归航旋律被你记在防水册中。等旧灯塔恢复，再去浅礁回应回潮贝吧；它不影响普通航路。',
        ]);
      }
      return true;
    case 'lighthouseKeeper':
      if (f.lighthouseRepaired)
        say([
          '谢谢你修好旧灯塔。它只为近岸小船照明，普通航路的潮汐闸由港务员另行处理。浅礁的浮岛龟也安心多了。',
        ]);
      else {
        f.lighthouseQuest = true;
        say([
          '旧灯塔的镜片该更换了，备用片在灯塔南侧的干燥检修箱中。沿东侧维修路走，不用渡水也不用徽章。',
          '带上镜片，到灯塔门前的灯座安装即可。修灯是独立支线，不会阻挡普通航路调查。',
        ]);
      }
      return true;
    case 'lensCase':
      if (!f.lighthouseQuest) say(['箱子属于灯塔维修队。先找港口的守望员海棠说明来意。']);
      else if (f.lighthouseLens) say(['备用镜片已取出，记录在防水册里。灯塔灯座在西北侧。']);
      else {
        f.lighthouseLens = true;
        say(['取出完好的备用镜片并包好。镜片记在任务册中，不占消耗品栏，也不会遗失或卖掉。']);
      }
      return true;
    case 'oldLighthouse':
      if (f.lighthouseRepaired)
        say(['新镜片稳定地映着暖光。旧灯塔已经恢复，海棠的维修委托已完成。']);
      else if (!f.lighthouseLens)
        say(['灯座的旧镜片已经裂开。先问港口的海棠，再到南侧检修箱取备用片。']);
      else {
        f.lighthouseRepaired = true;
        reward({ candy: 3, tide_pearl: 1 });
        say([
          '你沿固定槽安装镜片，合上灯盖。灯光重新照向近岸，浅礁的伙伴不再躲避暗影。',
          '海棠事先留下的维修补给：成长果 ×3、潮汐珠 ×1。「旧灯塔维修」完成。',
          '这座小灯塔独立于普通航道。礁池修复后，浮岛龟会愿意和你见面。',
          '解锁通用技能「冲浪术」！到任意城市精灵中心可为任意伙伴免费学习或重学；掌握后能渡过普通水面，陆路仍然畅通。',
        ]);
      }
      return true;
    case 'shoreObservation':
    case 'poolObservation':
      f[npc.id] = true;
      say([
        npc.id === 'shoreObservation'
          ? '你记录了河口的缓流、水草和蜕下的蟹壳。这里的生灵依赖湿岸；继续去潮间闸东南的潮池观察另一种环境。'
          : '你记录了浅礁的回流、珊瑚和幼鱼。潮池里的旧网正卡住珊瑚根部；掌握河口与潮池两份记录后，可以从岸上安全拆网。',
      ]);
      return true;
    case 'reefCleanup':
      if (f.reefRestored) say(['旧网已经清走，珊瑚根部的水流恢复。珊枝鹿在浅礁西侧安静等候。']);
      else if (!f.shoreObservation || !f.poolObservation)
        say([
          '先调查矿港道河口与这里的潮池观察点，确认水流和幼鱼藏身处，再安全拆网。普通水面遭遇一直开放，不需要等潮汐或先捕获精灵。',
        ]);
      else {
        f.reefRestored = true;
        reward({ ball: 5, ether: 1 });
        say([
          '你按两份观察记录避开幼鱼通道，从岸上逐段拆除旧网，收走遗留碎线。浅礁的水流恢复。',
          '获得星纹球 ×5、醒神露 ×1。「潮池观察」完成。珊枝鹿终于走出礁石，愿意了解这位保护栖地的旅人。',
        ]);
      }
      return true;
    case 'coralFriend':
    case 'islandFriend':
    case 'tideShell': {
      const event =
        npc.id === 'coralFriend'
          ? 'coralEncounter'
          : npc.id === 'islandFriend'
            ? 'islandEncounter'
            : 'tideEncounter';
      const encounter = COAST_STORY_ENCOUNTERS[event];
      if (f[encounter.caught])
        say([`${encounter.name}已选择与你同行。这段海岸故事已经完成，不会重复出现第二只。`]);
      else if (!encounter.requires.every((flag) => f[flag]))
        say([
          npc.id === 'coralFriend'
            ? '珊枝鹿担心礁池的旧网。先完成河口与潮池观察，并安全清理栖地。'
            : npc.id === 'islandFriend'
              ? '浮岛龟仍在等候安全水流与归航灯光。修复礁池和旧灯塔后再来。'
              : '贝壳只回响一段未完的归航曲。把漂流瓶家书送达，再点亮旧灯塔，才能回应这段旧约。',
        ]);
      else
        say(
          [
            `${encounter.name}回应了你的照顾，愿意尝试同行。降低体力后用星纹球邀请它。`,
            '击倒、逃走、耗尽精灵球或战败后，都可以带着现有调查记录回来重试，不影响道馆和主线。',
          ],
          event,
        );
      return true;
    }
  }
  return false;
}
