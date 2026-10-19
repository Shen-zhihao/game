import { applyProduction } from '../production';
import { applyChallenge, finishChallengeBattle } from '../challenge';
import { applyFastTravel } from '../travel';
import {
  canLearnMove,
  ITEMS,
  isOrdinarySpecies,
  MOVES,
  SPECIES,
  STARTERS,
} from '../../content/catalog';
import { SIGNATURE_BY_SPECIES } from '../../content/signatures';
import { equipItem } from '../heldItems';
import { boxTransferReason, reorderParty } from '../party';
import { activityAtNpc, applyActivity, openActivity } from '../activities';
import { HABITAT_SITES } from '../../content/habitats';
import {
  isTownLocation,
  GYM_BARRIERS,
  GYM_TRAINERS,
  townForMap,
  MAPS,
  npcVisible,
  npcDefeated,
  npcLocation,
  terrainPassable,
} from '../../content/world';
import { servicePosition, worldMapFor } from '../../content/buildings';
import { interactHighlands } from '../highlandStory';
import { coastEncounter, interactCoast } from '../coastStory';
import { adventureEncounter, PHOTO_TOWNS } from '../../content/adventure';
import { interactAdventure } from '../adventureStory';
import { interactConservation } from '../conservation';
import {
  interactLeague,
  leagueVictoryPresentation,
  resetLeague,
  presentCompleteJourney,
} from '../league';
import { journalQuests, recordQuestContact } from '../../content/quests';
import { interactCityDistrict } from '../cityDistricts';
import { buyItem, sellItem, exchangeItem, transactQuest } from '../cityServices';
import { consumeRepelStep, repelsEncounter, applyFieldItem } from '../fieldItems';
import { advanceTrainerChallenge, detectTrainer } from '../trainerChallenges';
import {
  allocatePoints,
  availablePoints,
  earnedPoints,
  emptyStats,
  ensureTraining,
  recommendedAllocation,
  sumStats,
} from '../growth';
import { isSupply, applySupply } from '../items';
import { copyMove, recallOptions } from '../skills';
import {
  advanceWeather,
  createEnvironment,
  syncWeather,
  weatherAt,
  weightedEcology,
} from '../environment';
import { redeemCheat } from '../cheats';
import { advanceCalendar, calendarFor, createCalendar, dayPeriodFor, applyRest } from '../calendar';
import { effectiveAccessFlags } from '../../content/keyItems';
import {
  atCenter,
  canSurf,
  centerLearnReason,
  fieldSkill,
  fieldSkillUnlocked,
  wouldLoseSurf,
} from '../fieldSkills';
import { battleAction, healParty, startBattle } from '../battle';
import { rememberRecoveryTowns, townVisitFlag } from '../recovery';
import {
  advanceExploration,
  createExploration,
  encountersAt,
  ensureExploration,
  faceTraveler,
  facingNpc,
  worldNpcs,
} from '../exploration';
import { Command, GameState, MapId, StoryEvent, WalkDirection } from '../model';
import { resolveWalk } from '../movement';
import {
  canEvolve,
  changeMaxHp,
  creatureName,
  gainXp,
  learnAvailable,
  makeCreature,
  random,
  record,
  statsFor,
  xpAt,
} from '../rules';

