import type { GameState } from '../../game/model';

export const KEY_ITEMS = [
  {
    id: 'key_vine_cut',
    code: '501',
    flag: 'vineCut',
    name: '剪藤工具',
    description: '枝叶馆的耐用探索工具，记入重要物品，不消耗。',
  },
  {
    id: 'key_rock_breaker',
    code: '502',
    flag: 'rockBreaker',
    name: '碎岩工具',
    description: '砾岩馆的耐用探索工具，不代替调查或馆内考验。',
  },
  {
    id: 'key_water_rig',
    code: '503',
    flag: 'waterRig',
    name: '渡水装备',
    description: '携带后可在普通水面渡水，无需占用伙伴技能位；不会授予潮汐徽章。',
  },
  {
    id: 'key_power_pass',
    code: '504',
    flag: 'powerPass',
    name: '检修电梯通行证',
    description: '开启保育林检修电梯捷径，不代替能源站调查。',
  },
  {
    id: 'key_glider',
    code: '505',
    flag: 'glider',
    name: '滑翔装备',
    description: '开启回声原野滑翔捷径，普通步道始终可走。',
  },
  {
    id: 'key_heat_suit',
    code: '506',
    flag: 'heatSuit',
    name: '隔热装备',
    description: '开启回声深矿隔热矿车捷径，不允许踏入熔岩。',
  },
  {
    id: 'key_ruin_key',
    code: '507',
    flag: 'ruinKey',
    name: '遗迹通行钥匙',
    description: '开启回潮海藻湾旧廊捷径，不改写档案和古庙故事。',
  },
  {
    id: 'key_coordination_manual',
    code: '508',
    flag: 'coordinationManual',
    name: '协同训练手册',
    description: '可向保育林教练交流技能复刻心得；不会授予徽章或能力点。',
  },
  {
    id: 'key_return_calibrator',
    code: '509',
    flag: 'returnFlowCalibrator',
    name: '双向归流校准件',
    description: '主线设备的重要部件，永久保留。使用对应设备仍需完成其调查前置。',
  },
] as const;
export const keyItemFor = (id: string) => KEY_ITEMS.find((item) => item.id === id);
/** Tool access can come from its earned story flag or a physical key item. No story flags are forged. */
export function hasFieldAccess(game: GameState, flag: string): boolean {
  return (
    !!game.progress.flags[flag] ||
    KEY_ITEMS.some((i) => i.flag === flag && (game.inventory[i.id] ?? 0) > 0)
  );
}
export function effectiveAccessFlags(game: GameState): Record<string, boolean> {
  const held = KEY_ITEMS.filter((i) => (game.inventory[i.id] ?? 0) > 0);
  return held.length
    ? { ...game.progress.flags, ...Object.fromEntries(held.map((i) => [i.flag, true])) }
    : game.progress.flags;
}
/** Old saves earned tools as flags; show them in the same key-item pocket without migrating progress. */
export function bagInventory(game: GameState): Record<string, number> {
  return {
    ...game.inventory,
    ...Object.fromEntries(
      KEY_ITEMS.filter((i) => hasFieldAccess(game, i.flag)).map((i) => [i.id, 1]),
    ),
  };
}
