import { ITEMS, MOVES, SPECIES, TYPES } from '../../content/catalog';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Label, Panel, styles } from '../../components/ui';
import { CHALLENGE_OFFERS, challengeEntryReason } from '../../game/challenge';
import type { Command, GameState } from '../../game/model';
import { creatureName } from '../../game/rules';

export function ChallengeMenu({
  game,
  dispatch,
}: {
  game: GameState;
  dispatch: (c: Command) => void;
}) {
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const active = game.challenge?.active;
  const draft = game.challenge?.rentalDraft;
  const rental = active?.rental;
  const swapOut = active?.selected.includes(outgoing ?? '') ? outgoing : active?.selected[0];
  const chosen = selected.filter((id) => game.party.includes(id));
  const reason = challengeEntryReason(game);
  const points = game.challenge?.points ?? 0;
  return (
    <View style={{ gap: 12 }}>
      <Label style={{ fontSize: 21, fontWeight: '800' }}>冠军规则挑战 · 单打</Label>
      <Label>
        积分 {points} · 当前连胜 {game.challenge?.streak ?? 0} · 最高连胜{' '}
        {game.challenge?.best ?? 0}
      </Label>
      <Panel style={{ padding: 12, gap: 6 }}>
        <Label>同行队伍选三只 · 双方统一 Lv.50 · 禁止背包、捕捉与逃跑</Label>
        <Label muted>
          使用临时副本：保留物种、技能与携带道具，按物种推荐统一自动培养。每场恢复全部体力、技能次数与携带道具，不消耗原道具。
        </Label>
        <Label muted>
          对手随机抽取联盟主题中的三只。胜利仅获积分与连胜纪录，不获经验、金币或剧情奖励。每胜 5
          积分，每三连胜额外 1 分（最多额外 10 分）。
        </Label>
        <Label muted>
          结束或战败时原队伍与仓库顺序、原等级、培养、体力、异常、技能次数和携带道具完整还原。挑战期间不能进行其他冒险操作。
        </Label>
      </Panel>
      {reason && <Label muted>{reason}</Label>}
      <Panel style={{ padding: 12, gap: 8 }}>
        <Label style={{ fontWeight: '800' }}>租借队伍挑战 · 六选三 · 三场通关</Label>
        <Label muted>
          统一
          Lv.50。每胜可从刚击败的三只中换入一只，也可不换；每场恢复租借队伍。自己的精灵、仓库、道具和图鉴不受影响，仅获得挑战积分与通关纪录。
        </Label>
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
            {draft.offers.map((c) => (
              <Button
                key={c.id}
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
                {draft.selected.includes(c.id) ? '✓ ' : ''}
                {creatureName(c)} · Lv.50 ·{' '}
                {SPECIES[c.speciesId]!.types.map((t) => TYPES[t]).join('/')}
                {' · '}
                {c.heldItem ? ITEMS[c.heldItem]?.name : '无携带道具'}
                {'\n'}
                {c.moves.map((m) => MOVES[m.id]!.name).join(' / ')}
              </Button>
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
                  <Button
                    key={c.id}
                    testID={`rental-swap-${c.id}`}
                    disabled={!swapOut}
                    onPress={() =>
                      dispatch({
                        kind: 'challenge',
                        action: { kind: 'rentalSwap', outgoingId: swapOut!, incomingId: c.id },
                      })
                    }
                  >
                    换入 {creatureName(c)}
                    {'\n'}
                    {c.moves.map((m) => MOVES[m.id]!.name).join(' / ')}
                  </Button>
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
              disabled={!!reason}
              onPress={() => dispatch({ kind: 'challenge', action: { kind: 'retire' } })}
            >
              结束并还原队伍
            </Button>
          </View>
        </Panel>
      ) : !draft ? (
        <Panel style={{ padding: 12, gap: 8 }}>
          <Label>从同行队伍选择三只：{chosen.length}/3</Label>
          {game.party.map((id) => {
            const c = game.creatures[id]!;
            const checked = chosen.includes(id);
            return (
              <Button
                key={id}
                testID={`challenge-select-${id}`}
                accent={checked}
                disabled={!!reason || (!checked && chosen.length >= 3)}
                onPress={() =>
                  setSelected(checked ? chosen.filter((x) => x !== id) : [...chosen, id])
                }
              >
                {checked ? '✓ ' : ''}
                {creatureName(c)} · 原 Lv.{c.level}
              </Button>
            );
          })}
          <Button
            testID="challenge-start"
            disabled={!!reason || chosen.length !== 3}
            onPress={() =>
              dispatch({ kind: 'challenge', action: { kind: 'start', creatureIds: chosen } })
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
    </View>
  );
}
