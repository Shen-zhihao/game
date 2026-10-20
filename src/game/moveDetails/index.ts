import { MOVES } from '../../content/catalog';
import { chanceLabel, COMBAT_STAGE_NAMES, criticalChance, stageEffectLabel } from '../combat';
import { WEATHER } from '../environment';
import { WeatherId } from '../model';
import { statusName } from '../statusLabels';

export function battleMoveDetails(moveId: string, weather: WeatherId = 'clear') {
  const move = MOVES[moveId]!;
  const effects: string[] = [];
  const effect = move.effect;
  if (effect?.hits)
    effects.push(
      `${effect.hits === '2-5' ? '随机2～5击' : '连续2击'}，威力按每击计算；命中判定与PP各一次，倒下即停止`,
    );
  if (effect?.recoil)
    effects.push(`结束后反冲实际总伤害的${chanceLabel(effect.recoil)}（至少1点，不计过量伤害）`);
  if (effect?.hazard === 'rocks')
    effects.push('在对方场地布置隐形岩；换入扣除1/8最大HP×岩石相性，不可叠加');
  if (effect?.hazard === 'spikes')
    effects.push('对方场地叠加地刺，最多3层；接地者换入损失1/8、1/6、1/4最大HP');
  if (effect?.clearHazards) effects.push('清除己方隐形岩与全部地刺，不清除对方陷阱');
  if (effect?.protect)
    effects.push(
      '本轮首次行动可用，消耗整轮行动；挡下本轮所有对手招式，不挡持续伤害；连续轮使用成功率降为1/3、1/9…',
    );
  if (effect?.seed)
    effects.push(
      '草属性免疫；每轮结束吸取目标1/8最大HP，按实际扣血治疗施术方当前在场伙伴；目标换下解除',
    );
  if (effect?.drain)
    effects.push(
      `按实际造成伤害的${chanceLabel(effect.drain)}恢复自身HP（向下取整，伤害大于0时至少1点）`,
    );
  if (effect?.heal) {
    const amount =
      moveId === 'recover'
        ? weather === 'sun'
          ? '2/3'
          : ['rain', 'storm', 'sand', 'snow'].includes(weather)
            ? '25%'
            : chanceLabel(effect.heal)
        : chanceLabel(effect.heal);
    effects.push(`恢复自身 ${amount} 最大HP`);
  }
  if (effect?.stage) {
    const amount = effect.amount ?? 0;
    effects.push(
      `${effect.target === 'self' ? '自身' : '对方'}${COMBAT_STAGE_NAMES[effect.stage]} ${amount > 0 ? '+' : ''}${amount}级`,
    );
  }
  if (effect?.status)
    effects.push(`${chanceLabel(effect.chance ?? 1)}使对方${statusName(effect.status)}`);
  if (effect?.confusion) effects.push(`${chanceLabel(effect.chance ?? 1)}使对方混乱`);
  if (move.type === 'fire' && move.power > 0) effects.push('自行解冻；造成伤害使目标解冻');
  if (move.weather) effects.push(`${WEATHER[move.weather].name}持续5轮`);
  if (move.criticalStage) effects.push('更容易命中要害');
  if (move.priority) effects.push(`行动优先度 ${move.priority > 0 ? '+' : ''}${move.priority}`);
  if (moveId === 'struggle') effects.push('自身损失1/4最大HP');
  return {
    category: move.category === 'physical' ? '物攻' : move.category === 'special' ? '特攻' : '变化',
    effect: effects.join('；') || '无附加效果',
  };
}

