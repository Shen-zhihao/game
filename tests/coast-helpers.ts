import { playableHighlands, train } from './highland-helpers';
import { PlayerBot } from './helpers';

export function enterCoast(bot: PlayerBot) {
  if (bot.game.player.map === 'rockGym') bot.portal('stone');
  if (bot.game.player.map === 'stone') bot.portal('coastRoute');
  if (bot.game.player.map === 'coastRoute') bot.portal('harbor');
  bot.heal();
}
export function waterChallenge(bot: PlayerBot) {
  bot.npc('waterGymGate');
  bot.npc('waterSwitchOne');
  bot.npc('waterScout');
  bot.npc('waterSwitchTwo');
  bot.npc('waterKeeper');
  bot.npc('waterLeader');
  if (!bot.game.progress.flags.waterLeader) throw new Error('Tide badge not earned');
}
/** Every advancement is a normal reducer command; also used for the optional demo file. */
export function coastReady() {
  const bot = playableHighlands();
  train(
    bot,
    bot.game.party.find((id) =>
      ['creature_001', 'creature_002'].includes(bot.game.creatures[id]!.speciesId),
    )!,
    20,
  );
  bot.npc('mineForeman');
  bot.portal('mine');
  bot.npc('mineClueOne');
  bot.npc('mineClueTwo');
  bot.npc('mineGuard');
  bot.npc('mineRegulator');
  bot.portal('stone');
  bot.npc('mineForeman');
  bot.heal();
  enterCoast(bot);
  return bot;
}
export function harborInvestigation(bot: PlayerBot) {
  bot.npc('harborMaster');
  bot.npc('cargoManifest');
  bot.portal('tideworks');
  bot.npc('sluiceGauge');
  bot.npc('tideGuard');
  bot.npc('sluiceConsole');
  bot.portal('harbor');
  bot.npc('harborMaster');
}
export function coastSidequests(bot: PlayerBot) {
  bot.portal('coastRoute');
  bot.npc('driftBottle');
  bot.npc('shoreObservation');
  bot.portal('harbor');
  bot.npc('tideChart');
  bot.npc('postkeeper');
  bot.npc('lighthouseKeeper');
  bot.portal('tideworks');
  bot.npc('lensCase');
  bot.npc('oldLighthouse');
  bot.npc('poolObservation');
  bot.npc('reefCleanup');
}
export function playableCoast() {
  const bot = coastReady();
  harborInvestigation(bot);
  bot.heal();
  waterChallenge(bot);
  bot.portal('harbor');
  bot.heal();
  coastSidequests(bot);
  bot.portal('harbor');
  bot.heal();
  return bot;
}
