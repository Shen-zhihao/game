import { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { HELD_ITEMS, type HeldItemId } from '../../content/battleTraits';

export function HeldTrinket({ itemId }: { itemId: HeldItemId }) {
  const color = HELD_ITEMS[itemId].color;
  if (itemId === 'held_berry' || itemId === 'held_cleanse')
    return (
      <>
        <Path d="M23 18C8 9 4 34 19 39c14 10 30-16 10-21Z" fill={color} />
        <Path d="M24 19q-9-12 5-13 8 7-5 13Z" fill="#a6b990" />
        <Path d="M15 24q-3 6 2 9" stroke="#fff5dc" fill="none" />
      </>
    );
  if (itemId === 'held_leftovers')
    return (
      <>
        <Rect x={8} y={15} width={32} height={25} rx={8} fill={color} />
        <Rect x={7} y={11} width={34} height={10} rx={5} fill="#e6d2a8" />
        <Path d="M17 12V7h14v5m-6 12v11" fill="none" />
        <Path d="m17 27 7-4 7 4-7 4Z" fill="#fff3d4" />
      </>
    );
  if (itemId === 'held_lens' || itemId === 'held_scope')
    return (
      <>
        <Circle cx={22} cy={22} r={14} fill={color} />
        <Circle cx={22} cy={22} r={9} fill="#e1eeea" />
        <Path d="m32 32 9 9" stroke="#a98c66" strokeWidth={6} />
        <Path d="m17 22 5-5m-8 11 14-14" stroke="#fff8e7" fill="none" />
        {itemId === 'held_scope' && <Path d="M22 14v16m-8-8h16" strokeWidth={1} fill="none" />}
      </>
    );
  if (itemId === 'held_band' || itemId === 'held_shell')
    return (
      <>
        <Ellipse cx={24} cy={15} rx={15} ry={8} fill="#eadcc1" />
        <Path d="M9 15v20q15 15 30 0V15q-15 13-30 0Z" fill={color} />
        <Path d="M14 23v10m7-7v11m7-11v11m7-14v10" fill="none" stroke="#f6edda" strokeWidth={1.3} />
        <Circle cx={24} cy={31} r={5} fill="#e5c676" />
      </>
    );
  return (
    <>
      <Path d="M15 8q9 8 18 0v10l-9 8-9-8Z" fill="#c3b295" />
      <Path d="m24 20 13 9-5 12H16l-5-12Z" fill={color} />
      <Path
        d={
          itemId === 'held_seed'
            ? 'M24 36V25m0 7q-12-13-12-3 5 8 12 3m0-4q12-13 12-3-5 8-12 3'
            : itemId === 'held_charcoal'
              ? 'M24 24q-14 12-7 15 12 8 14-5-9 4-7-10Z'
              : itemId === 'held_boots'
                ? 'M17 31q7-16 14 0v6H17Z'
                : 'M24 24q-12 14 0 16 12-2 0-16Z'
        }
        fill="#fff2d1"
        strokeWidth={1.2}
      />
    </>
  );
}
