import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { CITY_IDENTITIES, cityLayout } from '../../content/cityDistricts';
import {
  PRODUCTION_DECORATIONS,
  type ProductionDecorationId,
} from '../../content/productionRewards';
import { sceneInk as c } from '../../content/sceneArt';
import type { GameState } from '../../game/model';

function DecorationIllustration({ id, size }: { id: ProductionDecorationId; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <Ellipse cx={32} cy={57} rx={23} ry={3} fill={c.outline} opacity={0.14} />
      <G stroke={c.outline} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
        {id === 'flower_box' ? (
          <>
            <Path d="M20 39V23m12 17V17m12 23V25" fill="none" stroke={c.leafDark} strokeWidth={2} />
            <Path
              d="M20 34q-12-1-10-9 10 0 10 9m12-6q10-1 10-8-10 0-10 8m11 9q10-2 11-9-10 0-11 9m-12 3q-11-2-11-9 10 0 11 9"
              fill={c.leaf}
              stroke={c.leafDark}
              strokeWidth={1}
            />
            <Path d="M19 26q-8 0-6-6-4-6 2-8 3-5 7 0 7-1 7 5 2 6-5 7-2 5-5 2Z" fill="#dba18d" />
            <Path d="M32 21q-6 3-8-3-6-3-1-7 0-6 6-5 5-5 8 1 7 1 4 7 1 6-6 6Z" fill={c.cream} />
            <Path d="M44 29q-7 1-7-5-5-4 0-8 2-5 7-2 6-2 8 4 5 4-1 8-1 6-7 3Z" fill="#b7cad5" />
            <Circle cx={20} cy={18} r={3} fill={c.gold} strokeWidth={1} />
            <Circle cx={31} cy={13} r={3} fill={c.gold} strokeWidth={1} />
            <Circle cx={44} cy={22} r={3} fill={c.cream} strokeWidth={1} />
            <Path d="m9 39 4 16h38l4-16Z" fill="#c6a06e" />
            <Rect x={8} y={35} width={48} height={7} rx={2} fill="#dbc099" />
            <Path d="M14 47h36m-30-4 1 10m22-10-1 10" stroke="#ead6b4" />
            <Path d="M28 51v-6m0 2 4-3m-4 6-4-3" fill="none" stroke={c.outline} strokeWidth={1} />
          </>
        ) : id === 'pennant' ? (
          <>
            <Path d="M10 54V11m44 43V11" fill="none" stroke="#b69772" strokeWidth={3} />
            <Circle cx={10} cy={10} r={3} fill={c.gold} />
            <Circle cx={54} cy={10} r={3} fill={c.gold} />
            <Path d="M10 16q22 10 44 0" fill="none" />
            <Path d="m12 17 11 3-7 13Z" fill={c.leafLight} />
            <Path d="m27 22 11-1-5 16Z" fill="#dba18d" />
            <Path d="m42 20 10-3-3 16Z" fill={c.water} />
            <Path d="m17 22 1 4m-1-3-2-1m3 2 2-1" fill="none" strokeWidth={0.9} />
            <Path d="m32 25-2 4 3 3 2-4Z" fill={c.cream} strokeWidth={0.8} />
            <Path d="m45 24 2-1 2 1m-3 3 2-1 2 1" fill="none" strokeWidth={0.9} />
            <Path d="m6 55 4-4 4 4m36 0 4-4 4 4" fill="#b69772" />
            <Path d="m9 44 4-2m40-5 4-2" stroke={c.cream} />
          </>
        ) : (
          <>
            <Ellipse cx={32} cy={29} rx={23} ry={24} fill={c.gold} opacity={0.13} stroke="none" />
            <Path d="M32 54V7m-21 8q21-12 42 0" fill="none" stroke="#a88b68" strokeWidth={3} />
            <Path d="M13 15v9m19-15v7m19-1v9" fill="none" />
            <Rect x={6} y={24} width={14} height={18} rx={5} fill="#ecd494" />
            <Rect x={24} y={16} width={16} height={22} rx={6} fill="#eab48c" />
            <Rect x={44} y={24} width={14} height={18} rx={5} fill="#c2d4bc" />
            <Path
              d="M10 24h6m-6 18h6m12-26h8m-8 22h8m12-14h6m-6 18h6"
              stroke="#a88b68"
              strokeWidth={2}
            />
            <Path d="M13 27v12m19-20v16m19-8v12" stroke={c.paper} strokeWidth={2} />
            <Path d="M13 43v4m19-8v5m19-1v4" stroke={c.gold} strokeWidth={2} />
            <Path d="m23 55 5-6h8l5 6Z" fill="#c6b69c" />
            <Path d="M27 54h10" stroke={c.cream} />
          </>
        )}
      </G>
    </Svg>
  );
}

/** Pure presentation: no claims, currency changes, collision tiles, or interaction targets. */
export function ProductionRewards({ game, scale }: { game: GameState; scale: number }) {
  const town = game.player.map;
  if (town !== 'dawn' && town !== 'stone' && town !== 'harbor') return null;
  const selected = game.production?.presentation?.decorations[town];
  const decoration = PRODUCTION_DECORATIONS.find((entry) => entry.id === selected);
  const stamps = game.production?.collection.stamps ?? 0;
  if (!decoration || !(stamps >= decoration.stamps)) return null;
  const layout = cityLayout(town);
  // Northeast lawn, separate from the first-delivery keepsake west of the garden bridge.
  const x = layout.gardenX + 2;
  const y = layout.gardenY - 2;
  const nearby = Math.abs(game.player.x - x) + Math.abs(game.player.y - y) <= 6;
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityLabel={`${CITY_IDENTITIES[town].quarters[2]}的${decoration.name}，累计手作印花解锁的可选摆设`}
      testID={`production-decoration-${decoration.id}`}
      style={{
        position: 'absolute',
        left: (x * 32 - 4) * scale,
        top: (y * 32 - 8) * scale,
        width: 40 * scale,
        height: 40 * scale,
        zIndex: y * 10,
      }}
    >
      <DecorationIllustration id={decoration.id} size={40 * scale} />
      {nearby && (
        <Text
          testID={`production-decoration-label-${decoration.id}`}
          numberOfLines={1}
          style={{
            position: 'absolute',
            top: 40 * scale,
            left: -20 * scale,
            width: 80 * scale,
            borderRadius: 4 * scale,
            paddingVertical: 2 * scale,
            backgroundColor: '#faf1dded',
            color: c.outline,
            fontSize: 9 * scale,
            lineHeight: 12 * scale,
            textAlign: 'center',
            fontWeight: '700',
          }}
        >
          {decoration.name}
        </Text>
      )}
    </View>
  );
}
