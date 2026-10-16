import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { MAPS } from '../../content/world';
import type { InteriorCounter } from '../../content/buildings';
import type { MapId } from '../../game/model';
import { sceneInk as ink } from '../../content/sceneArt';

const names: Record<InteriorCounter['kind'], string> = {
  healing: '精灵中心治疗柜台',
  shop: '商店收银柜台',
  reception: '接待服务台',
  research: '研究工作桌',
  workbench: '工匠工作台',
};

/** Foreground furniture shares the collision grid and covers only the attendant's feet. */
export function ServiceCounters({ map, scale }: { map: MapId; scale: number }) {
  return (MAPS[map].counters ?? []).map((counter) => {
    const width = counter.width * 32;
    const healing = counter.kind === 'healing';
    const shop = counter.kind === 'shop';
    const desk = counter.kind === 'research' || counter.kind === 'workbench';
    return (
      <View
        key={counter.npcId}
        testID={`service-counter-${counter.npcId}`}
        pointerEvents="none"
        accessibilityLabel={names[counter.kind]}
        style={{
          position: 'absolute',
          left: counter.x * 32 * scale,
          top: (counter.y * 32 - 28) * scale,
          width: width * scale,
          height: 48 * scale,
          zIndex: counter.y * 10 + 1,
        }}
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${width} 48`}>
          <Ellipse cx={width / 2} cy={43} rx={width / 2 - 2} ry={5} fill="#655541" opacity={0.15} />
          <G stroke={ink.outline} strokeWidth={1.35} strokeLinejoin="round" strokeLinecap="round">
            {desk && (
              <>
                <Path d={`M9 20v23h6V20m${width - 30} 0v23h6V20`} fill="#b39771" />
                <Path d={`M14 35h${width - 28}`} fill="none" stroke="#ad9471" strokeWidth={3} />
              </>
            )}
            <Rect
              x={4}
              y={18}
              width={width - 8}
              height={desk ? 14 : 25}
              rx={5}
              fill={healing ? '#d6a292' : shop ? '#d7b76f' : '#c7ac84'}
            />
            <Rect
              x={10}
              y={25}
              width={width - 20}
              height={desk ? 4 : 11}
              rx={2}
              fill={healing ? '#f4d7c6' : shop ? '#efdcab' : '#ead8b7'}
              strokeWidth={0.8}
            />
            <Rect
              x={1.5}
              y={8}
              width={width - 3}
              height={16}
              rx={6}
              fill={healing ? '#fff9ea' : '#f0dfbd'}
            />
            <Path d={`M8 12h${width - 16}`} fill="none" stroke="#fffbee" strokeWidth={2} />
            <Path d={`M9 40h${width - 18}`} fill="none" stroke="#a98c64" strokeWidth={1} />
            {healing && (
              <>
                <Rect x={10} y={0.8} width={36} height={17} rx={5} fill="#e6d6b6" />
                <Rect x={14} y={3} width={28} height={7} rx={2} fill="#d2b18a" strokeWidth={0.8} />
                {[20, 28, 36].map((x) => (
                  <Circle key={x} cx={x} cy={6.5} r={2.6} fill={ink.paper} strokeWidth={0.7} />
                ))}
                <Path d="M17 13h22" fill="none" stroke="#fffaf0" strokeWidth={1.5} />
                <Circle cx={width / 2} cy={31} r={8} fill="#fff8e9" />
                <Path
                  d={`M${width / 2} 27v8m-4-4h8`}
                  fill="none"
                  stroke="#c18c76"
                  strokeWidth={2.5}
                />
                <Rect x={width - 29} y={4} width={16} height={11} rx={2} fill="#f6efd9" />
                <Path
                  d={`M${width - 26} 8h9m-9 3h6`}
                  fill="none"
                  stroke="#b8a47d"
                  strokeWidth={0.8}
                />
              </>
            )}
            {shop && (
              <>
                <Path d={`M${width - 33} 15v-5h22v5Z`} fill="#b5a282" />
                <Rect x={width - 31} y={0.8} width={18} height={10} rx={2} fill="#e6e0cc" />
                <Rect
                  x={width - 28}
                  y={3}
                  width={12}
                  height={4}
                  rx={1}
                  fill="#a6bcb7"
                  strokeWidth={0.6}
                />
                <Rect x={12} y={6} width={15} height={10} rx={2} fill="#f7e9ba" />
                <Circle cx={19.5} cy={10.5} r={3} fill="#d3a058" strokeWidth={0.8} />
                <Path d={`M${width / 2 - 8} 30h16m-12-3v8m8-8v8`} fill="none" stroke="#c5a05d" />
              </>
            )}
            {counter.kind === 'reception' && (
              <>
                <Rect x={13} y={2} width={21} height={14} rx={2} fill="#fff9e9" />
                <Path
                  d="M17 6h12m-12 3h12m-12 3h7"
                  fill="none"
                  stroke="#bba47e"
                  strokeWidth={0.8}
                />
                <Path d={`M${width - 32} 15h18l-3-9h-12Z`} fill="#e2c17e" />
                <Circle cx={width / 2} cy={31} r={5.5} fill="#f9edcc" />
                <Path d={`m${width / 2} 27 2 3-2 4-2-4Z`} fill="#cfaa64" strokeWidth={0.6} />
              </>
            )}
            {counter.kind === 'research' && (
              <>
                <Path d="M10 8q9-4 18 0 9-4 18 0v9q-9-4-18 0-9-4-18 0Z" fill="#fff9e9" />
                <Path d="M28 8v9m-14-5h10m8 0h10" fill="none" stroke="#bea785" strokeWidth={0.7} />
                <Path d={`M${width - 28} 2h8m-6 0v5l-6 8q6 4 14 0l-6-8V2`} fill="#c5d7cd" />
                <Path d={`M${width - 29} 12h10`} fill="none" stroke="#9ab8ac" />
              </>
            )}
            {counter.kind === 'workbench' && (
              <>
                <Rect x={10} y={5} width={25} height={12} rx={2} fill="#d9c7a4" />
                <Path d="m14 13 14-5m-8 0 4 8" fill="none" stroke="#96795b" strokeWidth={2.3} />
                <Path d={`M${width - 24} 4v10m-5-10h10v4h-10Z`} fill="#c5c4b5" />
                <Path
                  d={`M${width - 37} 14l7-7m-2-4 5 5`}
                  fill="none"
                  stroke="#917c63"
                  strokeWidth={2}
                />
              </>
            )}
          </G>
        </Svg>
      </View>
    );
  });
}