export function newGame(
  name: string,
  avatar: number,
  starterId: string | null,
  seed: number,
): GameState {
  // A null starter starts the playable prologue. A supplied starter preserves the
  // established-adventure fixture / ch1.1 entry used by existing saves and audits.
  if (starterId !== null && !STARTERS.includes(starterId)) throw new Error('请选择一个初始伙伴');
  const opening = starterId === null;
  const state: GameState = {
    calendar: createCalendar(),
    environment: createEnvironment(seed),
    masterBalls: { claimed: [], used: 0 },
    cityServices: { merit: 0, quests: {}, exchanges: {} },
    repelSteps: 0,
    player: {
      name: name.trim().slice(0, 12) || '旅人',
      avatar,
      money: 1000,
      map: 'dawn',
      x: 8,
      y: opening ? 8 : 7,
      facing: opening ? 'left' : 'up',
      healMap: 'dawn',
    },
    progress: {
      chapter: 1,
      badges: 0,
      flags: { [townVisitFlag('dawn')]: true, ...(opening ? { opening: true } : {}) },
    },
    creatures: {},
    party: [],
    box: [],
    inventory: {
      ball: opening ? 0 : 10,
      potion: opening ? 1 : 5,
      antidote: opening ? 0 : 2,
      candy: 0,
    },
    dex: { seen: [], caught: [] },
    rng: seed >>> 0 || 1,
    sequence: 0,
    steps: 0,
    encounterCooldown: 8,
    playTimeSeconds: 0,
    battle: null,
    pending: [],
    dialogue: null,
    notice: '冒险已准备就绪。',
  };
  if (opening) {
    const home = npcLocation('home')!;
    Object.assign(state.player, { map: home.map, x: 7, y: 9, facing: 'up' });
  }
  state.world = createExploration(seed, state.player);
  if (opening) {
    talk(state, '妈妈', [
      `${state.player.name}，终于搬到晨芽镇了！行李已经放好，先去认识一下新邻居吧。`,
      '阿澈在镇子东侧的研究所。他常帮岚博士做野外调查，可以带你熟悉这里。',
      '你还没有自己的精灵，先别独自走进草丛。沿南侧出口走出家门，朝建筑的门口走就能进入，靠近人后按 A 交谈。',
    ]);
    return state;
  }
  const starter = makeCreature(state, starterId!, 5);
  state.creatures[starter.id] = starter;
  state.party.push(starter.id);
  state.dex.seen.push(starterId!);
  state.dex.caught.push(starterId!);
  talk(state, '岚博士', [
    `${state.player.name}，欢迎来到星苔地区。${creatureName(starter)}已经选择与你同行。`,
    '用左侧方向键行走，靠近人物后按 A 交谈。也可以轻点相邻地格移动。',
    '阿澈在镇子东侧的研究所等你，先来一场友好的练习吧。菜单里可以查看任务、保存和传档。',
  ]);
  return state;
}
export function talk(
  state: GameState,
  speaker: string,
  lines: string[],
  after: StoryEvent | null = null,
): void {
  state.dialogue = { speaker, lines, index: 0, after };
}
function storyEvent(state: GameState, event: StoryEvent): void {
  const f = state.progress.flags;
  if (event === 'leagueCredits') {
    f.creditsViewed = true;
    return;
  }
  if (event === 'journeyCredits') {
    f.journeyCreditsViewed = true;
    return;
  }
  const regional = adventureEncounter(event);
  if (regional) {
    if (regional.requires.every((flag) => f[flag]) && !f[regional.caught]) {
      f[regional.awakened] = true;
      startBattle(state, event, { speciesId: regional.speciesId, level: regional.level });
    }
    return;
  }
  const coast = coastEncounter(event);
  if (coast) {
    if (coast.requires.every((flag) => f[flag]) && !f[coast.caught]) {
      f[coast.awakened] = true;
      startBattle(state, event, { speciesId: coast.speciesId, level: coast.level });
    }
    return;
  }
  if (event === 'bellEncounter') {
    if (f.plaqueReturned && !f.bellCaught) {
      f.bellAwakened = true;
      startBattle(state, event, { speciesId: 'creature_077', level: 10 });
    }
    return;
  }
  if (event === 'mistEncounter') {
    if (f.questReward && f.mistClueOne && f.mistClueTwo && !f.mistCaught) {
      f.mistAwakened = true;
      startBattle(state, event, { speciesId: 'creature_025', level: 9 });
    }
    return;
  }
  if (event === 'discoveryEncounter') {
    const world = ensureExploration(state);
    const find = world.activeFind ? world.finds[world.activeFind] : null;
    world.activeFind = null;
    if (find?.kind === 'wild' && find.claimed)
      startBattle(state, event, {
        speciesId: find.speciesId,
        level: ['coastRoute', 'tideworks'].includes(find.map)
          ? 12
          : find.map === 'mine'
            ? 10
            : find.map === 'stoneRoute'
              ? 9
              : find.map === 'forest'
                ? 8
                : 5,
      });
    return;
  }
  if (event === 'meetNeighbor') {
    f.neighborMet = true;
    return;
  }
  if (event === 'hearProfessor') {
    f.professorCall = true;
    return;
  }
  if (event === 'chooseStarter') {
    if (f.opening && f.professorCall && !state.party.length) f.starterChoice = true;
    return;
  }
  if (event === 'openingRescue') {
    if (f.opening && f.professorCall && state.party.length && !f.professorRescued)
      startBattle(state, event, { speciesId: 'creature_037', level: 2 });
    return;
  }
  if (event === 'partnerGift') {
    if (f.opening && f.professorRescued && state.party.length && !f.partnerReceived) {
      f.partnerReceived = true;
      healParty(state);
      state.notice = `${creatureName(state.creatures[state.party[0]!]!)}正式成为你的第一位伙伴。`;
    }
    return;
  }
  if (event === 'fieldKitGift') {
    if (f.opening && f.partnerReceived && f.rival && !f.fieldKitReceived) {
      f.fieldKitReceived = true;
      state.inventory.ball = (state.inventory.ball ?? 0) + 10;
      state.inventory.potion = (state.inventory.potion ?? 0) + 5;
      state.inventory.antidote = (state.inventory.antidote ?? 0) + 2;
      state.notice = '获得精灵图鉴、星纹球 ×10、草露药 ×5、清醒露 ×2。可以学习捕捉了！';
    }
    return;
  }
  if (event === 'rescue') return;
  if (event === 'catchTutorial') {
    if (f.opening && !f.fieldKitReceived) return;
    startBattle(state, event, { speciesId: 'creature_037', level: 4, tutorial: true });
    return;
  }
  startBattle(state, event);
}
function interact(state: GameState): void {
  const {
    player,
    progress: { flags },
  } = state;
  const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[player.facing]!;
  const x = player.x + delta[0]!;
  const y = player.y + delta[1]!;
  ensureExploration(state);
  const npc = facingNpc(state);
  if (!npc) {
    if (MAPS[player.map].rows[y]?.[x] === '~') {
      const site = encountersAt(player.map, x, y, 'water');
      const water = {
        ...site,
        encounters: weightedEcology(site.encounters, weatherAt(state), dayPeriodFor(state)),
      };
      if (!flags.catchTutorial) {
        state.notice = '完成捕捉入门后，可以站在岸边朝向水面调查精灵。';
        return;
      }
      if (!water.encounters.length) {
        state.notice = '这片水面很安静，暂时没有发现精灵。';
        return;
      }
      let choice = random(state) * water.encounters.reduce((sum, e) => sum + e.weight, 0);
      const encounter =
        water.encounters.find((e) => (choice -= e.weight) < 0) ?? water.encounters[0]!;
      startBattle(state, null, {
        speciesId: encounter.speciesId,
        level: encounter.min + Math.floor(random(state) * (encounter.max - encounter.min + 1)),
      });
      state.battle?.logs.unshift(`你调查了${water.name}，水面泛起波纹！`);
      return;
    }
    state.notice = '靠近人物、石碑或发光物，朝向它再按 A。';
    return;
  }
  faceTraveler(state, npc);
  const activity = activityAtNpc(state, npc.id);
  if (activity && flags.rival && flags.catchTutorial) {
    if (activity.prerequisite && !flags[activity.prerequisite]) {
      talk(state, npc.name, ['先完成本馆学徒的练习，再来操作第二处机关。']);
    } else openActivity(state, activity);
    return;
  }
  if (interactCityDistrict(state, npc, (speaker, lines) => talk(state, speaker, lines))) return;
  recordQuestContact(state, npc.id);
  if (
    (GYM_TRAINERS.has(npc.event!) || (npc.role === 'switch' && GYM_BARRIERS[player.map])) &&
    (!flags.rival || !flags.catchTutorial)
  ) {
    talk(state, npc.name, ['欢迎参观道馆。先完成基础对战与捕捉练习，再来参加本馆的考验。']);
    return;
  }
  if (npc.role === 'trainer' && npcDefeated(flags, npc)) {
    talk(state, npc.name, [
      npc.id === 'forestScout'
        ? '你和伙伴的配合让我很放心。记下两处线索后，从南面推动倒木就能继续调查。'
        : GYM_TRAINERS.has(npc.event!) && npc.event?.endsWith('Keeper')
          ? '那场对战让我看到了你们的默契。继续往前走，馆主在等你。'
          : GYM_TRAINERS.has(npc.event!) && npc.event?.endsWith('Scout')
            ? '还记得上次的切磋吗？接下来去看看道馆里的机关吧，祝你挑战顺利。'
            : '上次的对战很精彩，我还记得你和伙伴的配合。今天就聊聊旅途见闻吧，祝你一路顺风！',
    ]);
    return;
  }
  if (
    interactConservation(state, npc, (speaker, lines, after) => talk(state, speaker, lines, after))
  )
    return;
  if (
    interactLeague(
      state,
      npc,
      (speaker, lines, after) => talk(state, speaker, lines, after),
      healParty,
    )
  )
    return;
  if (interactAdventure(state, npc, (speaker, lines, after) => talk(state, speaker, lines, after)))
    return;
  if (interactCoast(state, npc, (speaker, lines, after) => talk(state, speaker, lines, after)))
    return;
  if (interactHighlands(state, npc, (speaker, lines, after) => talk(state, speaker, lines, after)))
    return;
  switch (npc.role) {
    case 'discovery': {
      const world = ensureExploration(state);
      const find = world.finds[npc.id];
      if (!find || find.claimed) break;
      if (!flags.catchTutorial) {
        talk(state, npc.name, ['先学会与伙伴战斗和捕捉，再来调查沿途的动静与补给吧。']);
        break;
      }
      if (find.kind === 'items' && (state.inventory[find.itemId] ?? 0) + find.quantity > 999) {
        talk(state, '遗落补给', ['背包暂时放不下这些补给。先使用一些道具，再回来领取。']);
        break;
      }
      find.claimed = true;
      if (find.kind === 'wild') {
        world.activeFind = npc.id;
        talk(
          state,
          '草间动静',
          ['你循着草叶的沙沙声靠近，一只精灵从草间探出了头！'],
          'discoveryEncounter',
        );
      } else {
        state.inventory[find.itemId] = (state.inventory[find.itemId] ?? 0) + find.quantity;
        talk(state, '遗落补给', [
          `发现${ITEMS[find.itemId]!.name} ×${find.quantity}。探索记录已经保存，这处补给不会重复刷新。`,
        ]);
      }
      break;
    }
    case 'echo':
      if (flags.mistCaught)
        talk(state, npc.name, ['旧铃的回声已经回应你。雾铃灵正和你一起继续旅程。']);
      else if (!flags.questReward)
        talk(state, npc.name, [
          '残碑上刻着护林人的旧约。先帮穗禾查清森林里的异常，再回来了解这段故事。',
        ]);
      else if (!flags.mistClueOne || !flags.mistClueTwo)
        talk(state, npc.name, [
          '溪岸与林冠各留下一段铃声。调查东南溪岸与东北草地的两处回声，再回到残碑前。',
        ]);
      else
        talk(
          state,
          '旧铃回声',
          [
            '两段铃声合成护林人的旧曲。雾铃灵原来一直在寻找曾经守护森林的约定。',
            '你将调查记录放在碑前，表明森林已经安全。它从雾气里走出，愿意接受你的挑战。',
            '这是剧情开启的定点相遇。降低它的体力后投球；这次未能捕获，也可以再来。',
          ],
          'mistEncounter',
        );
      break;
    case 'home':
      healParty(state);
      talk(state, npc.name, [
        state.party.length ? '先休息一下吧。伙伴的体力已经恢复了。' : '新家随时欢迎你回来休息。',
        !flags.neighborMet
          ? '阿澈在镇子东侧的研究所，去和他打个招呼吧。'
          : '博士经常在镇外调查，出门记得留意他的消息。',
      ]);
      break;
    case 'distressedProfessor':
    case 'openingWild':
    case 'professorBag':
      talk(
        state,
        '岚博士',
        state.party.length
          ? ['就是你刚才借用的那一只！请再帮我把这只躁动的绒团鼠赶开！']
          : [
              '救、救命！我在观察草丛时惊到了绒团鼠，背包也掉在路边了。',
              '请调查地上的背包，从三只精灵中借用一只，帮我把它赶开！',
            ],
        state.party.length
          ? 'openingRescue'
          : npc.role === 'professorBag'
            ? 'chooseStarter'
            : 'hearProfessor',
      );
      break;
    case 'professor':
      if (flags.opening && !flags.partnerReceived) {
        talk(
          state,
          npc.name,
          [
            '谢谢你刚才出手相助。它很信任你，就让它正式成为你的伙伴吧！',
            '阿澈正在一号路东部取样。去和他切磋一下，再回研究所找我。',
          ],
          'partnerGift',
        );
        break;
      }
      if (flags.opening && flags.rival && !flags.fieldKitReceived) {
        talk(
          state,
          npc.name,
          [
            '阿澈已经告诉我你们的对战了。你和伙伴配合得很好！',
            '这本图鉴会记录见过和获得的精灵。再带上捕捉球与恢复品，去一号路让阿澈教你捕捉吧。',
          ],
          'fieldKitGift',
        );
        break;
      }
      talk(state, npc.name, [
        flags.opening && !flags.rival
          ? '阿澈正在一号路东部等你。完成切磋后，回来领取图鉴和捕捉补给。'
          : '沿着东侧道路前往苔丘镇吧。不同属性会互相克制，伙伴们的力量需要一起发挥。',
        '城镇商店可以购买补给，精灵中心免费治疗。训练师获胜后会和你聊聊旅途，沿途草丛也适合练习。',
      ]);
      break;
    case 'rival':
      if (flags.opening && !flags.neighborMet) {
        talk(
          state,
          npc.name,
          [
            '你就是新搬来的邻居吧？我是阿澈，欢迎来到晨芽镇！',
            '岚博士正在东边的一号路调查精灵，我正准备去帮忙。你也可以去认识一下他。',
          ],
          'meetNeighbor',
        );
        break;
      }
      talk(
        state,
        npc.name,
        flags.rival
          ? ['一号路见！把野生精灵的体力降低，再使用星纹球。']
          : ['伙伴看起来精神不错！来一场练习对战吧。即使输了，我也会帮你恢复。'],
        flags.rival ? null : 'rival',
      );
      break;
    case 'healer':
      healParty(state);
      if (
        flags.catchTutorial &&
        PHOTO_TOWNS.includes(worldMapFor(player.map) as (typeof PHOTO_TOWNS)[number])
      )
        flags[`photoStamp_${worldMapFor(player.map)}`] = true;
      if (townForMap(player.map)) player.healMap = townForMap(player.map)!;
      talk(state, npc.name, [
        '伙伴们的 HP、PP 和异常状态已全部恢复。旅途顺利！',
        '在柜台前打开菜单「精灵中心」，可免费恢复、遗忘和重学技能。剧情通用技能要先完成对应故事，解锁后可教给任意伙伴。',
      ]);
      break;
    case 'shop':
      talk(state, npc.name, [
        '完成捕捉入门后，打开「背包与商店」可购买星纹球、驱避喷雾和补给品，出售多余道具，也能用调查印记兑换特殊道具。',
        '菜单的「任务管理」有本地居民委托。药物交付和奖励只在确认领取时结算，每份委托领取一次。',
      ]);
      flags.shop = true;
      break;
    case 'quest':
      if (npc.id === 'catchGuide') {
        if (!flags.catchTutorial) {
          if (state.inventory.ball! < 1) state.inventory.ball = 3;
          talk(
            state,
            npc.name,
            [
              '看，草丛里有绒团鼠！打开「背包」→「精灵球」，选择星纹球并投出。这次练习我会帮你稳住星纹球。',
            ],
            'catchTutorial',
          );
        } else
          talk(state, npc.name, ['捕捉时降低 HP 或施加异常状态会更容易成功。前往东边的苔丘镇吧！']);
      } else if (!flags.quest) {
        if (!flags.catchTutorial) {
          talk(state, npc.name, [
            '欢迎来到苔丘镇。先回一号路，让阿澈带你学习捕捉，再来帮我调查吧。',
          ]);
          break;
        }
        flags.quest = true;
        talk(state, npc.name, [
          '我的研究伙伴萤灯蛾在北面的苔影森林失踪了。请调查断枝和微光脚印。',
          '采集员青弥能帮你移开倒木。找到伙伴后回来找我，道馆的榆岚也会等你的消息。',
          '榆岚擅长草系。一号路的风翎雀是不错的帮手；先在镇南训练场练习，出发前来治疗所休息。',
        ]);
      } else if (flags.rescued && !flags.questReward) {
        flags.questReward = true;
        player.money += 500;
        state.inventory.candy! += 2;
        state.inventory.ball! += 5;
        talk(state, npc.name, [
          '你救回了萤灯蛾！这些扭曲的晶矿……定序社又在研究精灵的力量。',
          '获得旅费 500、成长果 ×2、星纹球 ×5。东部旧铃残碑也有异常回声，可以继续调查；道馆随时接受挑战。',
        ]);
      } else
        talk(state, npc.name, [
          flags.questReward
            ? '森林的朋友们会记住你的善意。东部溪岸与林冠有两处回声，记下后去旧铃残碑看看吧。'
            : '森林里有两处线索。调查后请采集员帮忙，再从南面推动倒木。',
        ]);
      break;
    case 'resident':
    case 'sign':
      if (npc.lines) {
        talk(state, npc.name, npc.lines);
        break;
      }
      talk(state, npc.name, [
        player.map === 'forest'
          ? '林间调查：折断的枝条在西南方，闪光的脚印在中部东侧。采集员站在西侧草丛。'
          : '东行：晨光一号路 → 苔丘镇。方向键行走，A 调查；菜单可随时查看目标。',
      ]);
      break;
    case 'trainer':
      if (npc.event === 'forestGuard' && !flags.logMoved) {
        talk(state, npc.name, ['先移开倒木，调查通往深处的路径。']);
        break;
      }
      talk(
        state,
        npc.name,
        [
          npc.event === 'training'
            ? '来一次练习吧！用这场对战熟悉你和伙伴的配合。'
            : npc.event === 'forestScout'
              ? '我来帮你！先让我看看你和伙伴是否足以面对森林深处的危险。'
              : '让我们用精灵的力量来对话吧！',
        ],
        npc.event!,
      );
      break;
    case 'clue':
      if (npc.id === 'mistClueOne' || npc.id === 'mistClueTwo') {
        flags[npc.id] = true;
        talk(state, '旧铃回声', [
          npc.id === 'mistClueOne'
            ? '溪岸的铃声低而悠长，像有人在回应森林深处。你记下了这一段旋律。'
            : '林冠的铃声清亮短促，和溪岸的旋律正好接续。你记下了另一段旋律。',
        ]);
        break;
      }
      if (!flags.quest) {
        talk(state, '调查', ['有精灵经过的痕迹。先向苔丘镇的研究员了解情况。']);
        break;
      }
      flags[npc.id] = true;
      talk(state, '调查', [
        npc.id === 'clueOne'
          ? '新折断的枝条上留着金色鳞粉。萤灯蛾确实往森林深处去了。'
          : '脚印旁的晶矿在微微发热。有人曾把它摆成奇怪的阵列。',
        '线索已记录到任务管理。',
      ]);
      break;
    case 'log':
      if (!flags.clueOne || !flags.clueTwo || !flags.forestScout) {
        talk(state, '倒木', ['树干沉重。先调查两处线索，并请采集员青弥协助。']);
        break;
      }
      if (player.facing !== 'up') {
        talk(state, '倒木', ['从南侧朝北推，树干就能滚到凹地里。']);
        break;
      }
      flags.logMoved = true;
      talk(state, '采集员青弥', ['一、二——推！树干滚进凹地，北面的路畅通了。']);
      break;
    case 'rescue':
      if (!flags.forestGuard) {
        talk(state, '调查', ['附近的定序社调查员还在阻挠，先击退他。']);
        break;
      }
      flags.rescued = true;
      state.inventory.potion! += 2;
      talk(state, '受困的萤灯蛾', [
        '你小心拆开缠住翅膀的晶丝。萤灯蛾发出温暖的光，飞回苔丘镇。',
        '获得草露药 ×2。回去向研究员穗禾报告吧。',
      ]);
      break;
    case 'chest':
      if (flags[npc.id]) {
        talk(state, '旅行补给', ['已经取过这里的补给了。']);
        break;
      }
      flags[npc.id] = true;
      state.inventory.ball! += 3;
      state.inventory.potion! += 2;
      talk(state, '旅行补给', ['获得星纹球 ×3、草露药 ×2。']);
      break;
    case 'gate':
      if (!flags.rival || !flags.catchTutorial) {
        talk(state, '道馆入口', [
          '先完成基础对战与捕捉练习，再来挑战道馆。森林调查可以自行安排，不是入馆条件。',
        ]);
        break;
      }
      player.map =
        npc.id === 'waterGymGate' ? 'waterGym' : npc.id === 'rockGymGate' ? 'rockGym' : 'gym';
      player.x = npc.id === 'waterGymGate' || npc.id === 'rockGymGate' ? 13 : 11;
      player.y = npc.id === 'waterGymGate' ? 20 : npc.id === 'rockGymGate' ? 18 : 14;
      player.facing = 'up';
      state.notice =
        npc.id === 'waterGymGate'
          ? '调查落潮阀门，让本馆第一段浮桥归位。'
          : npc.id === 'rockGymGate'
            ? '调查南侧配重，打开本馆的第一道门。'
            : '触碰晨光石碑，打开第一道藤门。';
      break;
    case 'switch':
      if (npc.id === 'waterSwitchTwo' && !flags.waterScout) {
        talk(state, npc.name, ['先完成学徒小澜的考验，再调整回潮阀门。']);
        break;
      }
      if (npc.id === 'rockSwitchTwo' && !flags.rockScout) {
        talk(state, npc.name, ['先完成学徒砾砾的考验，再调整北侧配重。']);
        break;
      }
      if (npc.id === 'gymSwitchTwo' && !flags.gymScout) {
        talk(state, npc.name, ['先完成学徒芽芽的考验，雨露才会回应。']);
        break;
      }
      flags[npc.id] = true;
      talk(state, npc.name, [
        player.map === 'waterGym'
          ? '阀门归位，浮桥随水位平稳升起。通道打开了！'
          : player.map === 'rockGym'
            ? '配重缓缓落下，石门升起。通道打开了！'
            : '掌心触到温暖的石面，藤蔓缓缓退开。通道打开了！',
      ]);
      break;
    case 'leader':
      if (flags[npc.event!]) {
        talk(state, npc.name, [
          npc.event === 'waterLeader'
            ? '潮汐徽章与渡水装备属于你！南侧浮标捷径可以通行，陆上维修路依然开放。'
            : npc.event === 'rockLeader'
              ? '砾岩徽章属于你！碎岩工具能打开山道和矿山的捷径，其他道馆的选择仍然自由。'
              : '枝叶徽章属于你与每一位伙伴。西边的石脊城还有另一座道馆，随时可以出发。',
        ]);
        break;
      }
      if (
        npc.event === 'waterLeader'
          ? !flags.waterScout || !flags.waterKeeper
          : npc.event === 'rockLeader'
            ? !flags.rockScout || !flags.rockKeeper
            : !flags.gymScout || !flags.gymKeeper
      ) {
        talk(state, npc.name, ['先完成本馆两位学徒的考验，再来挑战馆主。']);
        break;
      }
      talk(
        state,
        npc.name,
        [
          npc.event === 'waterLeader'
            ? `顺流与逆流都需要选择。按你已有的 ${state.progress.badges} 枚徽章，让我们与伙伴一起掌舵！`
            : npc.event === 'rockLeader'
              ? `稳定不代表一动不动，找到伙伴的重心才是关键。按你已有的 ${state.progress.badges} 枚徽章，让我们开始挑战！`
              : '让我见识你和伙伴共同成长的力量！三座道馆的顺序由你决定。',
        ],
        npc.event!,
      );
      break;
  }
}
function walk(state: GameState, direction: WalkDirection): void {
  const p = state.player;
  const step = resolveWalk(state, direction);
  p.facing = step.facing;
  if (step.blocked) return;
  const x = p.x + step.dx;
  const y = p.y + step.dy;
  const tile = MAPS[p.map].rows[y]?.[x];
  if ((tile === 'W' || tile === '~') && !canSurf(state)) {
    state.notice =
      '渡水需要潮汐馆装备，或完成旧灯塔支线并让队伍伙伴学会冲浪术。北侧陆路与维修桥始终可用。';
    return;
  }
  if (!terrainPassable(p.map, x, y, effectiveAccessFlags(state))) return;
  const map = MAPS[p.map];
  const f = state.progress.flags;
  if (worldNpcs(state).some((n) => n.x === x && n.y === y && npcVisible(state, n))) return;
  const portal = map.portals.find((v) => v.x === x && v.y === y);
  if (portal) {
    if (p.map === 'dawn' && portal.map === 'route' && (f.opening ? !f.neighborMet : !f.rival)) {
      state.notice = f.opening
        ? '先去镇子东侧拜访邻居阿澈，了解镇外的情况。'
        : '阿澈在东边等你。先完成伙伴的第一场练习吧。';
      return;
    }
    if (f.opening && p.map === 'route' && portal.map === 'moss' && !f.catchTutorial) {
      state.notice = '出远门前，先完成与阿澈的切磋、回研究所领取图鉴，再学习捕捉。';
      return;
    }
    if (portal.flag && !state.progress.flags[portal.flag]) {
      state.notice = portal.blockedText!;
      return;
    }
    if (p.map === 'leagueHall' && portal.map === 'league') resetLeague(state);
    consumeRepelStep(state);
    p.map = portal.map;
    p.x = portal.toX;
    p.y = portal.toY;
    if (MAPS[p.map].interior || map.entrances?.some((e) => e.x === x && e.y === y)) p.facing = 'up';
    else if (map.interior) p.facing = 'down';
    state.notice = `到达${MAPS[p.map].name}`;
    state.encounterCooldown = 5;
    if (p.map === 'route' && f.opening && !f.professorCall) {
      talk(
        state,
        '远处的呼救声',
        ['救命！这边、这边！', '一个穿白大褂的人正被绒团鼠追赶。他指着落在路边的背包，请你帮忙。'],
        'hearProfessor',
      );
    }
    return;
  }
  if (f.opening && p.map === 'route' && !f.professorRescued && (x > 5 || y < 8)) {
    state.notice = '先帮助受困的岚博士！他的背包就在入口道路旁。';
    return;
  }
  p.x = x;
  p.y = y;
  state.steps += 1;
  const protectedStep = consumeRepelStep(state);
  if (detectTrainer(state)) return;
  if (state.encounterCooldown > 0) {
    state.encounterCooldown -= 1;
    return;
  }
  const encounters = weightedEcology(
    encountersAt(p.map, x, y, tile === '~' || tile === 'W' ? 'water' : 'land').encounters.filter(
      (e) => isOrdinarySpecies(e.speciesId),
    ),
    weatherAt(state),
    dayPeriodFor(state),
  );
  if (
    (map.rows[y]?.[x] === 'g' || tile === '~' || tile === 'W') &&
    encounters.length &&
    state.party.length > 0 &&
    (state.progress.flags.rival || state.progress.flags.partnerReceived) &&
    random(state) < 0.15
  ) {
    let choice = random(state) * encounters.reduce((sum, e) => sum + e.weight, 0);
    const encounter = encounters.find((e) => (choice -= e.weight) < 0) ?? encounters[0]!;
    const level = encounter.min + Math.floor(random(state) * (encounter.max - encounter.min + 1));
    if (repelsEncounter(state, level, protectedStep)) return;
    startBattle(state, null, {
      speciesId: encounter.speciesId,
      level,
    });
  }
}
// A command always produces a complete stable checkpoint before presentation.
function reduceCommand(current: GameState, command: Command): GameState {
  const state: GameState = JSON.parse(JSON.stringify(current));
  rememberRecoveryTowns(state);
  ensureExploration(state);
  state.calendar ??= calendarFor(state);
  syncWeather(state);
  state.masterBalls ??= { claimed: [], used: 0 };
  Object.values(state.creatures).forEach(ensureTraining);
  state.battle?.enemies.forEach(ensureTraining);
  if (state.world?.trainerChallenge && command.kind !== 'tick') return current;
  if (
    state.challenge?.active &&
    !['battle', 'closeBattle', 'challenge', 'tick'].includes(command.kind)
  ) {
    state.notice = '规则挑战进行中，请先完成或退出挑战。';
    return state;
  }
  if (command.kind === 'cheat') {
    redeemCheat(state, command.code);
    return state;
  }
  if (command.kind === 'tick') {
    if (state.activities?.active) return current;
    for (let i = 0; i < Math.max(0, Math.min(10, Math.floor(command.seconds))); i++) {
      advanceCalendar(state);
      state.playTimeSeconds++;
      if (state.world?.trainerChallenge) {
        if (advanceTrainerChallenge(state)) interact(state);
      } else {
        advanceExploration(state);
        detectTrainer(state);
      }
      advanceWeather(state);
    }
    return state;
  }
  if (command.kind === 'trackQuest') {
    if (command.questId === null) {
      state.trackedQuestId = null;
      state.notice = '已取消任务追踪。';
    } else {
      const quest = journalQuests(state).find((q) => q.id === command.questId);
      if (quest && quest.status !== 'completed') {
        state.trackedQuestId = quest.id;
        state.notice = `正在追踪「${quest.name}」，地图上会显示当前目标和进度。`;
      } else state.notice = '请选择已接取且尚未完成的任务进行追踪。';
    }
    return state;
  }
  if (command.kind === 'nextDialogue') {
    if (!state.dialogue) return current;
    const d = state.dialogue;
    if (d.index < d.lines.length - 1) d.index += 1;
    else {
      state.dialogue = null;
      if (d.after) storyEvent(state, d.after);
    }
    return state;
  }
  if (state.dialogue) return current;
  if (command.kind === 'activity') {
    if (state.battle || state.pending.length) return current;
    const outcome = applyActivity(state, command.action);
    if (outcome) {
      const sites = HABITAT_SITES.filter(
        (s) => s.map === 'coastRoute' && s.medium === 'water' && s.encounters.length,
      );
      const site = sites[outcome.fishSpot % sites.length];
      const choices = weightedEcology(
        (site?.encounters ?? []).filter((e) => isOrdinarySpecies(e.speciesId)),
        weatherAt(state),
        dayPeriodFor(state),
      );
      if (choices.length) {
        let roll = random(state) * choices.reduce((sum, e) => sum + e.weight, 0);
        const encounter = choices.find((e) => (roll -= e.weight) < 0) ?? choices[0]!;
        startBattle(state, null, {
          speciesId: encounter.speciesId,
          level: encounter.min + Math.floor(random(state) * (encounter.max - encounter.min + 1)),
        });
        (state.battle as GameState['battle'])?.logs.unshift(
          '你成功收线，水中的精灵来到了岸边！投出星纹球才能让它成为伙伴。',
        );
      }
    }
    return state;
  }
  if (state.activities?.active) return current;
  if (command.kind === 'closeBattle') {
    const b = state.battle;
    if (b?.phase === 'ended') {
      if (b.ruleChallenge) {
        finishChallengeBattle(state);
        state.battle = null;
        return state;
      }
      const leagueEnding = leagueVictoryPresentation(state, (speaker, lines, after) =>
        talk(state, speaker, lines, after),
      );
      state.battle = null;
      if (leagueEnding) return state;
      if (
        state.progress.flags.opening &&
        b.result === 'win' &&
        (b.event === 'openingRescue' ||
          (b.event === 'rival' && !state.progress.flags.fieldKitReceived))
      ) {
        const laboratory = npcLocation('professor')!;
        state.player.map = laboratory.map;
        Object.assign(state.player, servicePosition(MAPS[laboratory.map], laboratory.npc));
        state.player.facing = 'up';
        state.notice = '回到晨芽镇研究所室内。';
        talk(
          state,
          '岚博士',
          b.event === 'openingRescue'
            ? [
                '多亏你，我和调查记录都平安无事。我们先回研究所休息。',
                '你刚才与它配合得很好。这只精灵愿意跟着你，就让它正式成为你的伙伴吧！',
                '阿澈去一号路东部取样了。去和他切磋，回来告诉我结果。',
              ]
            : [
                '阿澈已经把对战结果告诉我了。你们一起回研究所，我还有东西要交给你。',
                '这是精灵图鉴，还有星纹球与恢复品。去一号路，让阿澈带你练习捕捉吧！',
              ],
          b.event === 'openingRescue' ? 'partnerGift' : 'fieldKitGift',
        );
      }
    }
    return state;
  }
  if (command.kind === 'battle') {
    battleAction(state, command.action);
    return state;
  }
  if (state.battle) return current;
  if (command.kind === 'challenge') {
    applyChallenge(state, command.action);
    return state;
  }
  if (command.kind === 'rest') {
    applyRest(state, command.target);
    return state;
  }
  if (command.kind === 'production') {
    applyProduction(state, command.action);
    return state;
  }
  if (command.kind === 'setRunning') {
    if (state.pending.length) return current;
    state.player.running = command.running;
    return state;
  }
  if (command.kind === 'fastTravel') {
    applyFastTravel(state, command.town);
    return state;
  }
  if (command.kind === 'chooseStarter') {
    const f = state.progress.flags;
    if (
      !f.opening ||
      !f.professorCall ||
      !f.starterChoice ||
      state.party.length ||
      !STARTERS.includes(command.speciesId)
    )
      return current;
    const c = makeCreature(state, command.speciesId, 5);
    state.creatures[c.id] = c;
    state.party.push(c.id);
    state.dex.seen.push(c.speciesId);
    state.dex.caught.push(c.speciesId);
    f.starterChoice = false;
    startBattle(state, 'openingRescue', { speciesId: 'creature_037', level: 2 });
    return state;
  }
  if (state.progress.flags.starterChoice) return current;
  if (command.kind === 'evolve') {
    const c = state.creatures[command.creatureId];
    state.pending = state.pending.filter(
      (p) =>
        !(p.kind === 'evolution' && p.creatureId === command.creatureId && p.toId === command.toId),
    );
    if (!c || !command.accept || !canEvolve(c, command.toId, state.inventory)) return state;
    const edge = SPECIES[c.speciesId]!.evolutions.find((e) => e.toId === command.toId)!;
    const oldMax = statsFor(c).hp;
    const oldName = creatureName(c);
    c.speciesId = command.toId;
    const nextSignature = SIGNATURE_BY_SPECIES[c.speciesId];
    c.moves = c.moves.flatMap((move) => {
      if (canLearnMove(c.speciesId, move.id)) return [move];
      // A signature evolves with its owner, without refilling spent PP.
      return nextSignature && c.level >= nextSignature.level
        ? [{ id: nextSignature.move.id, pp: Math.min(move.pp, nextSignature.move.pp) }]
        : [];
    });
    state.pending = state.pending.filter(
      (p) => p.kind !== 'move' || p.creatureId !== c.id || canLearnMove(c.speciesId, p.moveId),
    );
    changeMaxHp(c, oldMax);
    if (edge.condition.kind === 'item' && edge.condition.consumeItem)
      state.inventory[edge.condition.itemId]! -= 1;
    record(c, 'evolved', `${oldName} → ${SPECIES[c.speciesId]!.name}`);
    if (!state.dex.seen.includes(c.speciesId)) state.dex.seen.push(c.speciesId);
    if (!state.dex.caught.includes(c.speciesId)) state.dex.caught.push(c.speciesId);
    learnAvailable(state, c, 0);
    state.notice = `${oldName}进化成${creatureName(c)}！`;
    return state;
  }
  if (command.kind === 'learn') {
    const pending = state.pending.find(
      (p) =>
        p.kind === 'move' && p.creatureId === command.creatureId && p.moveId === command.moveId,
    );
    if (!pending) return current;
    const c = state.creatures[command.creatureId]!;
    if (!canLearnMove(c.speciesId, command.moveId)) return current;
    if (
      command.replace !== null &&
      (!Number.isInteger(command.replace) ||
        command.replace < 0 ||
        command.replace >= c.moves.length)
    )
      return current;
    if (wouldLoseSurf(state, c.id, command.replace, command.moveId)) {
      state.notice = '请先回到岸上，再替换队伍最后一个冲浪术；也可以放弃本次学习。';
      return state;
    }
    if (command.replace !== null) {
      c.moves[command.replace] = { id: command.moveId, pp: MOVES[command.moveId]!.pp };
      record(c, 'learned', `学会${MOVES[command.moveId]!.name}`);
      state.notice = `${creatureName(c)}学会了${MOVES[command.moveId]!.name}。`;
    } else
      state.notice = `${creatureName(c)}本次未学习${MOVES[command.moveId]!.name}，达到解锁条件后可在精灵中心回忆。`;
    state.pending = state.pending.filter((p) => p !== pending);
    return state;
  }
  if (state.pending.length) return current;
  switch (command.kind) {
    case 'useFieldItem':
      applyFieldItem(state, command.itemId);
      break;
    case 'sell':
      sellItem(state, command.itemId, command.quantity);
      break;
    case 'equip':
      equipItem(state, command.creatureId, command.itemId);
      break;
    case 'walk':
      walk(state, command.direction);
      break;
    case 'interact':
      interact(state);
      break;
    case 'centerHeal':
      if (!atCenter(state)) state.notice = '请到城市精灵中心治疗员身旁恢复伙伴。';
      else {
        healParty(state);
        if (isTownLocation(state.player.map)) state.player.healMap = townForMap(state.player.map)!;
        state.notice = '全队 HP、PP、异常状态已免费恢复。';
      }
      break;
    case 'centerLearn': {
      const c = state.creatures[command.creatureId];
      const reason = centerLearnReason(state, c, command.moveId, command.replace);
      if (reason) {
        state.notice = reason;
        break;
      }
      const slot = { id: command.moveId, pp: MOVES[command.moveId]!.pp };
      if (command.replace === null) c!.moves.push(slot);
      else c!.moves[command.replace] = slot;
      if (fieldSkill(command.moveId)) {
        c!.taughtMoves ??= [];
        if (!c!.taughtMoves.includes(command.moveId)) c!.taughtMoves.push(command.moveId);
      }
      record(c!, 'learned', `精灵中心学会${MOVES[command.moveId]!.name}`);
      state.notice = `${creatureName(c!)}免费学会了${MOVES[command.moveId]!.name}。`;
      break;
    }
    case 'centerForget': {
      const c = state.creatures[command.creatureId];
      if (!atCenter(state)) state.notice = '请到城市精灵中心治疗员身旁遗忘技能。';
      else if (!c || c.moves.length <= 1 || !c.moves.some((m) => m.id === command.moveId))
        state.notice = '至少需要保留一个已掌握技能。';
      else {
        c.moves = c.moves.filter((m) => m.id !== command.moveId);
        state.notice = `${creatureName(c)}遗忘了${MOVES[command.moveId]!.name}，仍可在满足解锁条件时免费重学。`;
      }
      break;
    }
    case 'copyMove':
      copyMove(state, command.sourceId, command.creatureId, command.moveId, command.replace);
      break;
    case 'useItem': {
      const c = state.creatures[command.creatureId];
      if (!c || !(state.inventory[command.itemId]! > 0)) return current;
      let used = false;
      let growth = 0;
      let learning = '';
      if (isSupply(command.itemId)) used = applySupply(c, command.itemId);
      if (command.itemId === 'candy' && c.level < 100) {
        const before = earnedPoints(c);
        const known = new Set(c.moves.map((m) => m.id));
        gainXp(state, c, xpAt(c.level + 1, SPECIES[c.speciesId]!.experienceCurve) - c.experience);
        growth = earnedPoints(c) - before;
        const learned = c.moves.filter((m) => !known.has(m.id));
        const waiting = state.pending.filter((p) => p.kind === 'move' && p.creatureId === c.id);
        learning = `${learned.length ? `学会了${learned.map((m) => MOVES[m.id]!.name).join('、')}。` : ''}${waiting.length ? '有新技能等待选择替换。' : ''}`;
        used = true;
      }
      if (
        command.itemId === 'respec' &&
        isTownLocation(state.player.map) &&
        c.hp === statsFor(c).hp &&
        !c.status &&
        sumStats(ensureTraining(c).allocated) > 0
      ) {
        const oldMax = statsFor(c).hp;
        ensureTraining(c).allocated = emptyStats();
        ensureTraining(c).mode = 'manual';
        changeMaxHp(c, oldMax);
        used = true;
      }
      if (used) {
        state.inventory[command.itemId]! -= 1;
        state.notice = `${creatureName(c)}使用了${ITEMS[command.itemId]!.name}。${growth ? `升到 Lv.${c.level}，获得 ${growth} 能力点${ensureTraining(c).mode === 'auto' ? '，已按推荐自动分配' : '，请到伙伴详情分配'}。${learning}` : command.itemId === 'respec' ? `已返还 ${availablePoints(c)} 能力点，成长记录未重抽。` : ''}`;
      } else
        state.notice =
          command.itemId === 'respec'
            ? '需在城镇对体力全满、无异常且已加点的伙伴使用。重塑药剂已保留。'
            : '现在使用没有效果，道具已保留。';
      break;
    }
    case 'buy':
      buyItem(state, command.itemId, command.quantity);
      break;
    case 'exchange':
      exchangeItem(state, command.offerId, command.quantity);
      break;
    case 'cityQuest':
      transactQuest(state, command.questId, command.action);
      break;
    case 'allocate': {
      const c = state.creatures[command.creatureId];
      if (!c) break;
      const oldMax = statsFor(c).hp;
      if (allocatePoints(c, command.points)) {
        ensureTraining(c).mode = 'manual';
        changeMaxHp(c, oldMax);
        state.notice = `${creatureName(c)}已分配 ${sumStats(command.points)} 能力点，剩余 ${availablePoints(c)} 点。`;
      } else state.notice = '加点无效，请检查剩余能力点与分配数量。';
      break;
    }
    case 'trainingMode': {
      const c = state.creatures[command.creatureId];
      if (!c || !['manual', 'auto'].includes(command.mode)) break;
      const oldMax = statsFor(c).hp;
      ensureTraining(c).mode = command.mode;
      if (command.mode === 'auto' && availablePoints(c))
        allocatePoints(c, recommendedAllocation(c));
      changeMaxHp(c, oldMax);
      state.notice =
        command.mode === 'auto'
          ? `${creatureName(c)}已启用自动培养，现有及后续能力点按推荐方案分配。`
          : `${creatureName(c)}改为手动培养，后续能力点由你分配。`;
      break;
    }
    case 'lead': {
      reorderParty(state, command.creatureId, 0);
      break;
    }
    case 'reorderParty':
      reorderParty(state, command.creatureId, command.toIndex);
      break;
    case 'release': {
      if (
        !isTownLocation(state.player.map) ||
        state.pending.length ||
        !state.box.includes(command.creatureId)
      )
        return current;
      const c = state.creatures[command.creatureId]!;
      if (c.heldItem && (state.inventory[c.heldItem] ?? 0) >= 999) {
        state.notice = '携带道具的口袋已满，请先收回道具再放生。';
        break;
      }
      if (c.heldItem) state.inventory[c.heldItem] = (state.inventory[c.heldItem] ?? 0) + 1;
      state.box = state.box.filter((id) => id !== c.id);
      delete state.creatures[c.id];
      state.notice = `${creatureName(c)}回到保育区。图鉴、任务与冠军名录保留。`;
      break;
    }
    case 'box': {
      const reason = boxTransferReason(state, command.creatureId, command.withdraw);
      if (reason) {
        state.notice = reason;
        break;
      }
      const from = command.withdraw ? state.box : state.party;
      const to = command.withdraw ? state.party : state.box;
      from.splice(from.indexOf(command.creatureId), 1);
      to.push(command.creatureId);
      const name = creatureName(state.creatures[command.creatureId]!);
      state.notice = command.withdraw
        ? `${name}已回到队伍第${to.length}位。`
        : `${name}已送入仓库，可以随时在城镇取回。`;
      break;
    }
    case 'recall': {
      const c = state.creatures[command.creatureId];
      if (
        c &&
        isTownLocation(state.player.map) &&
        (!fieldSkill(command.moveId) || atCenter(state)) &&
        fieldSkillUnlocked(state, command.moveId) &&
        !wouldLoseSurf(state, c.id, command.replace, command.moveId) &&
        (command.replace === null
          ? c.moves.length < 4
          : Number.isSafeInteger(command.replace) &&
            command.replace >= 0 &&
            command.replace < c.moves.length) &&
        recallOptions(c).some((m) => m.moveId === command.moveId) &&
        !c.moves.some((m) => m.id === command.moveId)
      ) {
        const slot = { id: command.moveId, pp: MOVES[command.moveId]!.pp };
        if (command.replace === null) c.moves.push(slot);
        else c.moves[command.replace] = slot;
        record(c, 'learned', `回忆${MOVES[command.moveId]!.name}`);
        state.notice = '技能回忆完成。';
      }
      break;
    }
  }
  return state;
}
export function safeForTransfer(state: GameState | null): boolean {
  return (
    !state ||
    (!state.battle &&
      !state.challenge?.active &&
      !state.activities?.active &&
      !state.world?.trainerChallenge &&
      !state.dialogue &&
      !state.progress.flags.starterChoice &&
      state.pending.length === 0)
  );
}
export function safePosition(
  map: MapId,
  x: number,
  y: number,
  flags: Record<string, boolean>,
): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && terrainPassable(map, x, y, flags);
}
export function reduceGame(current: GameState, command: Command): GameState {
  const next = reduceCommand(current, command);
  if (next !== current) {
    syncWeather(next);
    rememberRecoveryTowns(next);
    const full = Object.keys(next.inventory).filter(
      (id) => id !== 'master_ball' && next.inventory[id]! > 999,
    );
    for (const id of full) next.inventory[id] = 999;
    if (full.length)
      next.notice += ` ${full.map((id) => ITEMS[id]!.name).join('、')}已达携带上限，多余数量未放入背包。`;
  }
  return presentCompleteJourney(next);
}
