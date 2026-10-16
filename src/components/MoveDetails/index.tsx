import { useState } from 'react';
import { View } from 'react-native';
import { MOVES, SPECIES, TYPES } from '../../content/catalog';
import { Creature } from '../../game/model';
import { moveEffectLines } from '../../game/moveDetails';
import { Button, Label, palette, Panel, styles } from '../ui';

export function MoveDetails({
  moveId,
  title,
  pp,
  testID,
}: {
  moveId: string;
  title?: string;
  pp?: number;
  testID?: string;
}) {
  const move = MOVES[moveId]!;
  return (
    <View testID={testID} style={{ flex: 1, minWidth: 210 }}>
      <Panel style={{ flex: 1, padding: 10, gap: 5 }}>
        {title && (
          <Label muted style={{ fontSize: 11 }}>
            {title}
          </Label>
        )}
        <Label style={{ color: palette.gold, fontWeight: '800' }}>{move.name}</Label>
        <Label style={{ fontSize: 12 }}>
          属性：{move.type ? TYPES[move.type] : '无属性'} ·{' '}
          {move.category === 'physical' ? '物理' : move.category === 'special' ? '特殊' : '变化'}
        </Label>
        <Label muted style={{ fontSize: 12 }}>
          威力 {move.power || '—'} · 命中 {move.accuracy}% · PP {pp ?? move.pp}/{move.pp}
        </Label>
        {moveEffectLines(moveId).map((line) => (
          <Label key={line} muted style={{ fontSize: 12 }}>
            {line}
          </Label>
        ))}
        {move.exclusiveSpeciesId && (
          <Label muted style={{ fontSize: 11 }}>
            仅{SPECIES[move.exclusiveSpeciesId]!.name}可以习得，无法复刻。
          </Label>
        )}
      </Panel>
    </View>
  );
}

export function MoveComparison({
  moveId,
  original,
  testID,
}: {
  moveId: string;
  original?: Creature['moves'][number];
  testID: string;
}) {
  return (
    <View testID={testID} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {original && (
        <MoveDetails
          moveId={original.id}
          pp={original.pp}
          title="原技能 · 将被替换"
          testID={`${testID}-old`}
        />
      )}
      <MoveDetails moveId={moveId} title="新技能 · 学会后恢复完整 PP" testID={`${testID}-new`} />
    </View>
  );
}

export function MoveLearningPanel({
  c,
  moveId,
  onLearn,
  onCancel,
  testID,
}: {
  c: Creature;
  moveId: string;
  onLearn: (replace: number | null) => void;
  onCancel: () => void;
  testID: string;
}) {
  const [replace, setReplace] = useState<number | null>(c.moves.length < 4 ? null : 0);
  return (
    <View style={{ gap: 10 }}>
      <Label muted style={{ fontSize: 12 }}>
        先选择替换位置，比较技能后确认学习。
      </Label>
      <View style={[styles.wrap, { gap: 6 }]}>
        {c.moves.length < 4 && (
          <Button
            small
            selected={replace === null}
            testID={`${testID}-empty-slot`}
            onPress={() => setReplace(null)}
          >
            加入空技能位
          </Button>
        )}
        {c.moves.map((m, i) => (
          <Button
            key={m.id}
            small
            selected={replace === i}
            testID={`${testID}-slot-${i}`}
            onPress={() => setReplace(i)}
          >
            替换 {MOVES[m.id]!.name}
          </Button>
        ))}
      </View>
      <MoveComparison
        moveId={moveId}
        original={replace === null ? undefined : c.moves[replace]}
        testID={`${testID}-comparison`}
      />
      <View style={styles.wrap}>
        <Button small accent testID={`${testID}-confirm`} onPress={() => onLearn(replace)}>
          确认学习{MOVES[moveId]!.name}
          {replace === null ? ' · 加入空位' : ` · 替换${MOVES[c.moves[replace]!.id]!.name}`}
        </Button>
        <Button small testID={`${testID}-cancel`} onPress={onCancel}>
          取消学习
        </Button>
      </View>
    </View>
  );
}
