import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { sceneInk as c } from '../../content/sceneArt';
import type { FieldObjectKind } from '../../content/fieldProps';

const wood = '#c5a47d';
const lightWood = '#e4cba1';
const clay = '#cc977a';
const metal = '#aebdb5';
const tableKinds: FieldObjectKind[] = [
  'seedlings',
  'waterChannels',
  'circuit',
  'mining',
  'forge',
  'mirrors',
  'balance',
  'puzzle',
  'bread',
  'sail',
];

/** Grounded, readable objects use the same paper fills and brown outlines as the town art. */
export function FieldObjectIllustration({
  kind,
  size,
  active = false,
}: {
  kind: FieldObjectKind;
  size: number;
  active?: boolean;
}) {
  const table = tableKinds.includes(kind);
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      {kind !== 'tracks' && kind !== 'branch' && (
        <Ellipse cx={32} cy={57} rx={23} ry={3.5} fill={c.outline} opacity={0.13} />
      )}
      <G stroke={c.outline} strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round">
        {table && (
          <>
            <Path d="M10 39h6v17h-6Zm38 0h6v17h-6Z" fill={wood} />
            <Path d="M14 48h36" stroke={wood} strokeWidth={4} />
            <Rect x={5} y={33} width={54} height={10} rx={3} fill={wood} />
            <Path d="M5 33 11 24h42l6 9Z" fill={lightWood} />
            <Path d="M10 37h43" stroke="#f3dfbc" strokeWidth={1} />
          </>
        )}
        {kind === 'seedlings' ? (
          <>
            {[15, 32, 49].map((x, i) => (
              <G key={x}>
                <Path d={`M${x - 6} 25h12l-2 10h-8Z`} fill={clay} />
                <Ellipse cx={x} cy={25} rx={6} ry={2} fill="#94775a" />
                <Path
                  d={`M${x} 24v-9m0 6q-9-1-7-8 8 0 7 8m0-3q1-8 7-9 3 8-7 9`}
                  fill={i === 1 ? c.leafLight : c.leaf}
                />
              </G>
            ))}
            <Path d="M8 8q24-7 48 0l3 4H5Z" fill={c.cream} />
          </>
        ) : kind === 'waterChannels' ? (
          <>
            <Rect x={9} y={16} width={46} height={17} rx={3} fill="#c8d0aa" />
            <Path d="M12 22h13v7h15v-9h12" fill="none" stroke={wood} strokeWidth={7} />
            <Path
              d="M12 22h13v7h15v-9h12"
              fill="none"
              stroke={active ? c.water : '#e8dfbb'}
              strokeWidth={3.5}
            />
            <Path d="M13 14q-7-1-6-7 7-1 6 7m0 0q1-7 7-7 2 6-7 7" fill={c.leaf} />
            <Path d="M46 27h10l-2 9h-6Z" fill={clay} />
            <Path d="M51 27v-7m0 4q-7-1-6-6 6 0 6 6m0-3q1-6 6-5 0 5-6 5" fill={c.leaf} />
          </>
        ) : kind === 'circuit' ? (
          <>
            <Rect x={10} y={14} width={44} height={21} rx={4} fill={metal} />
            <Rect x={14} y={18} width={26} height={13} rx={2} fill="#dbe0c8" />
            <Path
              d="M17 22h10v6h10m-10-6v-4"
              fill="none"
              stroke={active ? c.gold : '#9aab8f'}
              strokeWidth={2.5}
            />
            {[17, 27, 37].map((x) => (
              <Circle key={x} cx={x} cy={x === 17 ? 22 : 28} r={2} fill={c.paper} strokeWidth={1} />
            ))}
            <Path d="M46 24v5h5v-5" fill={wood} />
            <Path d="M46 24q-5-7 2-9 8 0 3 9Z" fill={active ? '#f9d888' : c.cream} />
            <Path d="m44 8 2 3m9-1-2 2" stroke={c.gold} />
          </>
        ) : kind === 'mining' ? (
          <>
            <Path d="m11 31 1-15 11-8 16 3 8 13-6 9Z" fill="#c0b39a" />
            <Path d="m21 25 3-12 7 3 1 12Z" fill={c.water} />
            <Path d="m33 29 2-12 6 6-2 8Z" fill="#c6c7da" />
            <Path d="m46 18 8 13m-10-12 6-4 5 1" fill="none" stroke={wood} strokeWidth={3} />
            <Path d="m13 31 4-7 5 4-2 4Z" fill={c.cream} />
          </>
        ) : kind === 'bells' ? (
          <>
            <Path d="M9 55V12h46v43M6 55h12m28 0h12" fill="none" stroke={wood} strokeWidth={4} />
            {[18, 32, 46].map((x, i) => (
              <G key={x}>
                <Path d={`M${x} 14v${6 + i * 4}`} strokeWidth={1.2} />
                <Path
                  d={`M${x - 5} ${22 + i * 4}q5-7 10 0v9h-10Z`}
                  fill={i === 1 ? c.water : c.gold}
                />
                <Path d={`M${x} ${32 + i * 4}v4m-5-5h10`} />
              </G>
            ))}
          </>
        ) : kind === 'forge' ? (
          <>
            <Path d="M9 33V14q6-8 14 0v19Z" fill={clay} />
            <Path d="M13 31V21q4-5 7 0v10Z" fill="#705a49" />
            <Path d="M15 30q-3-4 2-9 0 4 3 5l-1 4Z" fill={c.gold} strokeWidth={1} />
            <Path d="M31 21h23l-5 6h-7l-1 5h7v4H31v-4h6v-6l-6-2Z" fill={metal} />
            <Path d="m44 11 7 9m-11-8 7-5 5 7-7 4Z" fill={wood} />
            <Path d="M43 28h7" stroke={c.gold} strokeWidth={2.5} />
          </>
        ) : kind === 'mirrors' ? (
          <>
            <Path
              d="M16 30 22 9m-4 17 11 6m12-1 4-17m-7 18h13"
              fill="none"
              stroke={wood}
              strokeWidth={3}
            />
            <Ellipse cx={25} cy={17} rx={8} ry={12} fill={c.water} transform="rotate(20 25 17)" />
            <Path d="m23 12 3 9" stroke={c.paper} strokeWidth={2} />
            <Ellipse cx={44} cy={20} rx={6} ry={8} fill={c.water} transform="rotate(-20 44 20)" />
            <Path d="M9 19h6m20 7h5" stroke={c.gold} strokeWidth={2} />
            <Path d="M47 31h7v3h-7Z" fill={c.gold} />
          </>
        ) : kind === 'balance' ? (
          <>
            <Path d="M32 10v23m-9 2h18M12 16h40" stroke={wood} strokeWidth={3} />
            <Circle cx={32} cy={13} r={3} fill={c.gold} />
            <Path d="m16 17-7 13h14Zm32 0-7 13h14Z" fill="none" strokeWidth={1} />
            <Path d="M8 30q8 10 16 0Zm32 0q8 10 16 0Z" fill={c.gold} />
            <Path d="M13 25h6v5h-6m32-5h6v5h-6" fill={metal} />
          </>
        ) : kind === 'puzzle' ? (
          <>
            <Path d="M10 31 14 9h36l4 22Z" fill={wood} />
            {Array.from({ length: 8 }, (_, i) => (
              <Rect
                key={i}
                x={17 + (i % 3) * 10}
                y={12 + Math.floor(i / 3) * 6}
                width={8}
                height={5}
                rx={1}
                fill={[c.leafLight, c.water, c.cream][i % 3]}
                strokeWidth={0.8}
              />
            ))}
            <Path d="m19 14 2 1m8-1h2m8 0 2 1" strokeWidth={0.8} />
          </>
        ) : kind === 'weight' ? (
          <>
            <Rect x={8} y={42} width={48} height={13} rx={3} fill={metal} />
            <Rect x={12} y={38} width={40} height={9} rx={3} fill={lightWood} />
            <Path d="M19 38 16 25l8-10h16l8 12-4 11Z" fill="#b5ad96" />
            <Path d="M27 16v-5q5-5 10 0v5m-14 9h17" fill="none" strokeWidth={2.5} />
            <Circle cx={32} cy={31} r={4} fill={active ? c.leaf : c.gold} />
          </>
        ) : kind === 'bread' ? (
          <>
            <Path d="M10 28 16 18h32l6 10-3 6H13Z" fill="#c5b59a" />
            {[21, 39].map((x) => (
              <G key={x}>
                <Path d={`M${x - 8} 27q-3-16 8-17 12 1 8 17Z`} fill="#edc17c" />
                <Path d={`m${x - 4} 16 3 4m3-4 3 4`} stroke="#b58b53" />
              </G>
            ))}
            <Path d="M8 9h9m-9 4h6" stroke={c.paper} strokeWidth={2} />
          </>
        ) : kind === 'sail' ? (
          <>
            <Path d="M11 29 29 9l21 20Z" fill={c.paper} />
            <Path d="M29 9v22m-11-6 6-6m10 5 5 4" stroke="#b1c8c4" />
            <Path d="m45 17 7 11" stroke={wood} strokeWidth={3} />
            <Ellipse cx={14} cy={31} rx={5} ry={3} fill={c.cream} />
          </>
        ) : kind === 'branch' ? (
          <>
            <Path
              d="m11 44 19-8 3 3 9-5 12-2m-24 4-7-11m18 10 2-9"
              fill="none"
              stroke={wood}
              strokeWidth={5}
            />
            <Path d="m30 36 3-3m0 6 3-3" stroke={c.cream} />
            <Path d="M22 28q-9 0-8-8 9-1 8 8" fill={c.leaf} />
          </>
        ) : kind === 'tracks' ? (
          <>
            {[
              { x: 24, y: 42 },
              { x: 41, y: 24 },
            ].map(({ x, y }) => (
              <G key={x} fill="#ac9873" stroke="none" opacity={0.85}>
                <Ellipse cx={x} cy={y} rx={5} ry={7} transform={`rotate(24 ${x} ${y})`} />
                <Circle cx={x - 5} cy={y - 9} r={2.4} />
                <Circle cx={x + 1} cy={y - 11} r={2.4} />
                <Circle cx={x + 6} cy={y - 8} r={2.4} />
              </G>
            ))}
          </>
        ) : kind === 'journal' ? (
          <>
            <Path d="M14 26h36l-4 29H18Z" fill={wood} />
            <Path d="m8 26 5-15q10-5 19 0 10-5 20 0l5 15q-13-3-25 3-12-6-24-3Z" fill={c.paper} />
            <Path
              d="M32 12v17m-16-12 10 1m-11 4 11 1m12-6 9-1m-8 7 10-2"
              fill="none"
              stroke="#b6a080"
              strokeWidth={1.2}
            />
            <Path d="M32 28v6l5-3v-5" fill={clay} strokeWidth={1} />
          </>
        ) : kind === 'chart' ? (
          <>
            <Path d="m16 55 9-43m23 43-9-43M20 45h24" fill="none" stroke={wood} strokeWidth={3} />
            <Path d="M11 10h43l-5 29H8Z" fill={c.paper} />
            <Path
              d="m15 18 9 4 8-7 13 5-3 11-11-4-10 6-7-5Z"
              fill={c.leafLight}
              stroke="#a7b697"
              strokeWidth={1}
            />
            <Path d="m18 29 10-6 6 2 10-6" fill="none" stroke={c.water} strokeWidth={2} />
            <Circle cx={34} cy={25} r={2} fill={c.gold} strokeWidth={1} />
            <Path d="M8 40h44" stroke={wood} strokeWidth={3} />
          </>
        ) : kind === 'gauge' ? (
          <>
            <Rect x={18} y={48} width={28} height={7} rx={3} fill={wood} />
            <Path d="M29 35h6v14h-6Z" fill={metal} />
            <Circle cx={32} cy={23} r={17} fill={c.cream} />
            <Circle cx={32} cy={23} r={12} fill={c.paper} strokeWidth={1} />
            <Path d="M22 23h3m7-10v3m10 7h-3m-7 0 7-6" fill="none" strokeWidth={2} />
            <Circle cx={32} cy={23} r={2} fill={c.gold} />
            <Path d="M26 30h12" stroke={c.water} strokeWidth={2} />
          </>
        ) : kind === 'weatherVane' ? (
          <>
            <Path d="M23 55h18M32 54V9m-18 9h38" stroke={wood} strokeWidth={3} />
            <Path d="m11 18 9-5v10Zm34-6 9 6-9 6Z" fill={clay} />
            <Path d="M32 34 17 43m15-9 16 9" strokeWidth={2} />
            <Ellipse cx={17} cy={43} rx={7} ry={3} fill={metal} />
            <Ellipse cx={48} cy={43} rx={7} ry={3} fill={metal} />
            <Circle cx={32} cy={9} r={3} fill={c.gold} />
          </>
        ) : kind === 'kite' ? (
          <>
            <Path d="m30 9 19 14-14 21-17-16Z" fill={c.cream} />
            <Path d="m30 9 5 35m-17-16 31-5" stroke={wood} />
            <Path d="m30 10 4 17 14-4Z" fill={c.water} stroke="none" />
            <Path d="M35 44q-16 7-21-1-7-9 4-10" fill="none" strokeWidth={1} />
            <Path d="m23 47-4-5-2 6m-3-7-5-3 1 6" fill={clay} strokeWidth={1} />
          </>
        ) : kind === 'crystal' ? (
          <>
            <Path d="m10 53-2-14 10-9 27-2 11 16-4 10Z" fill="#c0b39a" />
            <Path d="m19 45-3-22 10-13 9 15-5 22Z" fill={c.water} />
            <Path d="m34 45-2-17 11-13 8 12-7 21Z" fill="#c5bfd2" />
            <Path d="m26 13-1 27m18-22-5 22" stroke={c.paper} strokeWidth={1.5} />
          </>
        ) : kind === 'crate' || kind === 'toolbox' ? (
          <>
            <Rect
              x={10}
              y={22}
              width={44}
              height={31}
              rx={4}
              fill={kind === 'crate' ? lightWood : clay}
            />
            <Path d="M10 30h44m-35-7v29m26-29v29" stroke="#a28663" />
            {kind === 'toolbox' ? (
              <>
                <Path d="M24 22v-7h16v7" fill="none" strokeWidth={3} />
                <Rect x={28} y={28} width={9} height={10} rx={2} fill={c.cream} />
                <Path d="m13 12 9 7m-11-8 4-4m-1 2 4 4m26 3 5-7" stroke={metal} strokeWidth={3} />
              </>
            ) : (
              <>
                <Path d="m24 33 17 4-3 12-17-4Z" fill={c.paper} strokeWidth={1} />
                <Path d="m27 38 9 2m-10 2 6 1" strokeWidth={1} />
              </>
            )}
          </>
        ) : kind === 'observation' ? (
          <>
            <Path d="M19 55 29 32m16 23L34 32m-3 1v22" fill="none" stroke={wood} strokeWidth={3} />
            <Path d="m15 20 27-9 5 15-27 9Z" fill={metal} />
            <Ellipse cx={45} cy={18} rx={5} ry={8} fill={c.water} transform="rotate(-18 45 18)" />
            <Path d="m16 21 5 14-6 2-5-14Z" fill={wood} />
            <Path d="m37 14 3 14" stroke={c.paper} />
          </>
        ) : (
          <>
            <Path d="m14 54 2-34 7-11h22l5 45Z" fill="#c4bfa8" />
            <Path
              d="m23 15 16-1m-18 8h20m-19 8h18m-17 8h17m-18 8h17"
              stroke="#f2e6c9"
              strokeWidth={2}
            />
            <Path d="M14 54h36" stroke={wood} strokeWidth={3} />
            <Path
              d="M12 53q-5-7 1-11 6 3 4 11m30-2q1-9 8-7 2 7-8 7"
              fill={c.leaf}
              strokeWidth={1}
            />
          </>
        )}
      </G>
    </Svg>
  );
}
