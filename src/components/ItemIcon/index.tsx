import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { ITEMS, type ItemPocket } from '../../content/catalog';
import { EvolutionMaterial } from './EvolutionMaterial';
import { HeldTrinket } from './HeldTrinket';
import { isHeldItem } from '../../content/battleTraits';

const outline = '#554536';
export function BagIllustration({ size = 128 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" aria-hidden>
      <Ellipse cx={80} cy={145} rx={46} ry={7} fill="#a77b3f" opacity={0.12} />
      <G stroke={outline} strokeWidth={3.5} strokeLinejoin="round">
        <Path d="M55 39V28c0-22 50-22 50 0v11" fill="none" />
        <Path d="M61 34v-8c0-12 38-12 38 0v8" fill="none" stroke="#bc8844" />
        <Rect x={28} y={70} width={22} height={54} rx={9} fill="#c98b3e" />
        <Rect x={110} y={70} width={22} height={54} rx={9} fill="#c98b3e" />
        <Path d="M43 44q37-19 74 0l6 78q0 18-20 19H57q-20-1-20-19Z" fill="#e9b34f" />
        <Path d="M43 44q37-20 74 0l-2 30q-35 18-70 0Z" fill="#f8d786" />
        <Path d="M49 49q31-13 62 0" fill="none" stroke="#fff0c4" strokeWidth={4} />
        <Rect x={49} y={91} width={62} height={36} rx={10} fill="#f5cc72" />
        <Path d="M52 101h56" stroke="#b67c36" strokeWidth={2} />
        <Path d="M98 101v8" strokeWidth={3} strokeLinecap="round" />
        <Rect x={72} y={64} width={16} height={25} rx={4} fill="#8c6748" />
        <Rect x={76} y={71} width={8} height={10} rx={2} fill="#ffe8a7" strokeWidth={2} />
        <Circle cx={80} cy={114} r={5} fill="#fff3cb" strokeWidth={2} />
      </G>
    </Svg>
  );
}

