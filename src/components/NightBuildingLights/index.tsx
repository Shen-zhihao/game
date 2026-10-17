import { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, RadialGradient, Rect, Stop } from 'react-native-svg';
import { MAPS, mapSize } from '../../content/world';
import { streetLampAnchors } from '../../content/cityDistricts';
import { isIndoor } from '../../game/environment';
import type { MapId } from '../../game/model';

/** Lamps follow the same doorway anchors as the painted map and opening doors. */
export function NightBuildingLights({ map, scale }: { map: MapId; scale: number }) {
  const glowId = `night-lamp-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const lamps = (MAPS[map].scenery ?? []).filter((prop) => prop.kind === 'lamp');
  if (isIndoor(map) || (!MAPS[map].entrances?.length && !lamps.length)) return null;
  const { width, height } = mapSize(map);
  return (
    <Svg width={width * scale} height={height * scale} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <RadialGradient id={glowId} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#ffdf8b" stopOpacity={0.5} />
          <Stop offset="55%" stopColor="#ffc96b" stopOpacity={0.18} />
          <Stop offset="100%" stopColor="#ffc96b" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {lamps.map((lamp) => {
        const a = streetLampAnchors(lamp);
        return (
          <G key={`street-${lamp.x}-${lamp.y}`} testID={`street-lamp-${lamp.x}-${lamp.y}`}>
            <Ellipse cx={a.groundX} cy={a.groundY} rx={48} ry={21} fill={`url(#${glowId})`} />
            <Ellipse cx={a.bulbX} cy={a.bulbY + 4} rx={25} ry={31} fill={`url(#${glowId})`} />
            <Rect x={a.bulbX - 3.5} y={a.bulbY - 5} width={7} height={10} rx={2} fill="#ffe1a0" />
            <Circle cx={a.bulbX} cy={a.bulbY - 1} r={2.1} fill="#fff5cd" />
          </G>
        );
      })}
      {(MAPS[map].entrances ?? []).map((entrance) => {
        const d = entrance.doorway;
        const x = d.x + d.width / 2;
        const y = d.y + d.height;
        return (
          <G key={`${entrance.x}-${entrance.y}`}>
            <Ellipse cx={x} cy={y + 10} rx={35} ry={17} fill={`url(#${glowId})`} />
            <Ellipse cx={x} cy={y - 5} rx={31} ry={28} fill={`url(#${glowId})`} />
            {d.windows.map((window, index) => (
              <G key={index}>
                <Ellipse cx={window.x} cy={window.y} rx={13} ry={16} fill={`url(#${glowId})`} />
                <Circle cx={window.x} cy={window.y} r={2.2} fill="#ffeab1" />
              </G>
            ))}
          </G>
        );
      })}
    </Svg>
  );
}
