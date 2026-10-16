import { writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { ALL_SPECIES, CONTENT_VERSION, learnset, MOVES } from '../src/content/catalog';
import {
  COMBAT_STAGE_NAMES,
  CRITICAL_MULTIPLIER,
  CRITICAL_RATES,
  MAX_SPEED_ACTIONS,
  stageLimit,
} from '../src/game/combat';
import { CombatStage } from '../src/game/model';

async function main() {
  const path = 'docs/战斗规则/战斗规则.json';
  const skills = ['focus', 'aim', 'agility', 'shadow_step', 'steady', 'keen_strike'];
  const data = {
    contentVersion: CONTENT_VERSION,
    speed: {
      maxActions: MAX_SPEED_ACTIONS,
      thresholds: [
        { ratio: 1, actions: 1 },
        { ratio: 2, actions: 2 },
        { ratio: 3, actions: 3 },
      ],
      order:
        '先比较招式优先度，再比较有效速度；相同时按存档 RNG 决定。先手方连续完成自己的技能额度，再由另一方行动。',
      effectiveSpeed:
        '六维速度 × 速度能力等级倍率 × 天气速度倍率，麻痹再减半；天气规则见 world-rules.json。',
      quota: '在换人或用药之后、技能执行之前锁定本轮双方额度；本轮技能的速度变化从下一轮生效。',
      repeatedSkill:
        '重复本回合选定的技能，每次独立扣 PP、判命中、要害和附加效果。PP 不足停止，不改用其他招式。',
      stop: '任一原出战精灵倒下便终止双方未执行的攻击；新上场精灵不承接旧目标的剩余攻击。',
      otherActions:
        '用药、换人、投球和逃跑不重复；未结束战斗时，对手按自身速度额度回应。倒下补位免费。',
      status: '睡眠倒计时和麻痹失去行动判定每轮一次，毒与灼伤在轮末各结算一次。',
    },
    hiddenStages: (['accuracy', 'evasion', 'critical', 'criticalGuard'] as CombatStage[]).map(
      (id) => ({
        id,
        name: COMBAT_STAGE_NAMES[id],
        initial: 0,
        min: -stageLimit(id),
        max: stageLimit(id),
      }),
    ),
    accuracy:
      '取命中等级减闪避等级，限制在 -6～6；非负倍率 (3+等级)/3，负倍率 3/(3-等级)，与招式基础命中和天气倍率相乘并限制在 0～100%。自身强化必定生效。',
    critical: {
      rates: CRITICAL_RATES.map((chance, stage) => ({ stage, chance })),
      moveBonus: '招式自带要害等级加到进攻方要害等级中，上限 3；负等级按基础概率逐级减半。',
      guard: '防守方抗要害每级使概率减半，最终限制在 0～100%。',
      damageMultiplier: CRITICAL_MULTIPLIER,
      rounding:
        '按原技能、属性、能力与浮动结算普通伤害并取整，再精确翻倍；免疫仍为 0，治疗和异常扣血不翻倍。',
    },
    persistence:
      '新隐藏阶段为兼容可选字段，旧档缺省为零；换人和新战斗重置，战斗中存档保留。新招式可自然学习、免费回忆及通用复刻。',
    newSkills: skills.map((id) => MOVES[id]),
    species: ALL_SPECIES.map((s) => ({
      speciesId: s.id,
      name: s.name,
      newLearnset: learnset(s.id).filter((m) => skills.includes(m.moveId)),
    })),
  };
  writeFileSync(
    path,
    await format(JSON.stringify(data), { ...(await resolveConfig(path)), filepath: path }),
  );
  console.log(
    `导出速度／隐藏属性规则、${skills.length} 个新技能与 ${ALL_SPECIES.length} 种精灵的学招。`,
  );
}
void main();
