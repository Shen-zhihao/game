import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { CreatureSprite } from '../../components/CreatureSprite';
import { Button, Label, Panel, styles } from '../../components/ui';
import { MOVES, SPECIES } from '../../content/catalog';
import { worldMapFor } from '../../content/buildings';
import type { Command, GameState } from '../../game/model';
import {
  type NurseryEgg,
  inheritedNurseryMoves,
  isNurseryParent,
  nurseryActionReason,
  nurseryFor,
  nurseryParentReason,
  nurseryStatus,
  NURSERY_BREEDING_STEPS,
  NURSERY_HATCH_STEPS,
  NURSERY_MIN_LEVEL,
} from '../../game/nursery';
import { creatureName } from '../../game/rules';
import { menuStyles } from '../GameMenus';

const moveNames = (ids: string[]) => ids.map((id) => MOVES[id]?.name ?? id).join('、');

function EggDetails({ egg }: { egg: NurseryEgg }) {
  return (
    <View style={{ gap: 4 }}>
      <Label>孵化种类：{SPECIES[egg.speciesId]?.name ?? egg.speciesId}</Label>
      <Label muted>
        遗传招式：{egg.inheritedMoves.length ? moveNames(egg.inheritedMoves) : '无，使用初始招式'}
      </Label>
    </View>
  );
}

