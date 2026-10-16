import Svg, { Circle, Path, Rect } from 'react-native-svg';

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
  const glow = active ? '#fbe3a0' : '#83c4cc';
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x="7" y="39" width="34" height="5" fill="#123f4760" />
      {kind === 'raft' ? (
        <>
          <Path
            d="M4 26L12 18H37L44 26L38 40H11Z"
            fill="#ac8153"
            stroke="#664c3a"
            strokeWidth="2"
          />
          <Path d="M12 23H37M9 29H40M12 35H38" stroke="#dfbc7c" strokeWidth="3" />
        </>
      ) : kind === 'valve' ? (
        <>
          <Rect x="15" y="29" width="19" height="10" fill="#698f94" />
          <Rect x="20" y="20" width="9" height="18" fill="#bdc3a2" />
          <Circle
            cx="24"
            cy="19"
            r="13"
            stroke={active ? '#f1ce76' : '#4b717a'}
            strokeWidth="5"
            fill="#244f5d"
          />
          <Path d="M24 7V31M12 19H36" stroke="#c7dbd2" strokeWidth="3" />
          <Circle cx="24" cy="19" r="4" fill={glow} />
        </>
      ) : kind === 'gate' ? (
        <>
          <Rect x="2" y="8" width="7" height="36" fill="#e3d1a2" />
          <Rect x="39" y="8" width="7" height="36" fill="#e3d1a2" />
          <Path d="M8 15H40M8 29H40M15 10V39M24 10V39M33 10V39" stroke="#639ca3" strokeWidth="4" />
          <Path d="M7 12H41" stroke="#f2e2ba" strokeWidth="3" />
        </>
      ) : kind === 'lamp' ? (
        <>
          <Rect x="13" y="34" width="23" height="7" fill="#858f8c" />
          <Rect x="18" y="26" width="13" height="12" fill="#e8dbb5" />
          <Path
            d="M12 11H36V28H12Z"
            fill={active ? '#ffdf8a' : '#496775'}
            stroke="#bb9b62"
            strokeWidth="3"
          />
          <Path d="M10 10L24 3L38 10Z" fill="#bd7258" />
          <Path d="M20 11V28M29 11V28" stroke="#e6c584" strokeWidth="2" />
        </>
      ) : kind === 'bottle' ? (
        <>
          <Path
            d="M22 7H29V18L35 24V37L29 42H17L12 37V24L22 17Z"
            fill="#a7e3d2"
            stroke="#407d86"
            strokeWidth="2"
          />
          <Rect x="21" y="5" width="9" height="5" fill="#b99158" />
          <Rect x="18" y="24" width="12" height="12" fill="#f3e6b7" />
          <Path d="M21 27H27M21 31H27" stroke="#b9a275" strokeWidth="2" />
        </>
      ) : kind === 'net' ? (
        <>
          <Path
            d="M7 34L16 11L38 18L42 38Z"
            fill={active ? '#b9d7c2' : '#60757c'}
            opacity={active ? 0.4 : 1}
          />
          <Path
            d="M10 31L38 25M12 23L40 32M18 12L15 36M27 15L24 37M36 18L32 38"
            stroke="#cbba8d"
            strokeWidth="2"
          />
        </>
      ) : kind === 'lens' ? (
        <>
          <Rect x="8" y="19" width="33" height="21" fill="#ae8b5e" />
          <Rect x="8" y="19" width="33" height="6" fill="#dac08a" />
          <Circle cx="24" cy="29" r="9" fill="#9edcde" stroke="#f3dea6" strokeWidth="3" />
          <Path d="M20 25L27 32" stroke="#f2fbeb" strokeWidth="3" />
        </>
      ) : (
        <>
          <Path d="M9 17L36 11L41 34L12 41Z" fill="#526e76" />
          <Path d="M12 17L34 14L36 26L14 31Z" fill={active ? '#a2d59e' : '#83c4cc'} />
          <Rect x="15" y="34" width="7" height="4" fill="#f4d08b" />
          <Rect x="27" y="31" width="7" height="4" fill={glow} />
        </>
      )}
    </Svg>
  );
}
