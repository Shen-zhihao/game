import { View } from 'react-native';
import type { Command, Creature, GameState } from '../../game/model';
import {
  friendshipFor,
  friendshipInteractionReason,
  friendshipLabel,
  FRIENDSHIP_INTERACTION_GAIN,
  FRIENDSHIP_INTERACTION_SECONDS,
  FRIENDSHIP_INTERACTION_STEPS,
  FRIENDSHIP_MAX,
  FRIENDSHIP_WALK_GAIN,
  FRIENDSHIP_WALK_STEPS,
} from '../../game/friendship';
import { Button, Label, palette, Panel } from '../ui';

export function FriendshipPanel({
  creature,
  game,
  dispatch,
}: {
  creature: Creature;
  game: GameState;
  dispatch: (command: Command) => void;
}) {
  const friendship = friendshipFor(creature);
  const reason = friendshipInteractionReason(game, creature);
  return (
    <Panel testID="partner-friendship" style={{ padding: 12, gap: 8 }}>
      <Label style={{ color: palette.gold, fontWeight: '700' }}>
        亲密度 {friendship.points}/{FRIENDSHIP_MAX} · {friendshipLabel(friendship.points)}
      </Label>
      <View
        style={{ height: 6, borderRadius: 3, backgroundColor: palette.panel2, overflow: 'hidden' }}
      >
        <View
          style={{
            height: '100%',
            width: `${(friendship.points / FRIENDSHIP_MAX) * 100}%`,
            backgroundColor: palette.amber,
          }}
        />
      </View>
      <Label muted style={{ fontSize: 11 }}>
        未昏厥的队伍伙伴每同行 {FRIENDSHIP_WALK_STEPS} 步增加 {FRIENDSHIP_WALK_GAIN} 点； 当前{' '}
        {friendship.walkingSteps}/{FRIENDSHIP_WALK_STEPS} 步。仓库、原地转向与快速旅行不计步。
      </Label>
      <Button
        small
        testID="partner-interact"
        disabled={!!reason}
        onPress={() => dispatch({ kind: 'befriend', creatureId: creature.id })}
      >
        陪伴互动 · 亲密度 +{FRIENDSHIP_INTERACTION_GAIN}
      </Button>
      <Label muted testID="partner-interaction-status" style={{ fontSize: 11 }}>
        {reason ??
          `可以互动。每次互动后需再同行 ${FRIENDSHIP_INTERACTION_STEPS} 步并游玩 ${FRIENDSHIP_INTERACTION_SECONDS} 秒；休息和读档不会重置。`}
      </Label>
    </Panel>
  );
}
