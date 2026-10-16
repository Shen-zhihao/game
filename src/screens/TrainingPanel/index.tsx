import React, { useState } from 'react';
import { View } from 'react-native';
import { learnset, MOVES } from '../../content/catalog';
import { POTENTIAL_NAMES, STAT_NAMES, TRAINING_PLANS } from '../../content/training';
import { Button, Label, palette, Panel, styles } from '../../components/ui';
import { Command, Creature, GameState, STAT_KEYS } from '../../game/model';
import {
  availablePoints,
  earnedPoints,
  emptyStats,
  recommendedAllocation,
  sumStats,
  trainingFor,
} from '../../game/growth';
import { statsFor } from '../../game/rules';

export function TrainingPlanView({ speciesId }: { speciesId: string }) {
  const plan = TRAINING_PLANS[speciesId]!;
  return (
    <Panel style={{ padding: 12, gap: 8, alignSelf: 'stretch' }}>
      <Label style={{ color: palette.gold, fontWeight: '800' }}>推荐方案 · {plan.role}</Label>
      <Label muted style={{ fontSize: 12 }}>
        {plan.strategy}
      </Label>
      <View style={[styles.wrap, { gap: 7 }]}>
        {STAT_KEYS.filter((k) => plan.weights[k] > 0).map((k) => (
          <Label key={k} style={{ fontSize: 12 }}>
            每 10 点：{STAT_NAMES[k]} +{plan.weights[k]}
          </Label>
        ))}
      </View>
      <Label muted style={{ fontSize: 12 }}>
        目标配招：{plan.moves.map((m) => `${MOVES[m.moveId]!.name}（Lv.${m.level}）`).join('／')}
      </Label>
      <Label muted style={{ fontSize: 12 }}>
        {plan.caution}
      </Label>
      <Label muted style={{ fontSize: 12 }}>
        {plan.evolution}
      </Label>
    </Panel>
  );
}
export function TrainingPanel({
  c,
  game,
  dispatch,
}: {
  c: Creature;
  game: GameState;
  dispatch: (command: Command) => void;
}) {
  const t = trainingFor(c);
  const available = availablePoints(c);
  const fingerprint = `${c.id}:${c.level}:${t.mode}:${STAT_KEYS.map((k) => t.allocated[k]).join(',')}`;
  const [staged, setStaged] = useState({ fingerprint: '', points: emptyStats() });
  const draft = staged.fingerprint === fingerprint ? staged.points : emptyStats();
  const total = sumStats(draft);
  const stats = statsFor(c);
  const plan = TRAINING_PLANS[c.speciesId]!;
  const update = (key: (typeof STAT_KEYS)[number], amount: number) =>
    setStaged({
      fingerprint,
      points: {
        ...draft,
        [key]: Math.max(0, Math.min(draft[key] + amount, draft[key] + available - total)),
      },
    });
  const futureMoves = learnset(c.speciesId).filter((m) => m.level > c.level);
  const nextLevel = futureMoves[0]?.level;
  return (
    <Panel style={{ padding: 12, gap: 8 }}>
      <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
        <Label style={{ fontSize: 19, fontWeight: '800', color: palette.gold }}>
          培养 · Lv.{c.level}/100
        </Label>
        <View testID="training-points">
          <Label style={{ color: palette.gold, fontWeight: '800' }}>待分配 {available} 点</Label>
        </View>
      </View>
      <Label muted style={{ fontSize: 12 }}>
        每次升级随机获得 1–10 点，强度越高越容易获得高点数。1 点 = 对应能力 +1。已分配{' '}
        {sumStats(t.allocated)} / 累计 {earnedPoints(c)} 点。
      </Label>
      <View style={[styles.wrap, { gap: 7 }]}>
        <Button
          small
          selected={t.mode === 'manual'}
          accent={t.mode === 'manual'}
          testID="training-manual"
          onPress={() => dispatch({ kind: 'trainingMode', creatureId: c.id, mode: 'manual' })}
        >
          手动培养
        </Button>
        <Button
          small
          selected={t.mode === 'auto'}
          accent={t.mode === 'auto'}
          testID="training-auto"
          onPress={() => dispatch({ kind: 'trainingMode', creatureId: c.id, mode: 'auto' })}
        >
          自动按方案
        </Button>
      </View>
      <Label muted style={{ fontSize: 11 }}>
        {t.mode === 'auto'
          ? '升级后自动按当前形态的方案加点。切换回手动可保留以后的点数。'
          : '点击 +1、+5 或全加，仅未确认的预览可以撤回。自动培养会立即分配现有点数。'}
      </Label>
      {STAT_KEYS.map((key) => (
        <View
          key={key}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}
        >
          <View style={{ flexGrow: 1, minWidth: 110 }} testID={`training-stat-${key}`}>
            <Label style={{ fontWeight: '700' }}>
              {STAT_NAMES[key]}　{stats[key]}
              {draft[key] ? ` → ${stats[key] + draft[key]}` : ''}
              <Label muted style={{ fontSize: 10 }}>
                {' '}
                · 已加 {t.allocated[key]}
              </Label>
            </Label>
          </View>
          <Button
            small
            testID={`training-minus-${key}`}
            disabled={!draft[key]}
            onPress={() => update(key, -1)}
            style={{ paddingHorizontal: 8 }}
          >
            −
          </Button>
          <Button
            small
            testID={`training-plus-${key}`}
            disabled={total >= available}
            onPress={() => update(key, 1)}
            style={{ paddingHorizontal: 8 }}
          >
            +1
          </Button>
          <Button
            small
            testID={`training-five-${key}`}
            disabled={total >= available}
            onPress={() => update(key, 5)}
            style={{ paddingHorizontal: 8 }}
          >
            +5
          </Button>
          <Button
            small
            testID={`training-all-${key}`}
            disabled={total >= available}
            onPress={() => update(key, available - total)}
            style={{ paddingHorizontal: 8 }}
          >
            全加
          </Button>
        </View>
      ))}
      <View style={[styles.wrap, { gap: 7 }]}>
        <Button
          small
          testID="training-recommend"
          disabled={!available}
          onPress={() => setStaged({ fingerprint, points: recommendedAllocation(c) })}
        >
          套用推荐 · {plan.role}
        </Button>
        <Button
          small
          testID="training-clear"
          disabled={!total}
          onPress={() => setStaged({ fingerprint, points: emptyStats() })}
        >
          撤销未确认预览
        </Button>
        <Button
          small
          accent
          testID="training-apply"
          disabled={!total || total > available}
          onPress={() => dispatch({ kind: 'allocate', creatureId: c.id, points: draft })}
        >
          确认加点 · {total} 点
        </Button>
      </View>
      <View testID="training-operation-notice" accessibilityLiveRegion="polite">
        <Label style={{ color: palette.mint, fontSize: 12 }}>{game.notice}</Label>
      </View>
      <Label muted style={{ fontSize: 11 }}>
        最近成长：
        {t.rolls.length
          ? t.rolls
              .slice(-5)
              .map((n, i) => `Lv.${c.level - Math.min(5, t.rolls.length) + i + 1} +${n}`)
              .join('／')
          : '从下一级开始记录'}
        。{POTENTIAL_NAMES[plan.potential]}
        ：按家族最终强度决定概率，进化不会重抽。入队时补齐既有等级的点数。
      </Label>
      <View testID="training-reset-policy">
        <Label muted style={{ fontSize: 12 }}>
          已确认的能力点不能直接撤回。重新分配须在背包使用重塑药剂；需在城镇、体力全满、无异常，且已有已分配点数。
        </Label>
      </View>
      <View testID="training-next-moves">
        <Label muted style={{ fontSize: 12 }}>
          {nextLevel
            ? `下次自然学招：Lv.${nextLevel} ${futureMoves
                .filter((m) => m.level === nextLevel)
                .map((m) => MOVES[m.moveId]!.name)
                .join('／')}。达到等级自动学会，满四招时选择替换。`
            : '当前形态的自然学招已全部达到解锁等级，可在精灵中心回忆技能。'}
        </Label>
      </View>
      <TrainingPlanView speciesId={c.speciesId} />
    </Panel>
  );
}
