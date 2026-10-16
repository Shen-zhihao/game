import { MAPS } from '../src/content/world';
import { MapId } from '../src/game/model';
import { ADVENTURE_GYMS } from '../src/content/adventure';
import { PlayerBot } from './helpers';
import { playableCoast } from './coast-helpers';
import { MOVES } from '../src/content/catalog';
import { statsFor } from '../src/game/rules';

export function travel(bot: PlayerBot, destination: MapId) {
  const queue: MapId[][] = [[bot.game.player.map]],
    visited = new Set<MapId>([bot.game.player.map]);
  while (queue.length) {
    const path = queue.shift()!,
      map = path.at(-1)!;
    if (map === destination) {
      for (const next of path.slice(1)) bot.portal(next);
      return;
    }
    for (const p of MAPS[map].portals)
      if (!p.flag && !visited.has(p.map)) {
        visited.add(p.map);
        queue.push([...path, p.map]);
      }
  }
  throw new Error(`No ordinary route to ${destination}`);
}
export function regionalChallenge(bot: PlayerBot, number: number) {
  const gym = ADVENTURE_GYMS.find((g) => g.number === number)!;
  travel(bot, gym.town);
  bot.heal();
  for (const npc of [gym.gate, gym.switches[0], gym.scout, gym.switches[1], gym.keeper, gym.leader])
    bot.npc(npc);
  bot.portal(gym.town);
  bot.heal();
}
export function trainVolt(bot: PlayerBot, level: number, id = bot.game.party[0]!) {
  travel(bot, 'volt');
  bot.heal();
  bot.act({ kind: 'lead', creatureId: id });
  for (let attempt = 0; bot.game.creatures[id]!.level < level && attempt < 120; attempt++) {
    bot.portal('powerRoute');
    bot.npc('powerTrainer');
    bot.portal('volt');
    bot.heal();
  }
  if (bot.game.creatures[id]!.level < level)
    throw new Error('Regional training did not reach target');
}
export function powerInvestigation(bot: PlayerBot) {
  travel(bot, 'volt');
  bot.npc('powerEngineer');
  travel(bot, 'powerStation');
  for (const id of ['powerManifest', 'powerCircuit', 'powerGuard', 'powerConsole']) bot.npc(id);
  travel(bot, 'volt');
  bot.npc('powerEngineer');
}
export function electricSidequests(bot: PlayerBot) {
  travel(bot, 'volt');
  bot.npc('gardenKeeper');
  travel(bot, 'powerRoute');
  bot.npc('parcelTag');
  bot.npc('gardenValve');
  travel(bot, 'volt');
  bot.npc('parcelReceipt');
  bot.npc('lostClerk');
  bot.npc('gardenBed');
  travel(bot, 'powerStation');
  bot.npc('shiftWest');
  bot.npc('shiftEast');
  travel(bot, 'volt');
  bot.npc('shiftClerk');
}
export function playableElectric() {
  const bot = playableCoast();
  trainVolt(bot, 28);
  powerInvestigation(bot);
  electricSidequests(bot);
  bot.npc('rivalPower');
  regionalChallenge(bot, 4);
  return bot;
}
export function windInvestigation(bot: PlayerBot) {
  travel(bot, 'wind');
  bot.npc('windScientist');
  travel(bot, 'windObservatory');
  for (const id of ['windArchive', 'windVane', 'windGuard', 'windValve']) bot.npc(id);
  travel(bot, 'wind');
  bot.npc('windScientist');
}
export function windSidequests(bot: PlayerBot) {
  travel(bot, 'wind');
  bot.heal();
  bot.npc('kiteChild');
  travel(bot, 'windRoute');
  for (const id of ['kiteLine', 'migrationLow', 'pactStone']) bot.npc(id);
  travel(bot, 'windSanctuary');
  for (const id of ['kiteAnchor', 'migrationPeak', 'migrationNest', 'pactName']) bot.npc(id);
  travel(bot, 'wind');
  for (const id of ['kiteChild', 'migrationKeeper', 'pactKeeper']) bot.npc(id);
}
export function playableWind() {
  const bot = playableElectric();
  trainVolt(bot, 35);
  windInvestigation(bot);
  windSidequests(bot);
  bot.npc('rivalWind');
  regionalChallenge(bot, 5);
  return bot;
}
export function furnaceInvestigation(bot: PlayerBot) {
  travel(bot, 'furnace');
  bot.heal();
  bot.npc('furnaceForeman');
  travel(bot, 'foundry');
  for (const id of ['foundryCrate', 'foundryPressure', 'foundryGuard', 'foundryConsole'])
    bot.npc(id);
  travel(bot, 'furnace');
  bot.npc('furnaceForeman');
}
export function furnaceSidequests(bot: PlayerBot) {
  travel(bot, 'furnace');
  bot.heal();
  bot.npc('toolMaker');
  bot.npc('springKeeper');
  travel(bot, 'furnaceRoute');
  bot.npc('toolCase');
  bot.npc('oldFreight');
  travel(bot, 'foundry');
  bot.npc('toolRack');
  bot.npc('oldLedger');
  travel(bot, 'hotSprings');
  bot.npc('springCold');
  bot.npc('springWarm');
  bot.npc('springMix');
  travel(bot, 'furnace');
  for (const id of ['toolMaker', 'springKeeper', 'oldForeman']) bot.npc(id);
}
export function playableFurnace() {
  const bot = playableWind();
  trainVolt(bot, 41);
  furnaceInvestigation(bot);
  furnaceSidequests(bot);
  bot.npc('rivalFurnace');
  regionalChallenge(bot, 6);
  return bot;
}
export function lakeInvestigation(bot: PlayerBot) {
  travel(bot, 'lake');
  bot.heal();
  bot.npc('lakeArchivist');
  travel(bot, 'mirrorArchive');
  bot.npc('lakeArchiveOne');
  bot.npc('lakeArchiveTwo');
  travel(bot, 'mirrorRuins');
  for (const id of ['mirrorNorth', 'mirrorEast', 'mirrorWest', 'mirrorGuard', 'mirrorConsole'])
    bot.npc(id);
  travel(bot, 'lake');
  bot.npc('lakeArchivist');
}
export function lakeSidequests(bot: PlayerBot) {
  travel(bot, 'lakeRoute');
  bot.npc('oldSketch');
  bot.npc('mirrorFootOne');
  travel(bot, 'mirrorArchive');
  bot.npc('currentSketch');
  travel(bot, 'mirrorRuins');
  for (const id of ['rubbingNorth', 'rubbingEast', 'rubbingSouth', 'mirrorFootTwo', 'springSurvey'])
    bot.npc(id);
  travel(bot, 'mirrorArchive');
  bot.npc('rubbingDesk');
  travel(bot, 'lake');
  for (const id of ['memoryPainter', 'rubbingScholar', 'mirrorKeeper']) bot.npc(id);
}
export function playableLake() {
  const bot = playableFurnace();
  trainVolt(bot, 46);
  lakeInvestigation(bot);
  lakeSidequests(bot);
  bot.npc('rivalLake');
  regionalChallenge(bot, 7);
  return bot;
}
export function starInvestigation(bot: PlayerBot) {
  travel(bot, 'star');
  bot.heal();
  bot.act({ kind: 'buy', itemId: 'hyper_potion', quantity: 10 });
  const lead = bot.game.creatures[bot.game.party[0]!]!;
  const support = lead.moves.findIndex((move) => move.id === 'growl');
  if (support >= 0)
    bot.act({ kind: 'centerLearn', creatureId: lead.id, moveId: 'surf', replace: support });
  bot.npc('starCoordinator');
  travel(bot, 'starCore');
  for (const id of [
    'coreReadout',
    'coreWest',
    'coreEast',
    'coreCommander',
    'coreReturn',
    'coreRegulator',
  ])
    bot.npc(id);
  travel(bot, 'star');
  bot.npc('starCoordinator');
}
export function starSidequests(bot: PlayerBot) {
  for (const town of [
    'dawn',
    'moss',
    'stone',
    'harbor',
    'volt',
    'wind',
    'furnace',
    'lake',
    'star',
  ] as const) {
    travel(bot, town);
    bot.heal();
  }
  bot.npc('photoKeeper');
  travel(bot, 'starRoute');
  bot.npc('pactCaretaker');
  travel(bot, 'ancientTemple');
  bot.npc('templeWater');
  bot.npc('templeLight');
  bot.npc('templePact');
  travel(bot, 'starRoute');
  bot.npc('pactCaretaker');
}
export function playableStar() {
  const bot = playableLake();
  trainVolt(bot, 52);
  starInvestigation(bot);
  starSidequests(bot);
  travel(bot, 'star');
  bot.heal();
  bot.act({ kind: 'buy', itemId: 'hyper_potion', quantity: 10 });
  bot.npc('rivalStar');
  regionalChallenge(bot, 8);
  return bot;
}
export function prepareLeague(bot: PlayerBot) {
  travel(bot, 'star');
  bot.heal();
  for (const [itemId, quantity] of [
    ['hyper_potion', 30],
    ['revive', 10],
    ['ether', 30],
    ['antidote', 10],
  ] as const)
    bot.act({ kind: 'buy', itemId, quantity });
  for (const [index, id] of bot.game.party.entries()) {
    const quantity = Math.max(0, (index === 0 ? 62 : 58) - bot.game.creatures[id]!.level);
    if (quantity) bot.act({ kind: 'buy', itemId: 'candy', quantity });
    for (let i = 0; bot.game.creatures[id]!.level < (index === 0 ? 62 : 58) && i < 100; i++) {
      bot.act({ kind: 'useItem', itemId: 'candy', creatureId: id });
      bot.choices();
    }
  }
  bot.heal();
}
export function leagueSupplies(bot: PlayerBot) {
  for (const id of bot.game.party) {
    let c = bot.game.creatures[id]!;
    if (!c.hp) bot.act({ kind: 'useItem', itemId: 'revive', creatureId: id });
    for (let i = 0; bot.game.creatures[id]!.hp < statsFor(bot.game.creatures[id]!).hp && i < 8; i++)
      bot.act({ kind: 'useItem', itemId: 'hyper_potion', creatureId: id });
    c = bot.game.creatures[id]!;
    if (c.status) bot.act({ kind: 'useItem', itemId: 'antidote', creatureId: id });
    for (let i = 0; bot.game.creatures[id]!.moves.some((m) => m.pp < MOVES[m.id]!.pp) && i < 4; i++)
      bot.act({ kind: 'useItem', itemId: 'ether', creatureId: id });
  }
}
export function runLeague(bot: PlayerBot) {
  travel(bot, 'league');
  bot.heal();
  if (!bot.game.progress.flags.rivalLeague) bot.npc('rivalLeague');
  bot.npc('leagueRegistrar');
  for (const [i, event] of [
    'leagueIce',
    'leagueGhost',
    'leagueDark',
    'leagueDragon',
    'leagueChampion',
  ].entries()) {
    leagueSupplies(bot);
    const lead = i === 0 ? bot.game.party.at(-1)! : bot.game.party[0]!;
    bot.act({ kind: 'lead', creatureId: lead });
    bot.npc(event);
  }
}
export function playableChampion() {
  const bot = playableStar();
  prepareLeague(bot);
  runLeague(bot);
  return bot;
}
export function conservationStories(bot: PlayerBot) {
  travel(bot, 'dawn');
  bot.npc('professor');
  travel(bot, 'deepwood');
  bot.npc('woodNote');
  bot.npc('manualCoach');
  travel(bot, 'echoMeadow');
  for (const id of ['meadowNote', 'echoPeak', 'echoValley', 'echoCliff', 'echoSteward'])
    bot.npc(id);
  travel(bot, 'mine');
  bot.npc('miningPlaque');
  travel(bot, 'stone');
  bot.npc('retiredMiner');
  travel(bot, 'mineDepths');
  for (const id of ['mineAir', 'mineStone', 'mineWater']) bot.npc(id);
  travel(bot, 'stone');
  bot.npc('retiredMiner');
  travel(bot, 'kelpCove');
  for (const id of ['shoreNote', 'shipArchive', 'coveCase']) bot.npc(id);
  travel(bot, 'dawn');
  bot.npc('professor');
  bot.npc('professor');
  bot.npc('professor');
  travel(bot, 'route');
  bot.npc('routeChest');
  travel(bot, 'stoneRoute');
  bot.npc('habitat');
  travel(bot, 'forest');
  for (const id of ['mistClueOne', 'mistClueTwo', 'mistShrine']) bot.npc(id);
  travel(bot, 'nightHall');
  for (const id of ['nightCold', 'nightFlame', 'nightBalance']) bot.npc(id);
  travel(bot, 'dawn');
  bot.npc('professor');
}
export function playablePostgame() {
  const bot = playableChampion();
  conservationStories(bot);
  return bot;
}
