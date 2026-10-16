import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { sceneInk as c } from '../../content/sceneArt';

export type CoastPropKind =
  'valve' | 'gate' | 'console' | 'lamp' | 'bottle' | 'net' | 'lens' | 'raft';
export function CoastPropSprite({
  kind,
  size,
  active = false,
}: {
  kind: CoastPropKind;
  size: number;
  active?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <Ellipse cx={24} cy={42} rx={20} ry={4} fill={c.outline} opacity={0.14} />
      <G stroke={c.outline} strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round">
        {kind === 'raft' ? (
          <>
            <Path d="M5 24q19-13 38 0l-5 15q-14 7-28 0Z" fill="#d6b68a" />
            <Path d="M10 27h28m-26 7h24" stroke="#f3dfb8" strokeWidth={3} />
          </>
        ) : kind === 'valve' ? (
          <>
            <Rect x={14} y={31} width={21} height={10} rx={3} fill="#b8c8b6" />
            <Path d="M24 21v16" stroke="#a6b5a0" strokeWidth={7} />
            <Circle cx={24} cy={20} r={13} fill={active ? '#eed6a0' : '#b7cfc5'} strokeWidth={3} />
            <Path d="M24 8v24M12 20h24" strokeWidth={2} />
            <Circle cx={24} cy={20} r={4} fill={c.paper} />
          </>
        ) : kind === 'gate' ? (
          <>
            <Path d="M6 42V13q18-17 36 0v29" fill="none" stroke="#d7bd8a" strokeWidth={7} />
            <Path
              d="M10 21h28m-28 11h28m-21-15v24m7-27v27m7-24v24"
              stroke="#9bbab3"
              strokeWidth={3}
            />
          </>
        ) : kind === 'lamp' ? (
          <>
            <Rect x={12} y={36} width={24} height={6} rx={3} fill="#c5baa0" />
            <Rect x={19} y={26} width={10} height={12} rx={2} fill={c.cream} />
            <Rect
              x={12}
              y={11}
              width={24}
              height={19}
              rx={4}
              fill={active ? '#f3d18b' : '#b1c6bd'}
            />
            <Path d="M9 12 24 4l15 8Z" fill="#d4a485" />
            <Path d="M20 13v15m8-15v15" stroke="#fff0c4" />
          </>
        ) : kind === 'bottle' ? (
          <>
            <Path d="M20 8h8v11q11 7 9 17-2 8-13 8S11 41 11 34q0-10 9-15Z" fill="#c6ded1" />
            <Rect x={18} y={5} width={12} height={6} rx={2} fill="#c7a77a" />
            <Rect x={17} y={25} width={14} height={12} rx={2} fill={c.paper} />
            <Path d="M20 29h8m-8 4h6" stroke="#b69d75" />
          </>
        ) : kind === 'net' ? (
          <>
            <Path d="m7 35 9-24q11 0 22 8l4 20q-15 7-35-4Z" fill={active ? '#e0e4cf' : '#b7c1ad'} />
            <Path
              d="m11 31 28-6m-25-7 26 14m-22-18-4 23m13-21-4 22m13-19-5 20"
              stroke="#ece0bd"
              strokeWidth={2}
            />
          </>
        ) : kind === 'lens' ? (
          <>
            <Rect x={7} y={18} width={34} height={23} rx={5} fill="#d1b185" />
            <Path d="M9 24h30" stroke="#f5dfb2" strokeWidth={3} />
            <Circle cx={24} cy={29} r={9} fill="#bad6d0" stroke="#f7e5bd" strokeWidth={3} />
            <Path d="m20 25 7 7" stroke={c.paper} strokeWidth={2} />
          </>
        ) : (
          <>
            <Path d="m9 18 27-7q5 12 5 25l-29 6Z" fill="#b5beb0" />
            <Path d="m14 21 18-5 3 12-19 4Z" fill={active ? '#d1ddae' : '#c3d9cd'} />
            <Circle cx={20} cy={36} r={2.5} fill={c.gold} />
            <Circle cx={30} cy={33} r={2.5} fill={c.paper} />
          </>
        )}
      </G>
    </Svg>
  );
}
