import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MOVES, SPECIES, TYPES, TYPE_COLORS } from '../../content/catalog';
import { GameState } from '../../game/model';
import { battleMoveDetails } from '../../game/moveDetails';
import {
  chanceLabel,
  hasUsableBattleMove,
  hitChance,
  protectSuccessChance,
} from '../../game/combat';
import { battleActionReason } from '../../game/battle';
import { abilityFor, statsFor, typeMultiplier } from '../../game/rules';
import { HapticPressable as Pressable } from '../HapticPressable';
import { palette } from '../ui';

export function BattleMoves({
  game,
  actionsRemaining,
  actionTotal,
  narrow,
  onMove,
  onBack,
}: {
  game: GameState;
  actionsRemaining: number;
  actionTotal: number;
  narrow: boolean;
  onMove: (index: number) => void;
  onBack: () => void;
}) {
  const [inspected, setInspected] = useState<number | null>(null);
  const battle = game.battle!;
  const player = game.creatures[battle.playerId]!;
  const enemy = battle.enemies[battle.enemyIndex]!;
  const hasPp = hasUsableBattleMove(player, battle, true);
  const indexes = hasPp ? [0, 1, 2, 3] : [-1];
  const choices = indexes.map((index) => {
    const slot = player.moves[index];
    const moveId = index === -1 ? 'struggle' : slot?.id;
    const move = moveId ? MOVES[moveId]! : null;
    const details = moveId ? battleMoveDetails(moveId, battle.weather?.kind) : null;
    const title = move ? `${move.exclusiveSpeciesId ? '✦ ' : ''}${move.name}` : '空技能位';
    const multiplier = move?.power
      ? abilityFor(enemy).immuneType === move.type
        ? 0
        : typeMultiplier(move.type, SPECIES[enemy.speciesId]!.types)
      : 1;
    const effectiveness = multiplier === 0 ? '无效' : multiplier === 1 ? '' : `×${multiplier}`;
    const metadata = move
      ? `${move.type ? TYPES[move.type] : '无属性'} · ${details!.category} · 威力 ${move.power || '—'}`
      : '尚未学习技能';
    const pp = move ? (index === -1 ? '不消耗 PP' : `PP ${slot!.pp}/${move.pp}`) : '';
    const accuracy = move
      ? move.effect?.protect
        ? `成功率 ${chanceLabel(protectSuccessChance(battle, player.id))}`
        : `命中 ${chanceLabel(hitChance(move.id, battle.playerStages, battle.enemyStages, battle.weather?.kind, player))}`
      : '';
    const reason = move ? battleActionReason(game, { kind: 'move', index }) : '尚未学习技能';
    return { index, move, details, title, effectiveness, metadata, pp, accuracy, slot, reason };
  });
  const inspectedMove = choices.find((choice) => choice.index === inspected);
  return (
    <View testID="battle-move-picker" style={[s.picker, !narrow && s.wide]}>
      <View style={s.heading}>
        <Text style={s.headingText}>
          HP {player.hp}/{statsFor(player).hp} · 剩余 {actionsRemaining}/{actionTotal} · ⓘ 详情
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回战斗指令"
          onPress={onBack}
          hitSlop={8}
        >
          <Text style={s.back}>‹ 返回</Text>
        </Pressable>
      </View>
      <View style={s.grid}>
        {choices.map(
          ({ index, move, details, title, effectiveness, metadata, pp, accuracy, reason }) => {
            const disabled = !!reason;
            return (
              <View
                key={index}
                style={[
                  s.card,
                  { borderLeftColor: move?.type ? TYPE_COLORS[move.type] : palette.line },
                ]}
              >
                <Pressable
                  testID={index === -1 ? 'skill-struggle' : `skill-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={[
                    title,
                    metadata,
                    effectiveness,
                    pp,
                    accuracy,
                    details ? `效果：${details.effect}` : '',
                    reason,
                  ]
                    .filter(Boolean)
                    .join('，')}
                  accessibilityState={{ disabled }}
                  disabled={disabled}
                  onPress={() => onMove(index)}
                  onLongPress={() => setInspected(index)}
                  style={({ pressed }) => [s.action, disabled && s.disabled, pressed && s.pressed]}
                >
                  <View style={s.cardHeading}>
                    <Text numberOfLines={1} style={s.name}>
                      {title}
                    </Text>
                    {!!effectiveness && <Text style={s.effectiveness}>{effectiveness}</Text>}
                  </View>
                  <Text numberOfLines={1} style={s.metadata}>
                    {reason ||
                      (move ? `${move.type ? TYPES[move.type] : '无属性'} · ${pp}` : metadata)}
                  </Text>
                </Pressable>
                {!!move && (
                  <Pressable
                    testID={`skill-details-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={`查看${move.name}技能详情`}
                    onPress={() => setInspected(inspected === index ? null : index)}
                    style={({ pressed }) => [s.info, pressed && s.pressed]}
                  >
                    <Text style={s.infoText}>ⓘ</Text>
                  </Pressable>
                )}
              </View>
            );
          },
        )}
      </View>
      {inspectedMove && (
        <View testID="battle-move-details" style={s.details}>
          <View style={s.heading}>
            <Text style={s.name}>{inspectedMove.title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="收起技能详情"
              onPress={() => setInspected(null)}
              style={s.close}
            >
              <Text style={s.back}>收起 ×</Text>
            </Pressable>
          </View>
          <Text style={s.detailText}>
            {inspectedMove.metadata} · {inspectedMove.accuracy}
          </Text>
          <Text style={s.detailText}>
            {inspectedMove.pp}
            {inspectedMove.effectiveness ? ` · 对手${inspectedMove.effectiveness}` : ''}
          </Text>
          <Text style={s.detailText}>效果：{inspectedMove.details?.effect}</Text>
          {!!inspectedMove.reason && <Text style={s.detailText}>{inspectedMove.reason}</Text>}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  picker: { flex: 1, width: '100%', alignSelf: 'flex-end', gap: 6 },
  wide: { width: '64%', maxWidth: 560 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  headingText: {
    color: '#75613f',
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 1,
    backgroundColor: '#fffcf5ed',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  back: {
    color: palette.muted,
    fontSize: 11,
    padding: 7,
    backgroundColor: '#fffcf5ed',
    borderRadius: 10,
  },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'stretch', gap: 7 },
  card: {
    flexBasis: '46%',
    flexGrow: 1,
    height: '46%',
    flexDirection: 'row',
    minWidth: 0,
    minHeight: 52,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderColor: palette.line,
    borderRadius: 14,
    backgroundColor: '#fffcf5f2',
    overflow: 'hidden',
  },
  action: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 9,
    paddingVertical: 5,
    justifyContent: 'center',
    gap: 2,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  name: { color: '#55442f', fontSize: 14, lineHeight: 19, fontWeight: '800', flexShrink: 1 },
  effectiveness: { color: palette.gold, fontSize: 10, fontWeight: '800' },
  metadata: { color: palette.muted, fontSize: 10, lineHeight: 14 },
  info: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderColor: '#e9e0cd',
  },
  infoText: { color: '#aa9674', fontSize: 16 },
  details: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 8,
    right: 0,
    width: '100%',
    maxWidth: 400,
    padding: 12,
    gap: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#decca8',
    backgroundColor: '#fffcf5',
    boxShadow: '0 3px 15px #46371e20',
  },
  detailText: { color: '#66563f', fontSize: 12, lineHeight: 19 },
  close: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  pressed: { backgroundColor: '#f3dfaf' },
});
