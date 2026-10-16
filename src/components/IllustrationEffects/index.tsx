import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { sceneInk as ink } from '../../content/sceneArt';

export function PaperHalo({ size = 280 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 280 280" aria-hidden>
      <Circle cx={140} cy={140} r={126} fill={ink.paper} fillOpacity={0.64} />
      <Circle
        cx={140}
        cy={140}
        r={106}
        fill="none"
        stroke={ink.gold}
        strokeWidth={2}
        strokeDasharray="5 10"
      />
      <Circle cx={140} cy={140} r={90} fill="none" stroke={ink.gold} strokeOpacity={0.4} />
      {Array.from({ length: 8 }, (_, i) => (
        <G key={i} transform={`rotate(${i * 45} 140 140)`}>
          <Path
            d="m140 8 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z"
            fill={ink.gold}
            stroke={ink.outline}
            strokeWidth={1}
          />
        </G>
      ))}
    </Svg>
  );
}
export function JourneyBadge({
  size = 150,
  champion = false,
}: {
  size?: number;
  champion?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" aria-hidden>
      <Ellipse cx={80} cy={143} rx={48} ry={7} fill={ink.outline} opacity={0.12} />
      <Path
        d="m50 91-13 48 25-12 15 17 9-51m24-2 13 48-25-12-15 17-9-51"
        fill="#c99356"
        stroke={ink.outline}
        strokeWidth={3}
      />
      <Path
        d="m80 10 16 12 20 1 7 18 15 14-5 21 2 19-18 11-11 16-22-2-19 4-13-16-19-8 1-21-7-19 14-16 5-20 21-3Z"
        fill={ink.gold}
        stroke={ink.outline}
        strokeWidth={3}
      />
      <Circle cx={80} cy={67} r={38} fill="#f8d786" stroke={ink.paper} strokeWidth={3} />
      {champion ? (
        <Path
          d="m52 75-8-30 22 13 14-25 14 25 22-13-8 30Zm1 8h54"
          fill={ink.paper}
          stroke={ink.outline}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      ) : (
        <Path
          d="m80 37 9 18 20 3-15 15 4 20-18-9-18 9 4-20-15-15 20-3Z"
          fill={ink.paper}
          stroke={ink.outline}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      )}
      <Path
        d="M54 36q15-13 33-9"
        stroke={ink.paper}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
export function HealingMachine({ size = 260 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.58} viewBox="0 0 260 150" aria-hidden>
      <Ellipse cx={130} cy={137} rx={107} ry={10} fill={ink.outline} opacity={0.12} />
      <Rect
        x={21}
        y={48}
        width={218}
        height={80}
        rx={19}
        fill="#ead4ac"
        stroke={ink.outline}
        strokeWidth={3}
      />
      <Path
        d="M21 69q0-21 22-21h174q22 0 22 21v22H21Z"
        fill="#f8d786"
        stroke={ink.outline}
        strokeWidth={3}
      />
      <Rect
        x={62}
        y={17}
        width={136}
        height={51}
        rx={12}
        fill={ink.paper}
        stroke={ink.outline}
        strokeWidth={3}
      />
      <Path d="M123 29h14v10h10v14h-10v10h-14V53h-10V39h10Z" fill={ink.gold} />
      <Path d="M46 105h168" stroke={ink.outline} strokeOpacity={0.3} strokeWidth={3} />
      {[50, 82, 114, 146, 178, 210].map((x) => (
        <Circle
          key={x}
          cx={x}
          cy={79}
          r={9}
          fill={ink.paper}
          stroke={ink.outline}
          strokeWidth={1.6}
        />
      ))}
    </Svg>
  );
}
export function FieldObject({
  effect,
  size = 130,
}: {
  effect: 'rock' | 'log' | 'cut' | 'gate' | 'surfEnter' | 'surfExit';
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" aria-hidden>
      {effect === 'rock' ? (
        <G stroke={ink.outline} strokeWidth={3} strokeLinejoin="round">
          <Path d="m25 122-7-43 30-42 49-9 38 37 10 57Z" fill="#c9baa0" />
          <Path d="m48 37 19 42-12 43m42-94-9 41 47-4M67 79l21-10 30 53" fill="none" />
          <Path d="m25 112 30 10m63-7 20-10" stroke={ink.paper} />
        </G>
      ) : effect === 'log' || effect === 'cut' ? (
        <G stroke={ink.outline} strokeWidth={3}>
          <Path d="M25 110V71q33-24 98-23l12 48Z" fill="#b58c60" />
          <Ellipse cx={126} cy={73} rx={20} ry={25} fill="#ebd1a2" />
          <Ellipse cx={126} cy={73} rx={10} ry={15} fill="none" />
          <Path d="m42 71 46-10m-42 26 53-10" fill="none" />
          <Path d="M45 61q-17-40 13-38 25 4-13 38" fill="#b8c694" />
        </G>
      ) : effect === 'gate' ? (
        <G stroke={ink.outline} strokeWidth={3}>
          <Rect x={26} y={25} width={108} height={112} rx={9} fill="#e6d7bc" />
          <Path d="M45 129V44h70v85" fill={ink.paper} />
          {[60, 80, 100].map((x) => (
            <Line key={x} x1={x} x2={x} y1={45} y2={128} />
          ))}
          <Circle cx={80} cy={87} r={15} fill={ink.gold} />
          <Path d="m74 87 5 5 10-12" fill="none" />
        </G>
      ) : (
        <G stroke={ink.outline} strokeWidth={2.5} strokeLinecap="round">
          <Ellipse cx={80} cy={99} rx={66} ry={27} fill={ink.water} stroke="none" />
          <Path d="m37 83 68-26 21 30-67 31Z" fill="#f1d694" />
          <Path d="m51 85 57-21m-46 38 54-20" stroke="#b98b4d" />
          <Path
            d="M18 111q14 8 28 0m10 18q20 8 40 0m13-18q17 8 34 0"
            fill="none"
            stroke={ink.paper}
            strokeWidth={4}
          />
        </G>
      )}
    </Svg>
  );
}
