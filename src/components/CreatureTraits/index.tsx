import { View } from 'react-native';
import { Button, Label, palette } from '../ui';
import { ItemIcon } from '../ItemIcon';
import { HELD_ITEMS } from '../../content/battleTraits';
import { abilityFor } from '../../game/rules';
import type { Creature } from '../../game/model';

export function CreatureTraits({
  creature,
  onUnequip,
  compact = false,
}: {
  creature: Creature;
  onUnequip?: () => void;
  compact?: boolean;
}) {
  const trait = abilityFor(creature),
    item = creature.heldItem && HELD_ITEMS[creature.heldItem];
  return (
    <View
      testID={`creature-traits-${creature.id}`}
      style={{
        gap: 5,
        padding: compact ? 8 : 12,
        backgroundColor: palette.panel2,
        borderRadius: 12,
      }}
    >
      <Label style={{ fontWeight: '700', color: palette.gold }}>特性 · {trait.name}</Label>
      <Label muted style={{ fontSize: 12 }}>
        {trait.description}
      </Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        {item && <ItemIcon itemId={creature.heldItem!} size={25} />}
        <Label style={{ flex: 1, fontWeight: '700' }}>携带 · {item ? item.name : '未携带'}</Label>
        {item && onUnequip && (
          <Button small testID="held-unequip" onPress={onUnequip}>
            收回
          </Button>
        )}
      </View>
      {item ? (
        <Label muted style={{ fontSize: 12 }}>
          {item.description}
        </Label>
      ) : (
        onUnequip && (
          <Label muted style={{ fontSize: 12 }}>
            在背包的「携带道具」口袋选一件装备。每位伙伴同时携带一件。
          </Label>
        )
      )}
    </View>
  );
}
