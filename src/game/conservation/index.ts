import { CONSERVATION_CLOSURES } from '../../content/conservation';
import { SPECIES, STARTERS } from '../../content/catalog';
import { APP_NAME } from '../../content/brand';
import type { Npc } from '../../content/world';
import type { GameState, StoryEvent } from '../model';
import { makeCreature } from '../rules';
import { grantMasterBall } from '../capture';
type Talk = (speaker: string, lines: string[], after?: StoryEvent | null) => void;
export function interactConservation(g: GameState, n: Npc, talk: Talk): boolean {
  if (
    n.id !== 'professor' ||
    !g.progress.flags.catchTutorial ||
    !g.progress.flags.champion ||
    !g.progress.flags.bookReport
  )
    return false;
  const f = g.progress.flags,
    say = (lines: string[]) => talk(n.name, lines);
  if (!f.nurseryGift) {
    if (6 - g.party.length + 360 - g.box.length < 2) {
      say([
        '保育园的两位新伙伴会一直等你。队伍与仓库需要合计两个空位；可在城镇仓库整理或确认放生不再同行的伙伴，故事不会过期。',
      ]);
      return true;
    }
    const first = g.dex.caught.find((id) => STARTERS.includes(id)) ?? STARTERS[0]!;
    const ids = STARTERS.filter((id) => id !== first),
      names: string[] = [];
    for (const speciesId of ids) {
      const c = makeCreature(g, speciesId, 5);
      g.creatures[c.id] = c;
      (g.party.length < 6 ? g.party : g.box).push(c.id);
      for (const list of [g.dex.seen, g.dex.caught])
        if (!list.includes(speciesId)) list.push(speciesId);
      names.push(SPECIES[speciesId]!.name);
    }
    f.nurseryGift = true;
    say([
      `保育园的${names.join('与')}选择与你同行！它们是新的个体，第一位伙伴与原有成长记录完全保留。`,
      '三种初始家族都可在同一存档培养与进化，不要求交换精灵或另开存档。',
      '继续记录保育林、原野、深矿和海藻湾四种环境，我会为联盟生态研究结案。',
    ]);
    return true;
  }
  if (
    !f.leagueResearch &&
    ['deepSurvey', 'ridgeSurvey', 'mineSurvey', 'kelpSurvey'].every((flag) => f[flag])
  ) {
    f.leagueResearch = true;
    grantMasterBall(g, 'league_research');
    say([
      '保育林、原野、深矿与海藻湾四份生态记录完整。研究依据环境观察，不要求任何神兽捕获或集齐图鉴。',
      '联盟生态研究结案，获得大师球 ×1！这是全篇第三个、也是最后一个固定来源；全篇正常共三枚，商店与兑换永远不提供。',
      '未完成的居民故事与传说试炼始终开放，失败可以重试。',
    ]);
    return true;
  }
  if (!f.postgameComplete && CONSERVATION_CLOSURES.every((flag) => f[flag])) {
    f.postgameComplete = true;
    say([
      '观察册、山道回声、深矿工牌、旧航匣，以及九城居民、古庙和终宵厅的故事都已完整结案。',
      `你为每一条记录留下了可核对的答案，也为每位精灵留下了自由选择的机会。${APP_NAME}的主线、联盟与通关后故事全部完成。`,
      '旅程会继续：挑战联盟重战、培养新伙伴、尝试不同队伍、补全 250 种形态的图鉴。剧情不再关闭任何普通路线。',
    ]);
    return true;
  }
  if (g.dex.caught.length === 250 && !f.dexComplete) {
    f.dexComplete = true;
    g.player.money = Math.min(9999999, g.player.money + 10000);
    say([
      '250 种形态全部登记！岚博士授予你「星苔图鉴守望者」称号与旅费 10000。',
      '每个家族的栖地、成长、进化与同行故事都保存在图鉴中。称号和奖励只登记一次。',
    ]);
    return true;
  }
  say([
    f.leagueResearch
      ? '三枚限量大师球的来源均已公开；所有旧故事仍可回访。'
      : '联盟研究还需要深矿暗河的记录；其他三份观察可沿原步道补做。',
    f.postgameComplete
      ? '远征故事已经完整结案，图鉴与联盟重战继续开放。'
      : '补完任务日志里的居民故事与古庙、终宵厅旧约后，再来分享完整的归途。',
  ]);
  return true;
}
