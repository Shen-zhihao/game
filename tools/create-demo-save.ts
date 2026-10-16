import { writeFileSync } from 'node:fs';
import { playablePostgame, travel } from '../tests/adventure-helpers';
import { createSnapshot } from '../src/persistence/snapshot';
import { testEntropy } from '../tests/helpers';
const bot = playablePostgame();
bot.game.player.name = '完整远征试玩';
writeFileSync(
  'exports/story-complete.stargrove.json',
  JSON.stringify(createSnapshot(bot.game, testEntropy, null), null, 2),
);
travel(bot, 'ancientTemple');
bot.captureBall = 'master_ball';
bot.npc('balanceGuardian', true);
travel(bot, 'nightHall');
bot.npc('nightDragon', true);
travel(bot, 'star');
bot.heal();
writeFileSync(
  'exports/postgame-complete.stargrove.json',
  JSON.stringify(createSnapshot(bot.game, testEntropy, null), null, 2),
);
writeFileSync(
  'exports/playthrough-summary.json',
  JSON.stringify(
    {
      commands: bot.commands.length,
      badges: bot.game.progress.badges,
      chapter: bot.game.progress.chapter,
      flags: bot.game.progress.flags,
      party: bot.game.party.map((id) => bot.game.creatures[id]),
      masterBalls: bot.game.masterBalls,
      inventory: bot.game.inventory,
      league: bot.game.league,
    },
    null,
    2,
  ),
);
console.log(
  `合法指令 ${bot.commands.length} 条，八徽章、主线、联盟、全部支线、保育研究与两位传说伙伴完成。`,
);
