import { MOVES } from '../../content/catalog';
import { chanceLabel, COMBAT_STAGE_NAMES, criticalChance, stageEffectLabel } from '../combat';
import { WEATHER } from '../environment';
import { WeatherId } from '../model';
import { statusName } from '../statusLabels';

export function battleMoveDetails(moveId: string, weather: WeatherId = 'clear') {
  const move = MOVES[moveId]!;
  const effects: string[] = [];
  const effect = move.effect;
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
  if (move.effect?.protect)
    lines.push(
      '仅能在己方本轮第一次行动选择。无论成功、失败或无法行动，均消耗本轮全部行动，不能先攻击再守住；成功后持续到本轮结束，抵挡所有对手针对自身的伤害与变化招式，不妨碍对手自我强化、恢复或改变天气。',
      '不能阻挡中毒、灼伤、天气、混乱自伤或已经生效的寄生种子。连续轮尝试的成功率依次为100%、1/3、1/9…，最低1/729；间隔一轮或换下后重置。',
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
