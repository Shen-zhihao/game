import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { sceneInk as c } from '../../content/sceneArt';

/** Small field objects follow the bag's outlined, flat illustration style. */
export function FieldPropIllustration({ cell, size }: { cell: number; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <Ellipse cx={32} cy={57} rx={23} ry={4} fill={c.outline} opacity={0.12} />
      <G stroke={c.outline} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
        {cell === 0 ? (
          <>
            <Path d="M29 27h6v30h-6Z" fill="#b99a70" />
            <Path d="M9 14h38l9 11-9 10H9Z" fill="#ead3a1" />
            <Path d="M15 20h23m-23 7h16" stroke="#a48250" />
            <Circle cx={44} cy={24} r={2} fill={c.gold} />
          </>
        ) : cell === 3 ? (
          <>
            <Rect x={10} y={23} width={44} height={32} rx={6} fill="#dba755" />
            <Path d="M10 32V22q22-22 44 0v10Z" fill="#f3ce7f" />
            <Path d="M12 33h40M20 17v37m24-37v37" stroke="#a87b3d" />
            <Rect x={27} y={28} width={10} height={13} rx={2} fill={c.paper} />
            <Circle cx={32} cy={34} r={1.5} fill={c.outline} />
          </>
        ) : cell === 4 ? (
          <>
            <Path d="m12 22 39 11v20L12 42Z" fill="#b99a70" />
            <Ellipse cx={13} cy={32} rx={8} ry={11} fill="#edd9ab" />
            <Ellipse cx={13} cy={32} rx={4} ry={6} fill="none" stroke="#ad8859" />
            <Path d="m24 29 21 6m-20 4 15 4" stroke="#96734e" />
            <Path d="M28 27q-4-13 5-17 10 9-5 17Z" fill={c.leaf} />
          </>
        ) : cell === 5 || cell === 6 ? (
          <>
            <Rect x={7} y={24} width={7} height={33} rx={2} fill="#b99a70" />
            <Rect x={50} y={24} width={7} height={33} rx={2} fill="#b99a70" />
            <Path d="M11 31h42v7H11Zm0 14h42v7H11Z" fill="#e8ce97" />
            <Path d="M7 23q25-27 50 0" fill="none" stroke={c.leafDark} strokeWidth={7} />
            <Path d="M15 15q-6-11 5-10m29 10q6-11-5-10" fill={c.leafLight} />
          </>
        ) : (
          <>
            <Path d="M18 14q14-8 28 0l4 38H14Z" fill="#c5c5ab" />
            <Path d="M21 18h22m-24 29h26" stroke="#e9e5cc" />
            <Path d="M32 22q-14 7 0 20 14-13 0-20Z" fill={c.gold} />
            <Path d="M32 27v9" stroke={c.paper} />
          </>
        )}
      </G>
    </Svg>
  );
}
