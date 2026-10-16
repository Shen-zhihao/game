import {
  ADVENTURE_GYMS,
  ADVENTURE_INTERACTIONS,
  adventureEncounter,
} from '../../content/adventure';
import type { Npc } from '../../content/world';
import type { GameState, StoryEvent } from '../model';
import { grantMasterBall } from '../capture';
import { hasFieldAccess } from '../../content/keyItems';

type Narrate = (speaker: string, lines: string[], after?: StoryEvent | null) => void;
export function interactAdventure(game: GameState, npc: Npc, talk: Narrate): boolean {
  const flags = game.progress.flags;
  if (
    (npc.id === 'professor' && !flags.catchTutorial) ||
    (npc.id === 'retiredMiner' && !flags.plaqueReturned)
  )
    return false;
  const say = (lines: string[], after?: StoryEvent) => talk(npc.name, lines, after);
  const gym = ADVENTURE_GYMS.find(
    (g) =>
      g.gate === npc.id ||
      g.leader === npc.event ||
      g.scout === npc.event ||
      g.keeper === npc.event ||
      g.switches.includes(npc.id),
  );
  if (gym) {
    if (!flags.rival || !flags.catchTutorial) {
      say(['先完成基础对战与捕捉入门。其他道馆、区域主线和稀有精灵都不是本馆前置。']);
      return true;
    }
    if (npc.id === gym.gate) {
      game.player.map = gym.map;
      Object.assign(game.player, gym.entrance, { facing: 'up' });
      game.notice = `进入${gym.badge}的考验，先调查本馆机关。`;
      return true;
    }
    if (gym.switches.includes(npc.id)) {
      if (npc.id === gym.switches[1] && !flags[gym.scout])
        say(['先完成本馆学徒练习，再启动第二处机关。']);
      else {
        flags[npc.id] = true;
        say([
          gym.switchDescriptions?.[npc.id === gym.switches[0] ? 0 : 1] ??
            '机关归位，检修通道已经打开。自己的考验只由你和伙伴完成，不要求其他徽章。',
        ]);
      }
      return true;
    }
    const required =
      npc.event === gym.leader
        ? [gym.scout, gym.keeper]
        : npc.event === gym.keeper
          ? [gym.switches[1]]
          : [gym.switches[0]];
    if (!required.every((f) => flags[f])) {
      say(['先完成本馆对应的机关与练习，再来进行下一场考验。']);
      return true;
    }
    if (flags[npc.event!]) {
      say([
        `${gym.badge}属于你们。${gym.toolName}只增加可选探索方式，普通道路和其他道馆随时可去。`,
      ]);
      return true;
    }
    say(
      [
        npc.event === gym.leader
          ? (gym.intro ?? '让我看看你与伙伴共同选择的道路！')
          : (gym.lesson ?? '准备好就开始本馆练习。'),
      ],
      npc.event!,
    );
    return true;
  }
  const interaction = ADVENTURE_INTERACTIONS[npc.id];
  if (!interaction) return false;
  if (!flags.catchTutorial) {
    say(['先完成基础捕捉练习，再来开展本地调查和居民委托。']);
    return true;
  }
  const encounter = adventureEncounter(npc.event ?? null);
  if (encounter) {
    say(
      flags[encounter.caught]
        ? [`${encounter.name}已经选择与你同行。这里保留它的生态记录，不会再生成同一位伙伴。`]
        : !encounter.requires.every((f) => flags[f])
          ? (interaction.locked ?? ['先完成对应调查，再来回应这位伙伴。'])
          : [
              `记录与栖地都已恢复。${encounter.name}走近你，愿意通过对战认识彼此；未能捕获可以再来。`,
            ],
      !flags[encounter.caught] && encounter.requires.every((f) => flags[f]) ? npc.event : undefined,
    );
    return true;
  }
  if (
    !interaction.requires?.every((f) => hasFieldAccess(game, f)) &&
    interaction.requires?.length
  ) {
    say(interaction.locked ?? ['先完成任务日志中的必要调查。']);
    return true;
  }
  // Registered battles retain the central battle and checkpoint implementation.
  if (npc.event && interaction.rules.length === 0) return false;
  const rule = interaction.rules.find(
    (r) =>
      (r.when ?? []).every((f) => hasFieldAccess(game, f)) &&
      (r.absent ?? []).every((f) => !hasFieldAccess(game, f)),
  );
  if (!rule) {
    say(interaction.repeat.length ? interaction.repeat : ['这里的调查已记录。']);
    return true;
  }
  if (Object.entries(rule.items ?? {}).some(([id, n]) => (game.inventory[id] ?? 0) + n > 999)) {
    say(['背包暂时放不下完整奖励，先使用一些道具再来，进度和奖励都保留。']);
    return true;
  }
  for (const flag of rule.sets ?? []) flags[flag] = true;
  for (const flag of rule.clears ?? []) flags[flag] = false;
  if (rule.masterBallSource) grantMasterBall(game, rule.masterBallSource);
  if (rule.jump) {
    game.player.map = rule.jump.map;
    game.player.x = rule.jump.x;
    game.player.y = rule.jump.y;
    game.encounterCooldown = 7;
    game.notice = '使用可选探索捷径。';
  }
  game.player.money = Math.min(9999999, game.player.money + (rule.money ?? 0));
  for (const [id, n] of Object.entries(rule.items ?? {}))
    game.inventory[id] = (game.inventory[id] ?? 0) + n;
  say(rule.lines);
  return true;
}