export function moveEffectLines(moveId: string): string[] {
  const move = MOVES[moveId]!;
  const lines: string[] = [];
  if (move.power > 0)
    lines.push(
      move.category === 'physical'
        ? '物理伤害：自身攻击对抗对手防御，实际伤害受属性克制等影响。'
        : '特殊伤害：自身特攻对抗对手特防，实际伤害受属性克制等影响。',
    );
  else lines.push('不造成直接伤害。');
  if (move.effect?.hits)
    lines.push(
      `威力为每一击的威力。${move.effect.hits === '2-5' ? '2、3、4、5击的概率依次为35%、35%、15%、15%。' : '命中后连续攻击两次。'}整次出招仅消耗1PP且只判定一次命中，每击独立计算伤害与要害；目标或自身倒下时立即停止，不会打到下一只替补。`,
      '一招多击仍只消耗一次行动，与速度优势带来的一轮多次行动不同；每击之间会处理触发的携带道具和吸取。',
    );
  if (move.effect?.recoil)
    lines.push(
      `全部攻击结束后，反冲实际扣除对手HP总量的 ${chanceLabel(move.effect.recoil)}（向下取整，有伤害时至少1点）。不计过量伤害；未命中、免疫或被守住挡下时不反冲，反冲可能使自己倒下。`,
    );
  if (move.id === 'struggle')
    lines.push('奋力一搏仍固定损失自身最大HP的1/4，不使用普通招式的实际伤害反冲比例。');
  if (move.effect?.hazard)
    lines.push(
      '针对对方场地，守住、属性免疫、命中与闪避等级均不影响布置；对当前在场精灵不立即造成伤害。主动换人和倒下后的替补上场均触发，读档不重复触发，结束战斗后不保留。',
    );
  if (move.effect?.hazard === 'rocks')
    lines.push(
      '隐形岩只能布置一次，所有换入者（包括飞行与轻浮）损失最大HP的1/8乘以岩石属性相性，向下取整且至少1点。',
    );
  if (move.effect?.hazard === 'spikes')
    lines.push(
      '地刺最多三层，分别造成最大HP的1/8、1/6、1/4伤害，向下取整且至少1点；飞行属性或免疫地面的轻浮特性不会受到地刺伤害。',
    );
  if (move.effect?.clearHazards)
    lines.push(
      '只清除己方的隐形岩及所有地刺，不影响对方场地、天气、寄生或能力等级；不受守住或属性免疫影响。',
    );
  if (move.effect?.protect)
    lines.push(
      '仅能在己方本轮第一次行动选择。无论成功、失败或无法行动，均消耗本轮全部行动，不能先攻击再守住；成功后持续到本轮结束，抵挡所有对手针对自身的伤害与变化招式，不妨碍对手自我强化、恢复或改变天气。',
      '不能阻挡中毒、灼伤、天气、混乱自伤、场地陷阱或已经生效的寄生种子。连续轮尝试的成功率依次为100%、1/3、1/9…，最低1/729；间隔一轮或换下后重置。',
    );
  if (move.effect?.seed)
    lines.push(
      '草属性精灵免疫，已寄生时不能重复播种，守住可以挡下播种。每轮结束在异常与天气伤害后，扣除目标最大HP的1/8（向下取整，至少1点），按实际扣除量回复施术方当前在场且存活的伙伴，回复不超过最大HP。',
      '目标换下、倒下或战斗结束时解除；施术者换下不解除，后来上场的伙伴也可接收治疗。寄生不属于可用解毒药或清醒果解除的异常状态。',
    );
  if (move.effect?.drain)
    lines.push(
      `恢复实际扣除对手HP的 ${chanceLabel(move.effect.drain)}（向下取整，有伤害时至少1点），不超过自身最大HP。超过对手剩余HP或被岩心避免的伤害不计入吸取；未命中、免疫或被守住挡下时不回血。`,
    );
  if (move.effect?.heal)
    lines.push(
      `恢复自身最大体力的 ${Math.round(move.effect.heal * 100)}%${move.id === 'recover' ? '（晴天 2/3，雨天、雷暴、沙暴或冰雹 1/4）' : ''}。`,
    );
  if (move.effect?.status)
    lines.push(
      `${chanceLabel(move.effect.chance ?? 1)} 概率使对手${statusName(move.effect.status)}。`,
    );
  if (move.effect?.status === 'freeze')
    lines.push(
      '冰冻时除伤害类火属性技能外无法出招，每轮有一次 20% 的自然解冻机会；使用伤害类火属性技能，或受到火属性技能伤害也会解冻。冰属性精灵免疫冰冻，晴天不会新增冰冻。',
    );
  if (move.effect?.confusion)
    lines.push(
      `${chanceLabel(move.effect.chance ?? 1)} 概率使对手混乱，可与其他异常并存。持续 2–5 个可行动回合，每回合仅判定一次，1/3 概率自伤并取消本轮技能行动；因睡眠、冰冻或麻痹无法行动时不扣持续回合。换下、战斗结束或清除全部异常时解除。`,
    );
  if (move.type === 'fire' && move.power > 0)
    lines.push('自身冰冻时可使用此技能并解冻；命中造成伤害也会使冰冻的目标解冻。');
  const stage = stageEffectLabel(moveId);
  if (stage) lines.push(stage);
  if (move.weather)
    lines.push(
      `变为${WEATHER[move.weather].name}，持续五轮（含本轮）。${WEATHER[move.weather].battle}`,
    );
  if (move.criticalStage)
    lines.push(`高要害技能：无增益时要害率 ${chanceLabel(criticalChance(moveId))}，要害伤害 ×2。`);
  if (move.priority) lines.push(`行动优先度 ${move.priority > 0 ? '+' : ''}${move.priority}。`);
  if (
    !move.effect &&
    !move.weather &&
    !move.criticalStage &&
    !move.priority &&
    !(move.type === 'fire' && move.power > 0)
  )
    lines.push('无额外附加效果。');
  return lines;
}
