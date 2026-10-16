import { TYPE_IDS } from '../catalog';
import type { TypeId } from '../../game/model';
import { typeMultiplier } from '../../game/rules';

/** Deployment constraints apply to species assignments, without clamping the battle formula. */
export const TYPING_BALANCE_POLICY = {
  minimumWeaknesses: 1,
  minimumResistancesOrImmunities: 1,
  maxAssignedIncomingMultiplier: 4,
  requireEachTypeBenefit: true,
} as const;

export function analyzeTyping(types: readonly TypeId[]) {
  const unique = [...new Set(types)];
  const incoming = TYPE_IDS.map((type) => ({ type, multiplier: typeMultiplier(type, unique) }));
  const weaknesses = incoming.filter((entry) => entry.multiplier > 1);
  const resistances = incoming.filter((entry) => entry.multiplier < 1);
  const benefits = unique.map((type) => {
    const others = unique.filter((entry) => entry !== type);
    return {
      type,
      defensive: incoming
        .filter((entry) => entry.multiplier < typeMultiplier(entry.type, others))
        .map((entry) => entry.type),
      offensive: TYPE_IDS.filter(
        (target) =>
          typeMultiplier(type, [target]) >
          Math.max(1, ...others.map((attack) => typeMultiplier(attack, [target]))),
      ),
    };
  });
  const issues: string[] = [];
  if (!unique.length || unique.length !== types.length) issues.push('属性为空或重复');
  if (!weaknesses.length) issues.push('没有可被克制的属性弱点');
  if (!resistances.length) issues.push('没有抗性或免疫收益');
  if (
    incoming.some((entry) => entry.multiplier > TYPING_BALANCE_POLICY.maxAssignedIncomingMultiplier)
  )
    issues.push('弱点叠乘超过4倍');
  for (const benefit of benefits)
    if (!benefit.defensive.length && !benefit.offensive.length)
      issues.push(`${benefit.type}只增加负担，没有防御改善或额外攻击覆盖`);
  return { types: unique, weaknesses, resistances, incoming, benefits, issues };
}
