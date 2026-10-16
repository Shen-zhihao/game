import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { sceneInk as c } from '../../content/sceneArt';

/** Collision objects use the same warm outlines as their illustrated surroundings. */
export function QuarryPropSprite({
  kind,
  size,
  active = false,
}: {
  kind: 'rock' | 'door' | 'weight' | 'console';
  size: number;
  active?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <Ellipse cx={24} cy={42} rx={20} ry={4} fill={c.outline} opacity={0.14} />
      <G stroke={c.outline} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {kind === 'rock' ? (
          <>
            <Path d="M5 38 4 25 13 10Q23 4 34 11l10 17-4 13-26 2Z" fill="#bfb49d" />
            <Path d="m10 25 9-12 12-1 8 13-17 9Z" fill="#d9ceb5" strokeWidth={1} />
            <Path d="m25 11-5 13 7 5-6 11" fill="none" />
          </>
        ) : kind === 'door' ? (
          <>
            <Path d="M5 42V13Q24-3 43 13v29Z" fill="#d4c5a5" />
            <Path d="M11 42V16q13-10 26 0v26Z" fill="#b3b9a1" />
            <Path d="M13 25h22m-22 9h22" stroke="#e8d8af" strokeWidth={3} />
            <Path d="m24 17 6 7-6 7-6-7Z" fill={c.gold} />
          </>
        ) : (
          <>
            <Rect x={7} y={16} width={34} height={24} rx={5} fill="#c9b99a" />
            <Rect
              x={12}
              y={20}
              width={24}
              height={13}
              rx={3}
              fill={active ? '#c4d7ae' : '#eedab3'}
            />
            <Path d="M10 38h28" stroke="#a38b67" />
            {kind === 'weight' ? (
              <>
                <Path d={active ? 'm24 20 10-14' : 'm24 20-11-14'} strokeWidth={3} />
                <Circle cx={active ? 34 : 13} cy={6} r={4} fill={c.gold} />
              </>
            ) : (
              <>
                <Circle cx={18} cy={26} r={3} fill={c.gold} />
                <Path d="M25 24h6m-6 5h4" />
              </>
            )}
          </>
        )}
      </G>
    </Svg>
  );
}
