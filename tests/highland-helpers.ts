import { PlayerBot, playChapter } from './helpers';

export function enterHighlands(bot: PlayerBot) {
  if (bot.game.player.map === 'gym') bot.portal('moss');
  if (bot.game.player.map === 'dawn') bot.portal('route');
  if (bot.game.player.map === 'route') bot.portal('moss');
  if (bot.game.player.map === 'moss') bot.portal('forest');
  if (bot.game.player.map === 'forest') bot.portal('stoneRoute');
  if (bot.game.player.map === 'stoneRoute') bot.portal('stone');
  bot.heal();
  bot.npc('stoneShop');
}
export function train(bot: PlayerBot, id: string, level: number) {
  bot.act({ kind: 'lead', creatureId: id });
  let remaining = 30;
  while (bot.game.creatures[id]!.level < level && remaining-- > 0) {
    bot.portal('stoneRoute');
    bot.npc('highlandTrainer');
    bot.portal('stone');
    bot.heal();
  }
  if (bot.game.creatures[id]!.level < level) throw new Error('Training level not reached');
}
export function rockChallenge(bot: PlayerBot) {
  bot.npc('rockGymGate');
  bot.npc('rockSwitchOne');
  bot.npc('rockScout');
  bot.npc('rockSwitchTwo');
  bot.npc('rockKeeper');
  bot.npc('rockLeader');
  if (!bot.game.progress.flags.rockLeader) throw new Error('Rock badge not earned');
}
export function readyHighlands() {
  const bot = playChapter('creature_001');
  enterHighlands(bot);
  const grass = bot.game.party.find((id) =>
    ['creature_001', 'creature_002'].includes(bot.game.creatures[id]!.speciesId),
  )!;
  train(bot, grass, 13);
  bot.act({ kind: 'buy', itemId: 'potion', quantity: 8 });
  return bot;
}
export function playableHighlands() {
  const bot = readyHighlands();
  rockChallenge(bot);
  bot.portal('stone');
  bot.heal();
  return bot;
}
