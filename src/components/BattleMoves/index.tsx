import { StyleSheet, Text, View } from 'react-native';
import { MOVES, SPECIES, TYPES, TYPE_COLORS } from '../../content/catalog';
import { GameState } from '../../game/model';
import { battleMoveDetails } from '../../game/moveDetails';
import { chanceLabel, hitChance } from '../../game/combat';
import { abilityFor, typeMultiplier } from '../../game/rules';
import { HapticPressable as Pressable } from '../HapticPressable';
import { palette } from '../ui';

export function BattleMoves({
  game,
  columns,
  actionsRemaining,
  actionTotal,
  onMove,
  onBack,
}: {
  game: GameState;
  columns: number;
  actionsRemaining: number;
  actionTotal: number;
  onMove: (index: number) => void;
  onBack: () => void;
}) {
  const battle = game.battle!;
  const player = game.creatures[battle.playerId]!;
  const enemy = battle.enemies[battle.enemyIndex]!;
  const hasPp = player.moves.some((move) => move.pp > 0);
  const indexes = hasPp ? [0, 1, 2, 3] : [-1];
  return (
    <View testID="battle-move-picker" style={s.picker}>
      <View style={s.heading}>
        <Text style={s.headingText}>
          选择技能 · 剩余 {actionsRemaining}/{actionTotal} 次操作
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回战斗指令"
          onPress={onBack}
          hitSlop={8}
        >
          <Text style={s.back}>‹ 返回指令</Text>
        </Pressable>
      </View>
      <View style={s.grid}>
        {indexes.map((index) => {
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
          const effectiveness =
            multiplier === 0 ? '无效' : multiplier === 1 ? '' : `×${multiplier}`;
          const metadata = move
            ? `${move.type ? TYPES[move.type] : '无属性'} · ${details!.category} · 威力 ${move.power || '—'}`
            : '尚未学习技能';
          const pp = move
            ? `${index === -1 ? '不消耗 PP' : `PP ${slot!.pp}/${move.pp}`} · 命中 ${chanceLabel(hitChance(move.id, battle.playerStages, battle.enemyStages, battle.weather?.kind, player))}`
            : '';
          const disabled = !move || (index !== -1 && slot!.pp === 0);
          return (
            <Pressable
              key={index}
              testID={index === -1 ? 'skill-struggle' : `skill-${index}`}
              accessibilityRole="button"
              accessibilityLabel={[
                title,
                metadata,
                effectiveness,
                pp,
                details ? `效果：${details.effect}` : '',
              ]
                .filter(Boolean)
                .join('，')}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => onMove(index)}
              style={({ pressed }) => [
                s.card,
                {
                  flexBasis: columns === 4 ? '23%' : '46%',
                  height: columns === 4 ? '100%' : '46%',
                  borderTopColor: move?.type ? TYPE_COLORS[move.type] : palette.line,
                },
                disabled && s.disabled,
                pressed && s.pressed,
              ]}
            >
              <View style={s.cardHeading}>
                <Text numberOfLines={1} style={s.name}>
                  {title}
                </Text>
                {!!effectiveness && <Text style={s.effectiveness}>{effectiveness}</Text>}
              </View>
              <Text numberOfLines={1} style={s.metadata}>
                {metadata}
              </Text>
              {details && (
                <>
                  <Text numberOfLines={1} style={s.metadata}>
                    {pp}
                  </Text>
                  <Text numberOfLines={2} style={s.effect}>
                    效果：{details.effect}
                  </Text>
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  picker: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  headingText: { color: '#92784e', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  back: { color: palette.muted, fontSize: 12, paddingVertical: 6, paddingHorizontal: 4 },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'stretch', gap: 8 },
  card: {
    flexGrow: 1,
    minWidth: 0,
    borderWidth: 1,
    borderTopWidth: 3,
    borderColor: palette.line,
    borderRadius: 16,
    backgroundColor: '#fffcf5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 3,
    justifyContent: 'center',
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  name: { color: '#55442f', fontSize: 15, lineHeight: 20, fontWeight: '800', flexShrink: 1 },
  effectiveness: { color: palette.gold, fontSize: 11, fontWeight: '800' },
  metadata: { color: palette.muted, fontSize: 10, lineHeight: 14 },
  effect: { color: '#66563f', fontSize: 12, lineHeight: 16 },
  disabled: { opacity: 0.4 },
  pressed: { backgroundColor: palette.tint, transform: [{ translateY: 1 }] },
});
