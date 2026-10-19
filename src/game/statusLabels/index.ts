import type { Status } from '../model';

export const STATUS_NAMES: Record<Status, string> = {
  poison: '中毒',
  burn: '灼伤',
  paralysis: '麻痹',
  sleep: '睡眠',
  freeze: '冰冻',
};

export function statusName(status: string | null | undefined): string {
  if (!status) return '';
  return Object.hasOwn(STATUS_NAMES, status) ? STATUS_NAMES[status as Status] : '异常';
}

/** Confusion is volatile and must remain visible alongside a major status. */
export function conditionLabels(creature: {
  status?: string | null;
  confusionTurns?: number;
}): string[] {
  const labels = creature.status ? [statusName(creature.status)] : [];
  if ((creature.confusionTurns ?? 0) > 0) labels.push('混乱');
  return labels;
}