export function NurseryMenu({
  game,
  dispatch,
  onOpenRegion,
}: {
  game: GameState;
  dispatch: (command: Command) => void;
  onOpenRegion?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const nursery = nurseryFor(game);
  const atNursery = worldMapFor(game.player.map) === 'dawn';
  const collectReason = nurseryActionReason(game, { kind: 'collect' });
  const hatchReason = nurseryActionReason(game, { kind: 'hatch' });
  const inherited = inheritedNurseryMoves(game);
  const candidates = [...game.party, ...game.box].filter((id) => {
    const creature = game.creatures[id];
    if (!creature || isNurseryParent(game, id)) return false;
    if (eligibleOnly && nurseryParentReason(game, id)) return false;
    return `${creatureName(creature)} ${SPECIES[creature.speciesId]?.name ?? ''}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
  });
  return (
    <ScrollView testID="nursery-menu" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
      <View style={{ gap: 4 }}>
        <Label style={{ fontSize: 22, fontWeight: '800' }}>晨芽培育屋</Label>
        <Label muted>寄养双亲 → 行走发现蛋 → 领取随身蛋 → 行走孵化</Label>
      </View>
      <Panel testID="nursery-next-step" style={{ padding: 12, gap: 4 }}>
        <Label style={{ fontWeight: '800' }}>下一步</Label>
        <Label>{nurseryStatus(game)}</Label>
        {nursery.carriedEgg && nursery.carriedEgg.steps >= NURSERY_HATCH_STEPS && hatchReason && (
          <Label muted>{hatchReason}</Label>
        )}
      </Panel>
      <Panel testID="nursery-location" style={{ padding: 12, gap: 8 }}>
        <Label>
          {atNursery
            ? '你已在晨芽镇，可以办理寄养、取回与领蛋。'
            : '在各地均可查看进度；寄养、取回与领蛋需返回晨芽镇。'}
        </Label>
        <Label muted>
          两位同一进化家族的普通伙伴均需达到 {NURSERY_MIN_LEVEL}{' '}
          级。初始伙伴及特殊剧情精灵不参与培育。寄养后保留在仓库并锁定，取回后仍在仓库，可在伙伴菜单加入队伍。
        </Label>
        <Label muted>
          实际走到相邻格才计步；原地转向、撞墙、快速旅行和休息都不加进度。一次只照顾一枚蛋。
        </Label>
        {onOpenRegion && (
          <Button small testID="nursery-open-map" onPress={onOpenRegion}>
            查看晨芽镇位置
          </Button>
        )}
      </Panel>
      <Panel testID="nursery-parents" style={{ padding: 12, gap: 10 }}>
        <Label style={{ fontWeight: '800' }}>寄养双亲 · {nursery.parents.length}/2</Label>
        {nursery.parents.length === 0 && (
          <Label muted>还没有寄养伙伴。从下面的队伍或仓库列表选择第一位。</Label>
        )}
        {nursery.parents.map((id, index) => {
          const creature = game.creatures[id];
          if (!creature) return null;
          const reason = nurseryActionReason(game, { kind: 'withdraw', creatureId: id });
          return (
            <View key={id} testID={`nursery-parent-${id}`} style={{ gap: 6 }}>
              <View style={[styles.row, { gap: 10 }]}>
                <CreatureSprite speciesId={creature.speciesId} size={54} />
                <View style={{ flex: 1 }}>
                  <Label>
                    {index + 1}. {creatureName(creature)} · Lv.{creature.level}
                  </Label>
                  <Label muted>寄养中 · 仓库保留</Label>
                </View>
                <Button
                  small
                  testID={`nursery-withdraw-${id}`}
                  disabled={!!reason}
                  onPress={() =>
                    dispatch({ kind: 'nursery', action: { kind: 'withdraw', creatureId: id } })
                  }
                >
                  取回
                </Button>
              </View>
              {reason && (
                <Label muted testID={`nursery-withdraw-reason-${id}`}>
                  {reason}
                </Label>
              )}
            </View>
          );
        })}
        <Label testID="nursery-breeding-progress">
          {nursery.parents.length < 2
            ? '请再选择同一家族、符合等级的伙伴。'
            : nursery.waitingEgg || nursery.carriedEgg
              ? '正在照顾已有的蛋，孵化后可继续培育。'
              : `发现蛋进度：${nursery.breedingSteps}/${NURSERY_BREEDING_STEPS} 步`}
        </Label>
        {nursery.parents.length === 2 && (
          <Label muted testID="nursery-inheritance-preview">
            下枚蛋可遗传：{inherited.length ? moveNames(inherited) : '无共同且符合规则的招式'}。最多
            2 个；只限双方当前共同掌握、后代可学习的普通招式，不含专属招式与野外技能。
          </Label>
        )}
        {nursery.parents.length > 0 && (
          <Label muted>更换双亲会重新累计发现蛋的步数；已生成的蛋及其遗传招式不受影响。</Label>
        )}
      </Panel>
      <Panel testID="nursery-waiting-egg" style={{ padding: 12, gap: 8 }}>
        <Label style={{ fontWeight: '800' }}>培育屋的蛋</Label>
        {nursery.waitingEgg ? (
          <EggDetails egg={nursery.waitingEgg} />
        ) : (
          <Label muted>尚无待领取的蛋。</Label>
        )}
        <Button
          testID="nursery-collect"
          disabled={!!collectReason}
          onPress={() => dispatch({ kind: 'nursery', action: { kind: 'collect' } })}
        >
          领取并随身携带
        </Button>
        {collectReason && (
          <Label muted testID="nursery-collect-reason">
            {collectReason}
          </Label>
        )}
      </Panel>
      <Panel testID="nursery-carried-egg" style={{ padding: 12, gap: 8 }}>
        <Label style={{ fontWeight: '800' }}>随身孵化</Label>
        {nursery.carriedEgg ? (
          <>
            <EggDetails egg={nursery.carriedEgg} />
            <Label testID="nursery-hatch-progress">
              孵化进度：{nursery.carriedEgg.steps}/{NURSERY_HATCH_STEPS} 步
            </Label>
          </>
        ) : (
          <Label muted>领蛋后再开始计算孵化步数。</Label>
        )}
        <Label muted>
          达到步数后，在安全状态下点击孵化。队伍满时送入仓库；两处都满时先腾出位置，蛋会保留。
        </Label>
        <Button
          testID="nursery-hatch"
          disabled={!!hatchReason}
          onPress={() => dispatch({ kind: 'nursery', action: { kind: 'hatch' } })}
        >
          确认孵化
        </Button>
        {hatchReason && (
          <Label muted testID="nursery-hatch-reason">
            {hatchReason}
          </Label>
        )}
      </Panel>
      <View style={{ gap: 8 }}>
        <Label style={{ fontWeight: '800' }}>选择寄养伙伴</Label>
        <TextInput
          testID="nursery-search"
          accessibilityLabel="搜索寄养伙伴"
          placeholder="搜索伙伴名字或种类"
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setVisibleCount(12);
          }}
          style={menuStyles.input}
        />
        <Button
          small
          testID="nursery-filter-eligible"
          selected={eligibleOnly}
          onPress={() => {
            setEligibleOnly(!eligibleOnly);
            setVisibleCount(12);
          }}
        >
          {eligibleOnly ? '仅看符合双亲条件' : '查看全部伙伴（含不符合条件）'}
        </Button>
        <Label muted testID="nursery-candidate-count">
          符合当前筛选：{candidates.length} 位
        </Label>
        {candidates.slice(0, visibleCount).map((id) => {
          const creature = game.creatures[id]!;
          const reason = nurseryActionReason(game, { kind: 'deposit', creatureId: id });
          const parentReason = nurseryParentReason(game, id);
          return (
            <Panel key={id} testID={`nursery-candidate-${id}`} style={{ padding: 10, gap: 6 }}>
              <View style={[styles.row, { gap: 10 }]}>
                <CreatureSprite speciesId={creature.speciesId} size={48} />
                <View style={{ flex: 1 }}>
                  <Label>
                    {creatureName(creature)} · Lv.{creature.level}
                  </Label>
                  <Label muted>
                    {game.party.includes(id) ? '队伍' : '仓库'} ·{' '}
                    {SPECIES[creature.speciesId]?.name}
                  </Label>
                </View>
                <Button
                  small
                  testID={`nursery-deposit-${id}`}
                  disabled={!!reason}
                  onPress={() =>
                    dispatch({ kind: 'nursery', action: { kind: 'deposit', creatureId: id } })
                  }
                >
                  寄养
                </Button>
              </View>
              <Label muted testID={`nursery-eligibility-${id}`}>
                {parentReason ?? '符合双亲条件'}
              </Label>
              {reason && reason !== parentReason && (
                <Label muted testID={`nursery-deposit-reason-${id}`}>
                  {reason}
                </Label>
              )}
            </Panel>
          );
        })}
        {candidates.length === 0 && (
          <Label muted>没有符合筛选的伙伴。可清空搜索、显示全部，或先捕捉并培养同家族伙伴。</Label>
        )}
        {candidates.length > visibleCount && (
          <Button testID="nursery-load-more" onPress={() => setVisibleCount(visibleCount + 12)}>
            显示更多伙伴
          </Button>
        )}
      </View>
    </ScrollView>
  );
}
