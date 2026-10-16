import { describe, expect, it } from 'vitest';
import plan from '../docs/data/campaign-plan.json';
import { ITEMS, SPECIES, TYPE_IDS } from '../src/content/catalog';

describe('八徽章主线设计的前置与回收', () => {
  it('每馆只依赖入门和本馆练习，联盟验证八枚不同徽章', () => {
    const byId = new Map(plan.milestones.map((n) => [n.id, n]));
    const ancestors = (id: string): string[] =>
      byId.get(id)!.requires.flatMap((p) => [p, ...ancestors(p)]);
    for (const gym of plan.gyms) {
      const before = ancestors(gym.milestone);
      expect(before).toContain(gym.practiceMilestone);
      expect(before.filter((id) => id.startsWith('badge'))).toEqual([]);
      expect(before).not.toContain('forestRescue');
      expect(before).not.toContain('coreStabilized');
      expect(gym.requiredOtherBadges).toEqual([]);
      expect(gym.approachRequiresTool).toBeNull();
    }
    expect(new Set(byId.get('league')!.requires)).toEqual(
      new Set(plan.gyms.map((g) => g.milestone)),
    );
    expect(plan.gymPolicy.order).toBe('free');
  });
  it('主线与24支线的前置无环，主线不依赖支线或神兽捕获', () => {
    const nodes = [...plan.milestones, ...plan.sidequests];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    expect(byId.size).toBe(nodes.length);
    expect(plan.sidequests).toHaveLength(24);
    const visit = (id: string, ancestors: Set<string>): void => {
      expect(byId.has(id), `Missing prerequisite ${id}`).toBe(true);
      expect(ancestors.has(id), `Cycle at ${id}`).toBe(false);
      const next = new Set(ancestors).add(id);
      for (const parent of byId.get(id)!.requires) visit(parent, next);
    };
    for (const node of nodes) visit(node.id, new Set());
    const mainIds = new Set(plan.milestones.map((n) => n.id));
    for (const node of plan.milestones) {
      expect(node.requires.every((id) => mainIds.has(id))).toBe(true);
      expect(node.requires.every((id) => !id.startsWith('captureLegendary'))).toBe(true);
    }
    expect(plan.league.requiredBadges).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(plan.league.requiredLegendaryCaptures).toEqual([]);
    expect(plan.league.requiredSidequests).toEqual([]);
    for (const quest of plan.sidequests) expect(ITEMS[quest.rewardItem]).toBeDefined();
  });

  it('八馆不要求自己奖励的工具；伏笔均在后续主线回收，传说种族和前置存在', () => {
    expect(plan.gyms.map((g) => g.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(plan.gyms.map((g) => g.badge)).size).toBe(8);
    expect(new Set(plan.gyms.map((g) => g.toolId)).size).toBe(8);
    const tools: string[] = [];
    for (const gym of plan.gyms) {
      if (gym.type) expect(TYPE_IDS).toContain(gym.type);
      if (gym.approachRequiresTool) expect(tools).toContain(gym.approachRequiresTool);
      expect(gym.approachRequiresTool).not.toBe(gym.toolId);
      tools.push(gym.toolId);
    }
    const ids = [...plan.milestones, ...plan.sidequests].map((n) => n.id);
    for (const hook of plan.foreshadows) {
      expect(plan.milestones.some((n) => n.id === hook.seed)).toBe(true);
      expect(plan.milestones.some((n) => n.id === hook.payoff)).toBe(true);
      expect(ids.indexOf(hook.payoff)).toBeGreaterThan(ids.indexOf(hook.seed));
      expect(hook.answer.length).toBeGreaterThan(10);
    }
    for (const legend of plan.legendary) {
      expect(SPECIES[legend.speciesId]?.name).toBe(legend.name);
      expect(legend.captureRequires.every((id) => ids.includes(id))).toBe(true);
      expect(legend.captureRequiredForMain).toBe(false);
      expect(legend.missedEncounter.length).toBeGreaterThan(10);
    }
    for (const key of plan.mainItems) {
      expect(ids.indexOf(key.obtainedAt)).toBeLessThan(ids.indexOf(key.usedAt));
      expect(key.canSell || key.canDiscard || key.consumed).toBe(false);
    }
  });
});
