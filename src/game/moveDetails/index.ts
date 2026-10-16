import { MOVES } from '../../content/catalog';
import { chanceLabel, criticalChance, stageEffectLabel } from '../combat';
import { WEATHER } from '../environment';

const STATUS_NAMES = { poison: '中毒', burn: '灼伤', paralysis: '麻痹', sleep: '睡眠' };

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
  if (move.effect?.heal)
    lines.push(
      `恢复自身最大体力的 ${Math.round(move.effect.heal * 100)}%${move.id === 'recover' ? '（晴天 2/3，雨天、雷暴、沙暴或冰雹 1/4）' : ''}。`,
    );
  if (move.effect?.status)
    lines.push(
      `${chanceLabel(move.effect.chance ?? 1)} 概率使对手${STATUS_NAMES[move.effect.status]}。`,
    );
  const stage = stageEffectLabel(moveId);
  if (stage) lines.push(stage);
  if (move.weather)
    lines.push(
      `变为${WEATHER[move.weather].name}，持续五轮（含本轮）。${WEATHER[move.weather].battle}`,
    );
  if (move.criticalStage)
    lines.push(`高要害技能：无增益时要害率 ${chanceLabel(criticalChance(moveId))}，要害伤害 ×2。`);
  if (move.priority) lines.push(`行动优先度 ${move.priority > 0 ? '+' : ''}${move.priority}。`);
  if (!move.effect && !move.weather && !move.criticalStage && !move.priority)
    lines.push('无额外附加效果。');
  return lines;
}
