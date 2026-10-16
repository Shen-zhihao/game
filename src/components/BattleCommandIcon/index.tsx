import Svg, { Circle, G, Path } from 'react-native-svg';
import { BagIllustration, ItemIcon } from '../ItemIcon';
import { sceneInk as c } from '../../content/sceneArt';

export function BattleCommandIcon({ name, size = 32 }: { name: string; size?: number }) {
  if (name === '背包') return <BagIllustration size={size} />;
  if (name === '精灵') return <ItemIcon itemId="ball" size={size} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <G stroke={c.outline} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {name === '逃跑' ? (
          <>
            <Path d="M8 16q9-5 15 4l3 8 14 4-2 8H14q-7 0-7-7Z" fill="#a5c6c5" />
            <Path d="M8 33h30M15 20l8-2m-7 8 9-2" fill="none" />
            <Path d="M3 12h8M2 20h4" stroke="#a6a28c" />
          </>
        ) : (
          <>
            <Path d="m11 37 6-7 5 4-6 7Z" fill="#b99a70" />
            <Path d="m16 28 17-20 8-1-1 9-19 18Z" fill="#d0d8cc" />
            <Path d="m18 25 9 9M23 27l11-13" fill="none" />
            <Circle cx={12} cy={38} r={3} fill="#edc878" />
            <Path d="m10 8 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill={c.gold} strokeWidth={1} />
          </>
        )}
      </G>
    </Svg>
  );
}
