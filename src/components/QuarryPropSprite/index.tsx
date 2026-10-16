import Svg, { Path, Rect } from 'react-native-svg';

/** Small interactive quarry objects stay separate from the map and its collision. */
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
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x={3} y={28} width={27} height={3} fill="#211e25" opacity={0.4} />
      {kind === 'rock' ? (
        <>
          <Path d="M3 25 V16 H6 V9 H11 V5 H22 V8 H26 V14 H29 V26 H24 V29 H8 V27 Z" fill="#5d5b54" />
          <Path d="M5 16 L11 7 H21 L25 15 L19 23 H7 Z" fill="#aaa084" />
          <Path d="M11 7 L16 14 L25 15 L21 7 Z" fill="#d4c49b" />
          <Path d="M7 24 L16 16 L19 23 L25 17 L27 25 L22 27 H9 Z" fill="#807b68" />
          <Path d="M17 8 L14 14 L18 17 L14 23" fill="none" stroke="#494b47" strokeWidth={2} />
          <Rect x={8} y={13} width={4} height={2} fill="#e4d5ae" />
          <Rect x={23} y={23} width={3} height={2} fill="#bbb293" />
        </>
      ) : kind === 'door' ? (
        <>
          <Rect x={2} y={3} width={28} height={27} fill="#3c3e41" />
          <Rect x={4} y={4} width={24} height={25} fill="#81775e" />
          <Rect x={7} y={5} width={18} height={24} fill="#585d60" />
          {[8, 15, 22].map((y) => (
            <Rect key={y} x={8} y={y} width={16} height={3} fill="#818580" />
          ))}
          <Rect x={3} y={3} width={26} height={3} fill="#d4b774" />
          <Rect x={4} y={6} width={3} height={23} fill="#baa36d" />
          <Rect x={25} y={6} width={3} height={23} fill="#baa36d" />
          <Path d="M16 10 L20 16 L16 22 L12 16 Z" fill="#bea56d" />
          <Rect x={15} y={14} width={2} height={4} fill="#ead7a4" />
        </>
      ) : (
        <>
          <Rect x={6} y={24} width={23} height={5} fill="#51555a" />
          <Rect x={8} y={10} width={19} height={15} fill="#8c8268" />
          <Rect x={10} y={12} width={15} height={10} fill="#363f42" />
          <Rect x={8} y={9} width={19} height={3} fill="#d4bb7d" />
          <Rect x={11} y={14} width={6} height={5} fill={active ? '#85cbaa' : '#c59c68'} />
          <Rect x={19} y={15} width={4} height={2} fill="#dfcc8d" />
          {kind === 'weight' ? (
            <>
              <Path d={active ? 'M19 13 L25 5' : 'M19 13 L13 4'} stroke="#d2c4a4" strokeWidth={3} />
              <Rect
                x={active ? 23 : 10}
                y={3}
                width={5}
                height={4}
                fill={active ? '#91d4a3' : '#daaa70'}
              />
              <Rect x={4} y={19} width={5} height={7} fill="#b8ab85" />
            </>
          ) : (
            <>
              <Rect x={18} y={19} width={3} height={2} fill={active ? '#7bcc9d' : '#d98f6f'} />
              <Rect x={22} y={19} width={2} height={2} fill="#9da79b" />
              <Path d="M27 14 H30 V26 H27" stroke="#626a68" strokeWidth={2} fill="none" />
            </>
          )}
        </>
      )}
    </Svg>
  );
}
