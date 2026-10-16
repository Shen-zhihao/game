import { Npc } from '../../content/world';
import { GameState, StoryEvent } from '../model';
import { hasFieldAccess } from '../../content/keyItems';

type Narrate = (speaker: string, lines: string[], after?: StoryEvent | null) => void;
export function interactHighlands(game: GameState, npc: Npc, talk: Narrate): boolean {
  const f = game.progress.flags;
  const say = (lines: string[], after?: StoryEvent) => talk(npc.name, lines, after);
  const reward = (item: string, quantity: number) => {
    game.inventory[item] = Math.min(999, (game.inventory[item] ?? 0) + quantity);
  };
  switch (npc.id) {
    case 'habitat':
      if (!f.catchTutorial) say(['先学会捕捉，再来记录这片栖地的变化。']);
      else if (f.habitatClean) say(['石壳虫正把干叶搬回巢里。你清理的栖地仍然安全。']);
      else {
        f.habitatClean = true;
        reward('ball', 3);
        say([
          '你收走缠在石壳虫巢穴旁的绳线，把散落石片堆到步道外。没有惊动或带走任何精灵。',
          '石壳虫重新回到巢边。巡路员留下星纹球 ×3；「石壳虫的新家」已记入日志。',
        ]);
      }
      return true;
    case 'miningPlaque':
      if (!f.catchTutorial) say(['旧矿车旁压着一块工牌。先完成捕捉练习，再开始山城调查。']);
      else if (f.miningPlaque) say(['你已记下工号十七。石脊城的退休矿工也许认得它。']);
      else {
        f.miningPlaque = true;
        say([
          '旧牌刻着「十七 · 砾伯」。背面写着：归路有钟，同行无失。',
          '你把工牌收好，准备交给石脊城的退休矿工砾伯。',
        ]);
      }
      return true;
    case 'retiredMiner':
      if (!f.miningPlaque)
        say([
          '以前下矿时，我总带着十七号工牌。回家前会听一遍北侧钟石的声音，提醒同行的人平安出井。',
          '工牌不见后，那块钟石还在等我。你去旧矿山时，能替我看看矿车旁吗？',
        ]);
      else if (!f.plaqueReturned) {
        f.plaqueReturned = true;
        reward('potion', 2);
        say([
          '没错，这是我的旧工牌！原来一直留在矿车旁。谢谢你把它带回来。获得草露药 ×2。',
          '钟石不是普通岩块，是曾陪我们下矿的鸣钟石。我会托你把工牌拓印带给它，让它知道我已平安退休。',
          '到矿山北侧的回声钟石前回应它吧。它愿意同行时，可以用星纹球邀请它。',
        ]);
      } else
        say([
          f.bellCaught
            ? '鸣钟石选中了你，旧约终于有了新的同行者。好好照顾它！'
            : '把旧工牌的拓印带到矿山北侧，鸣钟石会听懂这份平安的消息。',
        ]);
      return true;
    case 'bellStone':
      if (f.bellCaught) say(['钟声已记住你的脚步。鸣钟石正和你一起走向新的旅程。']);
      else if (!f.plaqueReturned)
        say(['钟石里传出悠长回声，像在等待一位旧友。先寻找矿车旁的工牌，再回城问问砾伯。']);
      else
        say(
          [
            '你把十七号工牌的拓印放在钟石前，轻声说：砾伯已经平安归家。',
            '石缝亮起幽蓝光芒。鸣钟石终于放下等待，愿意试着与你同行。',
            '降低体力后使用星纹球。这次没能捕获，可以再次带着拓印来回应它。',
          ],
          'bellEncounter',
        );
      return true;
    case 'mineForeman':
      if (!f.questReward)
        say([
          '欢迎来到石脊城！道馆就在北面，随时可完成本馆练习。',
          '矿里的晶矿最近一直共鸣。听说苔丘镇的穗禾也在调查类似异常；帮她完成森林调查并报告后，再来找我一起查清原因。',
        ]);
      else if (!f.mineQuest) {
        f.mineQuest = true;
        say([
          '穗禾送来的森林样本与这里的晶矿完全同频。矿山异动不是自然形成的，有人在放大共振。',
          '先调查旧矿山的采掘痕迹和东侧异常晶矿，再去北部控制台核实。环形矿道始终畅通，不需要任何徽章或碎岩工具。',
        ]);
      } else if (f.mineStabilized && !f.mineReport) {
        f.mineReport = true;
        game.player.money = Math.min(9999999, game.player.money + 600);
        reward('candy', 2);
        reward('ball', 5);
        say([
          '控制台的记录说明：定序社用同频晶矿让不同矿脉一起共振。外运的异常晶矿干扰了邻近精灵，一号路绒团鼠的躁动也有了原因。',
          '你关闭了放大装置，矿区已经安全。获得旅费 600、成长果 ×2、星纹球 ×5。',
          '货运记录指向潮汐港。从城东的三号矿港道出发，找港务员沐舟核对箱号；道馆挑战和矿山回访都可自行安排。',
        ]);
      } else
        say([
          f.mineReport
            ? '装置已经停机，矿脉逐渐恢复。城东的三号矿港道通往潮汐港，港务员沐舟等着核对货物去向；北侧道馆也随时接受挑战。'
            : '采掘痕迹在矿山西北角，异常晶矿在东侧。调查后击退勘测员，再关闭北侧共鸣控制台。',
        ]);
      return true;
    case 'mineClueOne':
    case 'mineClueTwo':
      if (!f.mineQuest) say(['异常仍在继续。先回城找矿长了解情况；他需要穗禾的森林调查结果。']);
      else {
        f[npc.id] = true;
        say([
          npc.id === 'mineClueOne'
            ? '采掘工具留下整齐的新刻痕，间隔与森林晶矿阵列完全一致。你记录了人工采样的证据。'
            : '晶矿每隔三次震动，就会回应北面的控制台。矿脉本身稳定，是外部装置在放大共鸣。线索已记录。',
        ]);
      }
      return true;
    case 'mineGuard':
      if (!f.mineQuest || !f.mineClueOne || !f.mineClueTwo) {
        say(['这里在做共鸣采样，别乱动控制台。先调查两处矿脉，弄清发生了什么。']);
        return true;
      }
      return false;
    case 'mineRegulator':
      if (f.mineStabilized)
        say(['放大装置已关闭，指针保持平稳。回石脊城向矿长报告，记录这次调查。']);
      else if (!f.mineGuard || !f.mineClueOne || !f.mineClueTwo)
        say(['控制台仍在放大矿脉回声。先取得两处证据，并击退守在北部的勘测员。']);
      else {
        f.mineStabilized = true;
        say([
          '你按采样记录逐个切断共鸣回路，最后将主调节杆归零。轰鸣声停下，晶矿恢复了自然的微光。',
          '货运单上留着潮汐港的编号。把调查结果带回石脊城，交给矿长核对。',
        ]);
      }
      return true;
  }
  if (npc.role === 'rock') {
    if (!hasFieldAccess(game, 'rockBreaker'))
      say([
        '这块岩石只挡住一条捷径。绕行南北通路即可到达目的地；取得砾岩徽章的碎岩工具后，可以回来清理。',
      ]);
    else {
      f[npc.id] = true;
      say(['你用碎岩工具沿裂隙敲开岩块，把碎片移到路旁。捷径已经畅通。']);
    }
    return true;
  }
  return false;
}
