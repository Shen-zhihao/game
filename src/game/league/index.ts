import { LEAGUE_BADGES, LEAGUE_STAGES, LEAGUE_STAGE_NAMES } from '../../content/league';
import { SPECIES } from '../../content/catalog';
import { APP_NAME } from '../../content/brand';
import type { Npc } from '../../content/world';
import type { GameState, StoryEvent } from '../model';
type Talk = (speaker: string, lines: string[], after?: StoryEvent | null) => void;
export function ensureLeague(g: GameState) {
  return (g.league ??= {
    runs: 0,
    wins: 0,
    active: false,
    stage: 0,
    firstTeam: null,
    lastTeam: null,
  });
}
export const leagueQualified = (g: GameState) => LEAGUE_BADGES.every((f) => g.progress.flags[f]);
export function resetLeague(g: GameState) {
  const l = ensureLeague(g);
  l.active = false;
  l.stage = 0;
  for (const event of LEAGUE_STAGES) g.progress.flags[event] = false;
}
export function finishLeagueBattle(g: GameState, result: string | null, event: StoryEvent | null) {
  const index = LEAGUE_STAGES.indexOf(event as (typeof LEAGUE_STAGES)[number]);
  if (index < 0) return;
  const l = ensureLeague(g);
  if (result === 'lose') {
    resetLeague(g);
    g.notice += ' 本轮连战结束，经验与金币保留，可从第一位精英重新登记。';
    return;
  }
  if (result !== 'win') return;
  l.stage = index + 1;
  g.progress.flags[`cleared_${event}`] = true;
  if (index === 4) {
    l.active = false;
    l.wins++;
    const team = g.party.map((id) => {
      const c = g.creatures[id]!;
      return { speciesId: c.speciesId, level: c.level, nickname: c.nickname };
    });
    l.firstTeam ??= team.map((c) => ({ ...c }));
    l.lastTeam = team;
    g.progress.flags.champion = true;
    g.battle?.logs.push('你与伙伴成为星苔联盟冠军！冠军名录将保存首次与最近一次同行队伍。');
  }
}
export function interactLeague(
  g: GameState,
  n: Npc,
  talk: Talk,
  heal: (g: GameState) => void,
): boolean {
  const f = g.progress.flags,
    say = (lines: string[], after?: StoryEvent) => talk(n.name, lines, after);
  if (n.id === 'rivalLeague') {
    if (!leagueQualified(g))
      say(['我会在这里等你集齐八枚不同徽章。主线调查与传说精灵不影响我们的巡礼终场。']);
    else if (!f.rivalLeague)
      say(
        ['阿澈：从博士的背包开始，我们走到了这里。这场切磋结束后，各自去挑战联盟吧！'],
        'rivalLeague',
      );
    else say(['阿澈：无论谁先成为冠军，我们都还有新的地方可去。到登记员处开始你的连战吧。']);
    return true;
  }
  if (n.id === 'leagueRegistrar') {
    if (!leagueQualified(g)) {
      say([
        `登记检查八枚不同徽章，目前 ${g.progress.badges}/8。居民故事、反派调查和神兽捕获都不作为条件。`,
      ]);
      return true;
    }
    if (!f.rivalLeague) {
      say(['徽章已经齐全！先与大厅南侧的阿澈完成巡礼终场切磋，再回来登记五场连战。']);
      return true;
    }
    const l = ensureLeague(g);
    resetLeague(g);
    l.runs++;
    l.active = true;
    f.leagueQualified = true;
    heal(g);
    g.player.map = 'leagueHall';
    g.player.x = 18;
    g.player.y = 68;
    g.player.facing = 'up';
    g.notice = '连战开始：冰 → 幽灵 → 恶 → 龙 → 冠军。离场或战败会重置本轮，经验与金币保留。';
    return true;
  }
  const index = LEAGUE_STAGES.indexOf(n.event as (typeof LEAGUE_STAGES)[number]);
  if (index >= 0) {
    const l = ensureLeague(g);
    if (!l.active || l.stage !== index || !leagueQualified(g))
      say(['请先在大厅登记，并按冰、幽灵、恶、龙、冠军的次序完成本轮连战。']);
    else say([`${LEAGUE_STAGE_NAMES[index]}：这里承认每一种队伍与战术，让我们开始！`], n.event);
    return true;
  }
  if (n.id === 'fameRecord') {
    const l = ensureLeague(g);
    say([
      `联盟冠军名录 · 已完成 ${l.wins} 次／登记 ${l.runs} 轮。`,
      ...(l.firstTeam ?? []).map(
        (c, i) => `初次同行 ${i + 1}：${c.nickname || SPECIES[c.speciesId]!.name} · Lv.${c.level}`,
      ),
      '最近一次冠军队伍也已独立保存，进化与下一轮挑战不会改写首次记录。',
    ]);
    return true;
  }
  if (n.id === 'fameRival') {
    say([
      '阿澈：我们从同一条小路出发，却找到了不同的节奏。下次，我也会带着新的伙伴挑战你。',
      '我会继续在各城帮忙。没做完的居民故事、旧约与图鉴记录，随时都可以回去补完。',
    ]);
    return true;
  }
  if (n.id === 'fameProfessor') {
    say([
      '岚博士：我在草丛里被困时，可没想到那只借出的伙伴会带你走到这里。你们一起成长的记录已经保存在本地。',
      '通关后回晨芽镇研究所，保育观察会带来另外两种初始伙伴的新个体，也会开启联盟生态研究。',
    ]);
    return true;
  }
  return false;
}
export function leagueVictoryPresentation(g: GameState, talk: Talk) {
  if (g.battle?.event !== 'leagueChampion' || g.battle.result !== 'win') return false;
  g.player.map = 'hallOfFame';
  g.player.x = 18;
  g.player.y = 18;
  g.player.facing = 'up';
  g.progress.flags.leagueEnding = true;
  talk(
    '星苔冠军名录',
    [
      '你的队伍被逐一记入冠军名录。八枚徽章来自不同城市，也来自你自己选择的道路。',
      '阿澈：从搬家、救博士到今天，每一次切磋都让我学到了不同的事。以后我们继续各自出发，也继续相互帮助。',
      g.progress.flags.starReport
        ? '各城重新连通了星流，所有公开记录都留给了后来者。森林、矿山、潮汐与迁徙终于各有归途。'
        : '联盟巡礼已经完成。星流调查仍可独立继续，地区居民和公开档案会等你回来。',
      '岚博士：冠军不是旅程的终点。八位馆主已准备好强化队伍，回各馆交谈即可再战，不用重做机关。保育园、古庙与终宵厅也有新的故事。',
      `${APP_NAME} · 联盟篇结束。存档、伙伴、培养和全部居民任务保留，离开名录后可继续冒险。`,
    ],
    'leagueCredits',
  );
  return true;
}
export function presentCompleteJourney(g: GameState): GameState {
  const f = g.progress.flags;
  if (
    !f.champion ||
    !f.starReport ||
    !f.creditsViewed ||
    f.journeyComplete ||
    g.battle ||
    g.challenge?.active ||
    g.dialogue ||
    g.pending.length
  )
    return g;
  const next: GameState = JSON.parse(JSON.stringify(g));
  next.progress.flags.journeyComplete = true;
  next.dialogue = {
    speaker: '归途 · 星苔完整旅程',
    lines: [
      '森林晶丝的用途、矿石的运输终点、单向抽取的危机与双衡符号的含义，都有了可以公开核对的答案。',
      '纪衡接受各城的核查，阿澈继续巡礼，博士继续保育研究。没有失踪的工人，也没有必须献出的传说精灵。',
      '八枚徽章与星流调查已经完整结案。新的同行故事仍在你选择的道路上：旧支线随时可补，冠军名录、图鉴与传说相遇继续开放。',
    ],
    index: 0,
    after: 'journeyCredits',
  };
  return next;
}
