import React, { useState } from 'react';
import { FlatList, Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MOVES, SPECIES, TYPES } from '../../content/catalog';
import { MoveComparison, MoveDetails } from '../../components/MoveDetails';
import { CreatureSprite } from '../../components/CreatureSprite';
import { Button, Label, palette, Panel, styles, TypeBadges } from '../../components/ui';
import { Command, GameState } from '../../game/model';
import { creatureName } from '../../game/rules';
import { copyableMove, copyMoveReason } from '../../game/skills';

export function SkillCopyMenu({
  game,
  dispatch,
  initialTargetId,
  onClose,
}: {
  game: GameState;
  dispatch: (c: Command) => void;
  initialTargetId: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'source' | 'target'>('source');
  const [sourceId, setSourceId] = useState(game.party[0]!);
  const [targetId, setTargetId] = useState(initialTargetId);
  const [chosenMove, setChosenMove] = useState('');
  const [replace, setReplace] = useState<number | null>(null);
  const [showBox, setShowBox] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const source = game.creatures[sourceId];
  const target = game.creatures[targetId];
  const moveId = source?.moves.some((m) => m.id === chosenMove)
    ? chosenMove
    : source?.moves.find((m) => copyableMove(m.id))?.id;
  const move = moveId ? MOVES[moveId] : null;
  const reason = moveId
    ? copyMoveReason(game, sourceId, targetId, moveId, replace)
    : '请选择来源伙伴及技能。';
  const completed =
    attempted &&
    !!target?.moves.some((m) => m.id === moveId) &&
    !!target.taughtMoves?.includes(moveId!);
  const ids = showBox ? game.box : game.party;
  const selectedId = step === 'source' ? sourceId : targetId;
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      supportedOrientations={['landscape-left', 'landscape-right']}
      onRequestClose={() => (step === 'target' && !completed ? setStep('source') : onClose())}
    >
      <View
        testID="skill-copy-dialog"
        accessibilityViewIsModal
        role="dialog"
        aria-modal
        style={{
          flex: 1,
          backgroundColor: '#102b23',
          paddingTop: insets.top + 10,
          paddingBottom: insets.bottom + 10,
          paddingLeft: insets.left + 14,
          paddingRight: insets.right + 14,
          gap: 10,
        }}
      >
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <View>
            <Label style={{ fontWeight: '800', fontSize: 21, color: palette.gold }}>
              技能复刻剂 · 持有 {game.inventory.skill_copy ?? 0}
            </Label>
            <Label muted style={{ fontSize: 11 }}>
              普通技能不限种族、属性、等级；专属技能不可复刻，成功学习才消耗一瓶。
            </Label>
          </View>
          <Button small testID="copy-close" onPress={onClose}>
            关闭 ×
          </Button>
        </View>
        {completed ? (
          <Panel style={{ gap: 12 }}>
            <Label style={styles.title}>学习完成</Label>
            <Label>{game.notice}</Label>
            <Label muted>
              技能已加入接收伙伴的技能册。进化后继续保留；忘记后可在城镇免费回忆。
            </Label>
            <Button accent testID="copy-done" onPress={onClose}>
              完成，返回背包
            </Button>
          </Panel>
        ) : (
          <>
            <View style={[styles.row, { gap: 8 }]}>
              <Button
                small
                accent={step === 'source'}
                onPress={() => {
                  setStep('source');
                  setShowBox(false);
                }}
              >
                1 · 选择来源技能
              </Button>
              <Button
                small
                accent={step === 'target'}
                disabled={!move}
                testID="copy-next"
                onPress={() => {
                  setStep('target');
                  setShowBox(false);
                }}
              >
                2 · 选择接收伙伴
              </Button>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', gap: 14 }}>
              <View style={{ width: '31%', gap: 8 }}>
                <View style={[styles.wrap, { gap: 5 }]}>
                  <Button small accent={!showBox} onPress={() => setShowBox(false)}>
                    队伍 {game.party.length}
                  </Button>
                  <Button small accent={showBox} testID="copy-box" onPress={() => setShowBox(true)}>
                    仓库 {game.box.length}
                  </Button>
                </View>
                <Label muted style={{ fontSize: 12 }}>
                  {step === 'source' ? '从谁身上复刻？' : '把技能教给谁？'}
                </Label>
                <FlatList
                  data={ids}
                  keyExtractor={(id) => id}
                  extraData={selectedId}
                  contentContainerStyle={{ gap: 7, paddingBottom: 10 }}
                  ListEmptyComponent={<Label muted>这里还没有伙伴。</Label>}
                  renderItem={({ item: id }) => {
                    const c = game.creatures[id]!;
                    return (
                      <Button
                        small
                        testID={`copy-creature-${id}`}
                        accent={selectedId === id}
                        onPress={() => {
                          if (step === 'source') {
                            setSourceId(id);
                            setChosenMove('');
                          } else setTargetId(id);
                          setReplace(null);
                          setAttempted(false);
                        }}
                      >
                        {creatureName(c)} · Lv.{c.level}
                      </Button>
                    );
                  }}
                />
              </View>
              <ScrollView
                key={`${step}:${selectedId}`}
                style={{ flex: 1 }}
                contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
              >
                {step === 'source' && source ? (
                  <>
                    <Label style={{ fontWeight: '800', fontSize: 18 }}>
                      {creatureName(source)}当前掌握的技能
                    </Label>
                    {source.moves
                      .filter((m) => MOVES[m.id]?.exclusiveSpeciesId)
                      .map((m) => (
                        <View key={m.id} testID={`copy-exclusive-${m.id}`}>
                          <Label muted>{MOVES[m.id]!.name} · 专属技能，无法复刻</Label>
                        </View>
                      ))}
                    {source.moves
                      .filter((m) => copyableMove(m.id))
                      .map((m) => (
                        <Button
                          key={m.id}
                          small
                          testID={`copy-move-${m.id}`}
                          accent={moveId === m.id}
                          onPress={() => {
                            setChosenMove(m.id);
                            setReplace(null);
                          }}
                        >
                          {MOVES[m.id]!.name} ·{' '}
                          {MOVES[m.id]!.type ? TYPES[MOVES[m.id]!.type!] : '通用'} · PP {m.pp}/
                          {MOVES[m.id]!.pp}
                        </Button>
                      ))}
                  </>
                ) : (
                  target && (
                    <>
                      <View style={styles.row}>
                        <CreatureSprite speciesId={target.speciesId} size={48} />
                        <View style={{ flex: 1 }}>
                          <Label style={{ fontWeight: '800', fontSize: 18 }}>
                            {creatureName(target)} · Lv.{target.level}
                          </Label>
                          <TypeBadges types={SPECIES[target.speciesId]!.types} />
                        </View>
                      </View>
                      <Label style={{ color: palette.gold }}>
                        {source ? creatureName(source) : '来源'} → {creatureName(target)}：
                        {move?.name}
                      </Label>
                      <Label muted style={{ fontSize: 12 }}>
                        {target.moves.length >= 4
                          ? '已掌握四个技能，选择要替换的一项。取消不扣道具。'
                          : '有空技能位，可以直接加入，也可以选择替换已有技能。'}
                      </Label>
                      {target.moves.length < 4 && (
                        <Button
                          small
                          testID="copy-empty-slot"
                          accent={replace === null}
                          onPress={() => setReplace(null)}
                        >
                          加入空技能位
                        </Button>
                      )}
                      {target.moves.map((m, i) => (
                        <Button
                          key={m.id}
                          small
                          testID={`copy-slot-${i}`}
                          accent={replace === i}
                          onPress={() => setReplace(i)}
                        >
                          替换 {MOVES[m.id]!.name} · PP {m.pp}/{MOVES[m.id]!.pp}
                        </Button>
                      ))}
                    </>
                  )
                )}
                {move &&
                  (step === 'target' ? (
                    <MoveComparison
                      moveId={move.id}
                      original={replace === null ? undefined : target?.moves[replace]}
                      testID="copy-comparison"
                    />
                  ) : (
                    <MoveDetails moveId={move.id} title="待复刻技能" />
                  ))}
                {step === 'source' && (
                  <Button
                    small
                    accent
                    disabled={!move}
                    testID="copy-select-target"
                    onPress={() => {
                      setStep('target');
                      setShowBox(false);
                    }}
                  >
                    下一步 · 选择接收伙伴
                  </Button>
                )}
              </ScrollView>
            </View>
            {step === 'target' && (
              <View
                style={[styles.row, { paddingTop: 8, borderTopWidth: 1, borderColor: '#496653' }]}
              >
                <Label muted style={{ flex: 1, fontSize: 12 }}>
                  {reason ||
                    `${target ? creatureName(target) : ''}学习${move?.name}，${replace === null ? '加入空技能位' : `替换${MOVES[target!.moves[replace]!.id]!.name}`}。`}
                </Label>
                <Button
                  small
                  accent
                  testID="copy-confirm"
                  disabled={!!reason}
                  onPress={() => {
                    if (!moveId) return;
                    dispatch({ kind: 'copyMove', sourceId, creatureId: targetId, moveId, replace });
                    setAttempted(true);
                  }}
                >
                  确认复刻 · 消耗 1 瓶
                </Button>
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}
