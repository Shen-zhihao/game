import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { sceneInk as c } from '../../content/sceneArt';
import { MAPS } from '../../content/world';
import { cityProductionMilestone } from '../../game/cityDistricts';
import { dayPeriodFor } from '../../game/calendar';
import type { GameState, TownId } from '../../game/model';

type MilestoneId = 'dawn_picnic' | 'echo_lamp' | 'tide_mosaic';

function MilestoneIllustration({ id, size }: { id: MilestoneId; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <Ellipse cx={32} cy={57} rx={22} ry={3} fill={c.outline} opacity={0.15} />
      <G stroke={c.outline} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
        {id === 'dawn_picnic' ? (
          <>
            <Path d="m8 47 11-8 37 8-11 12Z" fill="#efe2c7" />
            <Path d="m14 47 36 7m-28-12 24 15m-16-14 9 14" stroke="#cb907b" strokeWidth={2} />
            <Path d="M15 33q1-23 17-23 16 0 17 23" fill="none" stroke="#b28d62" strokeWidth={5} />
            <Path d="m14 31 5 21h27l5-21Z" fill="#c6a06e" />
            <Path d="M15 33h35m-31 7h28m-25 6h22m-19-12 2 16m7-16v16m7-16-2 16" stroke="#e5c591" />
            <Path d="M20 30q-5-15 4-16 9 0 8 16" fill="#edc17c" />
            <Path d="m23 19 4 3m-4 3 5 3" stroke="#ac8050" />
            <Path d="M35 30q-4-12 6-14 9 1 5 15" fill="#e9bd7b" />
            <Path d="M31 29q-7-10-12-4 2 8 12 4m0 1q6-11 12-5-1 8-12 5" fill={c.leaf} />
            <Path d="M14 31h37l-8 9-12-7-9 6Z" fill={c.paper} />
          </>
        ) : id === 'echo_lamp' ? (
          <>
            <Circle cx={32} cy={26} r={22} fill="#f7dea0" stroke="none" opacity={0.25} />
            <Path d="m15 48 7-7h21l6 7-3 7H18Z" fill="#b9b09d" />
            <Path d="m21 47 22 1m-19 3h15" stroke="#e6dcc6" />
            <Path d="M28 35h8v10h-8Z" fill="#c9ac7a" />
            <Path d="m17 28 6-16 11-5 13 13-4 17-12 6-11-7Z" fill="#a8d0c8" />
            <Path
              d="m23 12 9 14 2-19m-2 19 15-6m-15 6 11 11m-11-11-1 17m1-17-12 10"
              fill="none"
              stroke="#f9e9b9"
            />
            <Path d="m25 17 5 7-3 10 8-6 5 4-3-13-5-3Z" fill="#f7dfa0" stroke="none" />
            <Path d="M11 23H7m47 0h4M15 9l-3-3m38 3 3-3" stroke="#e0bb69" strokeWidth={2} />
          </>
        ) : (
          <>
            <Path
              d="m17 56 6-26m25 26-7-26M19 50h26"
              fill="none"
              stroke="#b69772"
              strokeWidth={3}
            />
            <Rect x={10} y={9} width={44} height={38} rx={3} fill="#cfad84" />
            <Rect x={14} y={13} width={36} height={30} rx={1} fill="#8dbcb8" />
            <Path
              d="m15 14 16 2-6 12-10-1Zm18 0 16 1-1 11-12-2Zm-6 16 9-4 12 4-1 11-13-3-18 3v-9Z"
              fill="#bed8ce"
              stroke="#e9ddbd"
              strokeWidth={1}
            />
            <Path
              d="m15 33 10-5 10 8 14-6m-34 9 10-5 10 7 14-5"
              fill="none"
              stroke="#688f9e"
              strokeWidth={2}
            />
            <Path d="m39 16 2 4 4 1-3 3v4l-4-2-4 2 1-4-3-3 5-1Z" fill="#f5db94" strokeWidth={0.8} />
            <Path
              d="M20 23q-8-9 0-10 8 1 0 10Zm0 0v-7m0 7-4-6m4 6 4-6"
              fill="#f0d8b4"
              strokeWidth={0.7}
            />
          </>
        )}
      </G>
    </Svg>
  );
}

/** Decorations only: no terrain, interaction targets, rewards, or save flags are introduced. */
export function ProductionMilestones({ game, scale }: { game: GameState; scale: number }) {
  const milestone = cityProductionMilestone(game, game.player.map as TownId);
  const market =
    game.player.map === 'harbor'
      ? MAPS.harbor.npcs.find((npc) => npc.id === 'district_harbor_market')
      : undefined;
  const marketOpen = dayPeriodFor(game) === 'night';
  const nearby =
    milestone && Math.abs(game.player.x - milestone.x) + Math.abs(game.player.y - milestone.y) <= 6;
  return (
    <>
      {milestone && (
        <View
          pointerEvents="none"
          accessible
          accessibilityLabel={`${milestone.name}，首次进阶订单交付后留在花园的邻里纪念`}
          testID={`production-milestone-${milestone.id}`}
          style={{
            position: 'absolute',
            left: (milestone.x * 32 - 8) * scale,
            top: (milestone.y * 32 - 17) * scale,
            width: 48 * scale,
            height: 48 * scale,
            zIndex: milestone.y * 10,
          }}
        >
          <MilestoneIllustration id={milestone.id} size={48 * scale} />
          {nearby && (
            <Text
              testID={`production-milestone-label-${milestone.id}`}
              numberOfLines={1}
              style={{
                position: 'absolute',
                top: 46 * scale,
                left: -20 * scale,
                width: 88 * scale,
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
              {milestone.name}
            </Text>
          )}
        </View>
      )}
      {market && (
        <View
          pointerEvents="none"
          accessible
          accessibilityLabel={`潮声夜市${marketOpen ? '营业中' : '备摊中'}，18:00 至次日 06:00 营业`}
          testID={marketOpen ? 'production-night-market-open' : 'production-night-market-closed'}
          style={{
            position: 'absolute',
            left: (market.x * 32 - 38) * scale,
            top: (market.y * 32 + 28) * scale,
            width: 108 * scale,
            zIndex: market.y * 10 + 2,
            borderWidth: scale,
            borderColor: marketOpen ? '#d9b76d' : '#b9ad92',
            borderRadius: 5 * scale,
            backgroundColor: marketOpen ? '#3b4c58f0' : '#eee4ceeF',
            paddingVertical: 3 * scale,
          }}
        >
          <Text
            style={{
              color: marketOpen ? '#ffe0a1' : '#6d6656',
              fontSize: 9 * scale,
              lineHeight: 12 * scale,
              textAlign: 'center',
              fontWeight: '700',
            }}
          >
            {marketOpen ? '潮声夜市 · 营业中' : '潮声夜市 · 18:00 开市'}
          </Text>
        </View>
      )}
    </>
  );
}
