import { MOVES, SPECIES, TYPES } from '../../content/catalog';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { heldEffect } from '../../content/battleTraits';
import { moveEffectLines } from '../../game/moveDetails';
import { rentalStage, rentalWeaknesses } from '../../game/challenge/rental';
import { View } from 'react-native';
import { Button, Label, Panel, styles } from '../../components/ui';
import {
  CHALLENGE_OFFERS,
  CHALLENGE_RULES,
  activeChallengeRule,
  challengeEntryReason,
  challengePreview,
  challengeRecords,
  challengeRuleName,
  challengeTeamReason,
} from '../../game/challenge';
import type { OwnedChallengeRule } from '../../game/challenge';
import type { Command, Creature, GameState } from '../../game/model';
import { abilityFor, creatureName, statsFor } from '../../game/rules';
import { ChallengeRetirementDialog } from '../../components/ChallengeRetirementDialog';
import { useChallengeRetirement } from '../../hooks/useChallengeRetirement';

function RentalCard({
  creature,
  context,
  children,
}: {
  creature: Creature;
  context: string;
  children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  creature = challengePreview(creature);
  const stats = statsFor(creature);
  const ability = abilityFor(creature);
  const held = heldEffect(creature);
  return (
    <Panel style={{ padding: 10, gap: 8 }}>
      <Label style={{ fontWeight: '800' }}>
        {creatureName(creature)} · Lv.{creature.level} ·{' '}
        {SPECIES[creature.speciesId]!.types.map((t) => TYPES[t]).join('/')}
      </Label>
      <Label muted>
        {held?.name ?? '无携带道具'} · {creature.moves.map((m) => MOVES[m.id]!.name).join(' / ')}
      </Label>
      <View style={styles.wrap}>
        {children}
        <Button
          small
          testID={`rental-details-${context}-${creature.id}`}
          onPress={() => setExpanded((value) => !value)}
          accessibilityLabel={`${expanded ? '收起' : '查看'}${creatureName(creature)}的能力与招式详情`}
        >
          {expanded ? '收起详情' : '查看详情'}
        </Button>
      </View>
      {expanded && (
        <View style={{ gap: 6 }} testID={`rental-details-body-${context}-${creature.id}`}>
          <Label>
            体力 {creature.hp}/{stats.hp} · 攻击 {stats.attack} · 防御 {stats.defense}
          </Label>
          <Label>
            特攻 {stats.specialAttack} · 特防 {stats.specialDefense} · 速度 {stats.speed}
          </Label>
          <Label muted>
            下场统一培养并恢复后的面板；实战还受能力等级、天气、特性和携带道具影响。
          </Label>
          <Label>
            特性：{ability.name}。{ability.description}
          </Label>
          <Label>携带：{held ? `${held.name}。${held.description}` : '无'}</Label>
          {creature.moves.map((slot) => {
            const move = MOVES[slot.id]!;
            return (
              <View key={slot.id} style={{ gap: 3 }}>
                <Label style={{ fontWeight: '700' }}>
                  {move.name} · {move.type ? TYPES[move.type] : '无属性'} ·{' '}
                  {{ physical: '物理', special: '特殊', status: '变化' }[move.category]}
                </Label>
                <Label>
                  威力 {move.power || '—'} · 基础命中 {move.accuracy}% · PP {slot.pp}/{move.pp}
                </Label>
                {moveEffectLines(slot.id).map((line, i) => (
                  <Label muted key={i}>
                    {line}
                  </Label>
                ))}
              </View>
            );
          })}
        </View>
      )}
    </Panel>
  );
}
function RentalWeaknessSummary({ creatures }: { creatures: Creature[] }) {
  const risks = rentalWeaknesses(creatures).filter((row) => row.weak > 0);
  return (
    <Panel style={{ padding: 10, gap: 6 }}>
      <Label style={{ fontWeight: '700' }}>已选队伍防守预览 · {creatures.length}/3 只</Label>
      {!creatures.length ? (
        <Label muted>先选择伙伴，再查看共同弱点。</Label>
      ) : risks.length ? (
        risks.map((row) => (
          <Label key={row.type}>
            {TYPES[row.type]}：{row.weak}只弱点 · {row.resist}只抵抗 · {row.immune}只免疫
            {row.weak >= 2 ? ' · 共同弱点' : ''}
          </Label>
        ))
      ) : (
        <Label>当前没有属性倍率大于1的弱点。</Label>
      )}
      <Label muted>
        仅按属性相性与特性属性免疫统计；不计招式威力、物理／特殊与条件性特性减伤、携带道具、体力、天气、场地陷阱等，不代表胜负预测。免疫与抵抗分别计数。
      </Label>
    </Panel>
  );
}

export function ChallengeMenu({
  game,
  dispatch,
}: {
  game: GameState;
  dispatch: (c: Command) => void;
}) {
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [rule, setRule] = useState<OwnedChallengeRule>('standard');
  const active = game.challenge?.active;
  const retirement = useChallengeRetirement(game, dispatch);
  const draft = game.challenge?.rentalDraft;
  const rental = active?.rental;
  const swapOut = active?.selected.includes(outgoing ?? '') ? outgoing : active?.selected[0];
  const party = [...new Set(game.party)].filter((id) => {
    const creature = game.creatures[id];
    return creature && SPECIES[creature.speciesId];
  });
  const chosen = [...new Set(selected)].filter((id) => party.includes(id));
  const reason = challengeEntryReason(game);
  const teamReason = challengeTeamReason(game, chosen, rule);
  const ruleDescription = CHALLENGE_RULES.find((entry) => entry.id === rule)!.description;
  const points = game.challenge?.points ?? 0;
  return (
    <View style={{ gap: 12 }}>
      <Label style={{ fontSize: 21, fontWeight: '800' }}>冠军规则挑战 · 单打</Label>
      <Label>
        积分 {points} · 当前连胜 {game.challenge?.streak ?? 0}
      </Label>
      {active && (
        <Label testID="challenge-active-rule" style={{ fontWeight: '700' }}>
          当前规则：{challengeRuleName(activeChallengeRule(game))}
        </Label>
      )}
      <Panel testID="challenge-records" style={{ padding: 12, gap: 6 }}>
        <Label style={{ fontWeight: '800' }}>分规则纪录</Label>
        {[...CHALLENGE_RULES.map((entry) => entry.id), 'rental' as const].map((recordRule) => {
          const record = challengeRecords(game, recordRule);
          return (
            <Label key={recordRule} testID={`challenge-record-${recordRule}`}>
              {challengeRuleName(recordRule)} · 最高连胜 {record.best} · 累计胜场 {record.wins}
            </Label>
          );
        })}
        <Label muted>分项胜场从本版起累计；旧版进行中的连胜可继续计入对应规则最高纪录。</Label>
        {!!game.challenge?.best && (
          <Label muted testID="challenge-historical-best">
            历史综合最高连胜 {game.challenge.best}（跨模式保留；旧版纪录不拆分归入各规则）
          </Label>
        )}
      </Panel>
      <Panel style={{ padding: 12, gap: 6 }}>
        <Label>同行队伍选三只 · 双方统一 Lv.50 · 禁止背包、捕捉与逃跑</Label>
        <Label muted>
          使用临时副本：保留物种、技能与携带道具，按物种推荐统一自动培养。每场恢复全部体力、技能次数与携带道具，不消耗原道具。
        </Label>
        <Label muted>
          自有队伍模式的对手随机抽取联盟主题中的三只。所有模式胜利仅获积分与挑战纪录，不获经验、金币或剧情奖励。每胜
          5 积分，每三连胜额外 1 分（每胜最多 15 分）。
        </Label>
        <Label muted>
          结束或战败时原队伍与仓库顺序、原等级、培养、体力、异常、技能次数和携带道具完整还原。挑战期间不能进行其他冒险操作。
        </Label>
      </Panel>
      {reason && (
        <Label muted testID="challenge-entry-reason">
          {reason}
        </Label>
      )}
      <Panel style={{ padding: 12, gap: 8 }}>
        <Label style={{ fontWeight: '800' }}>租借队伍挑战 · 六选三 · 三场通关</Label>
        <Label muted>
          统一
          Lv.50。每胜可从刚击败的三只中换入一只，也可不换；每场恢复租借队伍。自己的精灵、仓库、道具和图鉴不受影响，仅获得挑战积分与通关纪录。
        </Label>
        <Label>
          新开场次路线：
          {[0, 1, 2].map((round) => `${round + 1}. ${rentalStage(round).theme}`).join(' → ')}
        </Label>
        <Label style={{ fontWeight: '700' }}>
          {game.battle && rental
            ? `当前对手：${game.battle.name}`
            : `下场预告：${rentalStage(rental ? (game.challenge?.streak ?? 0) : 0).name} · ${rentalStage(rental ? (game.challenge?.streak ?? 0) : 0).theme}`}
        </Label>
        {(!game.battle || !rental) && (
          <Label muted>{rentalStage(rental ? (game.challenge?.streak ?? 0) : 0).hint}</Label>
        )}
        <Label>租借通关 {game.challenge?.rentalClears ?? 0} 次</Label>
        {!active && !draft && (
          <Button
            testID="rental-offer"
            disabled={!!reason}
            onPress={() => dispatch({ kind: 'challenge', action: { kind: 'rentalOffer' } })}
          >
            领取六只候选伙伴
          </Button>
        )}
        {draft && (
          <>
            <Label>选择三只：{draft.selected.length}/3 · 选择会随存档保留</Label>
            <RentalWeaknessSummary
              creatures={draft.selected
                .map((id) => draft.offers.find((c) => c.id === id)!)
                .filter(Boolean)}
            />
            {draft.offers.map((c) => (
              <RentalCard key={c.id} creature={c} context="offer">
                <Button
                  testID={`rental-select-${c.id}`}
                  accent={draft.selected.includes(c.id)}
                  disabled={
                    !!reason || (!draft.selected.includes(c.id) && draft.selected.length >= 3)
                  }
                  onPress={() =>
                    dispatch({
                      kind: 'challenge',
                      action: { kind: 'rentalSelect', creatureId: c.id },
                    })
                  }
                >
                  {draft.selected.includes(c.id) ? '取消选择' : '选择伙伴'}
                </Button>
              </RentalCard>
            ))}
            <View style={styles.wrap}>
              <Button
                testID="rental-start"
                disabled={!!reason || draft.selected.length !== 3}
                onPress={() => dispatch({ kind: 'challenge', action: { kind: 'rentalStart' } })}
              >
                租借三只并开始
              </Button>
              <Button
                testID="rental-cancel"
                disabled={!!reason}
                onPress={() => dispatch({ kind: 'challenge', action: { kind: 'rentalCancel' } })}
              >
                取消登记
              </Button>
            </View>
          </>
        )}
        {rental && (
          <>
            <Label>
              已胜 {game.challenge?.streak ?? 0}/3 场 ·{' '}
              {rental.swapped ? '本场已换过伙伴' : '每场胜后可换一只'}
            </Label>
            <RentalWeaknessSummary creatures={active.selected.map((id) => game.creatures[id]!)} />
            {active.selected.map((id) => (
              <RentalCard
                key={id}
                creature={active.originals[id] ?? game.creatures[id]!}
                context="active"
              />
            ))}
            {!reason && !rental.swapped && rental.opponents.length > 0 && (
              <>
                <Label>先选要归还的租借伙伴，再选要换入的伙伴：</Label>
                <View style={styles.wrap}>
                  {active.selected.map((id) => (
                    <Button
                      key={id}
                      testID={`rental-out-${id}`}
                      accent={swapOut === id}
                      onPress={() => setOutgoing(id)}
                    >
                      {creatureName(game.creatures[id]!)}
                    </Button>
                  ))}
                </View>
                {rental.opponents.map((c) => (
                  <RentalCard key={c.id} creature={c} context="swap">
                    <Button
                      testID={`rental-swap-${c.id}`}
                      disabled={!swapOut}
                      onPress={() =>
                        dispatch({
                          kind: 'challenge',
                          action: { kind: 'rentalSwap', outgoingId: swapOut!, incomingId: c.id },
                        })
                      }
                    >
                      换入此伙伴
                    </Button>
                  </RentalCard>
                ))}
              </>
            )}
          </>
        )}
      </Panel>

      {active ? (
        <Panel style={{ padding: 12, gap: 8 }}>
          <Label>
            参赛：{active.selected.map((id) => creatureName(game.creatures[id]!)).join('、')}
          </Label>
          <View style={styles.wrap}>
            <Button
              testID="challenge-next"
              disabled={!!reason}
              onPress={() => dispatch({ kind: 'challenge', action: { kind: 'next' } })}
            >
              恢复并挑战下一场
            </Button>
            <Button
              testID="challenge-retire"
              accessibilityLabel="打开结束挑战确认，战斗中也可结束"
              onPress={retirement.request}
            >
              结束并还原队伍
            </Button>
          </View>
        </Panel>
      ) : !draft ? (
        <Panel style={{ padding: 12, gap: 8 }}>
          <Label style={{ fontWeight: '800' }}>自有队伍挑战 · 选择规则</Label>
          <View style={styles.wrap} testID="challenge-rule-options">
            {CHALLENGE_RULES.map((entry) => (
              <Button
                key={entry.id}
                testID={`challenge-rule-${entry.id}`}
                accent={rule === entry.id}
                selected={rule === entry.id}
                accessibilityLabel={`选择自有队伍规则：${entry.name}`}
                onPress={() => setRule(entry.id)}
              >
                {entry.name}
              </Button>
            ))}
          </View>
          <Label testID="challenge-rule-description">{ruleDescription}</Label>
          <Label testID="challenge-selection-count">从同行队伍选择三只：{chosen.length}/3</Label>
          {party.map((id) => {
            const c = game.creatures[id]!;
            const checked = chosen.includes(id);
            const types = SPECIES[c.speciesId]!.types.map((type) => TYPES[type]).join('/');
            const heldName = heldEffect(c)?.name ?? '无携带道具';
            return (
              <Button
                key={id}
                testID={`challenge-select-${id}`}
                accent={checked}
                selected={checked}
                accessibilityLabel={`${checked ? '取消选择' : '选择'}${creatureName(c)}，原等级${c.level}，属性${types}，携带道具：${heldName}`}
                disabled={!!reason || (!checked && chosen.length >= 3)}
                onPress={() =>
                  setSelected(checked ? chosen.filter((x) => x !== id) : [...chosen, id])
                }
              >
                {checked ? '✓ ' : ''}
                {creatureName(c)} · 原 Lv.{c.level} · {types}
                {'\n'}携带：{heldName}
              </Button>
            );
          })}
          <View accessibilityLiveRegion="polite">
            <Label testID="challenge-team-reason" muted={!!teamReason}>
              {teamReason ?? `已满足${challengeRuleName(rule)}的组队条件。`}
            </Label>
          </View>
          <Button
            testID="challenge-start"
            accessibilityLabel={`按${challengeRuleName(rule)}登记并开始第一场`}
            disabled={!!reason || !!teamReason}
            onPress={() =>
              dispatch({
                kind: 'challenge',
                action: { kind: 'start', creatureIds: chosen, rule },
              })
            }
          >
            登记并开始第一场
          </Button>
        </Panel>
      ) : null}
      <Label style={{ fontWeight: '800' }}>积分兑换</Label>
      {CHALLENGE_OFFERS.map((offer) => (
        <Button
          key={offer.id}
          testID={`challenge-exchange-${offer.id}`}
          disabled={
            !!reason ||
            !!active ||
            points < offer.cost ||
            (game.inventory[offer.itemId] ?? 0) >= 999
          }
          onPress={() =>
            dispatch({ kind: 'challenge', action: { kind: 'exchange', offerId: offer.id } })
          }
        >
          {offer.name} ×1 · {offer.cost} 积分
        </Button>
      ))}
      <ChallengeRetirementDialog
        visible={retirement.visible}
        rental={!!rental}
        streak={game.challenge?.streak ?? 0}
        onCancel={retirement.cancel}
        onConfirm={retirement.confirm}
      />
    </View>
  );
}