export function ItemIcon({ itemId, size = 32 }: { itemId: string; size?: number }) {
  const pocket = ITEMS[itemId]?.pocket ?? 'key';
  const bottle =
    (pocket === 'medicine' && itemId !== 'revive') || ['respec', 'skill_copy'].includes(itemId);
  const color =
    (
      {
        potion: '#80b69c',
        super_potion: '#81b8d6',
        hyper_potion: '#e5a16c',
        antidote: '#e5c768',
        ether: '#ae9cd4',
        respec: '#df9b9e',
        skill_copy: '#b1a2df',
        ball: '#dc826c',
        great_ball: '#78a9d0',
        ultra_ball: '#dcad43',
        master_ball: '#a28bcc',
      } as Record<string, string>
    )[itemId] ?? '#a6bfc3';
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <Ellipse cx={24} cy={43} rx={14} ry={3} fill="#64513b" opacity={0.1} />
      <G stroke={outline} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
        {isHeldItem(itemId) ? (
          <HeldTrinket itemId={itemId} />
        ) : pocket === 'balls' ? (
          <>
            <Circle cx={24} cy={25} r={16} fill="#fff9eb" />
            <Path d="M8 25a16 16 0 0 1 32 0Z" fill={color} />
            <Path d="M9 25h30" />
            <Circle cx={24} cy={25} r={5} fill="#fff9eb" />
            <Circle cx={24} cy={25} r={2} fill="#e5d8bf" stroke="none" />
            <Path d="M15 17q3-4 7-4" stroke="#fff9eb" opacity={0.8} />
            {itemId === 'ultra_ball' && (
              <Path d="M17 10v9m14-9v9" stroke="#554536" strokeWidth={3} />
            )}
            {itemId === 'master_ball' && (
              <Path d="m20 15 4-4 4 4-4 3Z" fill="#fff1c9" stroke="none" />
            )}
          </>
        ) : bottle ? (
          <>
            <Path d="M18 13v5l-6 7v12q0 4 5 4h14q5 0 5-4V25l-6-7v-5" fill="#f9f5e9" />
            <Path d="M15 27h18v10H15Z" fill={color} stroke="none" />
            <Rect x={17} y={7} width={14} height={8} rx={2} fill={color} />
            <Path d="M20 9h8" stroke="#fffdf5" opacity={0.7} />
            <Rect x={18} y={25} width={12} height={12} rx={3} fill="#fff7df" strokeWidth={1.3} />
            {itemId === 'skill_copy' ? (
              <Path d="m22 27 4 4-4 4m4-8 4 4-4 4" fill="none" stroke="#8c79ae" strokeWidth={1.5} />
            ) : itemId === 'respec' ? (
              <Path
                d="M21 30a4 4 0 1 1 0 4m0-7v4h4"
                fill="none"
                stroke="#ba777b"
                strokeWidth={1.5}
              />
            ) : (
              <Path d="M24 28v6m-3-3h6" stroke={color} strokeWidth={2.5} />
            )}
            <Path d="M16 24v10" stroke="white" opacity={0.8} />
          </>
        ) : itemId === 'candy' || itemId === 'revive' ? (
          <>
            <Path
              d="M23 18c-19-7-20 20-4 22 10 8 27-17 10-23Z"
              fill={itemId === 'revive' ? '#e7cd78' : '#df98a3'}
            />
            <Path d="M24 20q-8-13 6-14 6 8-6 14Z" fill="#8fb494" />
            <Path d="M23 18q-4-9-10-8" fill="none" />
            <Path d="M15 25q-2 6 2 8" stroke="#fff8df" />
          </>
        ) : pocket === 'evolution' ? (
          <EvolutionMaterial itemId={itemId} />
        ) : itemId.includes('manual') ? (
          <>
            <Path d="M11 9h22q5 0 5 5v27H15q-5 0-5-5Z" fill="#ceab80" />
            <Path d="M16 10v27m0-2h22" fill="none" />
            <Path d="m23 19 6-4 6 4-6 4Z" fill="#fff1d1" strokeWidth={1.3} />
          </>
        ) : itemId.includes('glider') ? (
          <>
            <Path d="M24 10 4 31l16-3 4 11 4-11 16 3Z" fill="#d9c291" />
            <Path d="m24 10-4 18m4-18 4 18m-4-18v29" fill="none" />
          </>
        ) : itemId.includes('water') ? (
          <>
            <Path d="M15 11q9-7 18 0l4 27H11Z" fill="#9bbbc5" />
            <Path d="M17 9V6h14v3m-14 7h14m-17 8h20" fill="none" />
            <Path d="m24 24-4 7h8Z" fill="#fff5d3" strokeWidth={1.3} />
          </>
        ) : itemId.includes('heat') ? (
          <>
            <Path d="m16 11 8-4 8 4 9 10-7 6-4-4v18H18V23l-4 4-7-6Z" fill="#d7a27e" />
            <Path d="M24 8v32m-7-11h14" fill="none" />
          </>
        ) : itemId.includes('breaker') || itemId.includes('cut') ? (
          <>
            <Path d="m14 39 15-24" stroke="#ba986a" strokeWidth={7} />
            <Path d="M10 15q17-14 30 3l-13-1-8 8Z" fill="#a3b8bd" />
          </>
        ) : (
          <>
            <Circle cx={18} cy={17} r={10} fill="#e5c374" />
            <Circle cx={18} cy={17} r={4} fill="#fff6df" />
            <Path d="m24 24 13 13-4 4-5-5 3-3-7-7" fill="#e5c374" />
          </>
        )}
      </G>
    </Svg>
  );
}

export function PocketIcon({ pocket, size = 25 }: { pocket: ItemPocket | 'all'; size?: number }) {
  if (pocket === 'all') return <BagIllustration size={size} />;
  const ids = {
    balls: 'ball',
    medicine: 'potion',
    training: 'candy',
    evolution: 'moon_shard',
    key: 'key_ruin_key',
    held: 'held_band',
  };
  return <ItemIcon itemId={ids[pocket]} size={size} />;
}
