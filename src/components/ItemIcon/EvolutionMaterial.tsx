import { Circle, Ellipse, Path, Rect } from 'react-native-svg';

/** Material silhouettes stay distinct even in the small bag rows. Inherits the bag's ink. */
export function EvolutionMaterial({ itemId }: { itemId: string }) {
  switch (itemId) {
    case 'growth_seed':
      return (
        <>
          <Path d="M24 40C7 38 10 22 24 18c14 4 17 20 0 22Z" fill="#d6bb8d" />
          <Path
            d="M24 32V17c-13 1-15-8-13-11 11 0 14 7 13 11 0-10 8-13 15-11 0 9-8 13-15 11"
            fill="#b3c69a"
          />
          <Path d="m18 29 6 5 6-5" fill="none" stroke="#ac8f67" />
        </>
      );
    case 'moon_shard':
      return (
        <>
          <Path d="M32 6C10 4 2 29 20 40c9 5 19 0 21-7-20 5-27-16-9-27Z" fill="#d6cfdf" />
          <Path d="M15 18q-7 15 9 20" fill="none" stroke="#f9f2e2" />
          <Path d="m35 12 2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1Z" fill="#e6cb8e" strokeWidth={1.3} />
        </>
      );
    case 'thunder_core':
      return (
        <>
          <Rect x={10} y={10} width={28} height={29} rx={8} fill="#c5c9b6" />
          <Path d="M18 10V6h12v4m-12 29v4m12-4v4" fill="none" />
          <Path d="m26 13-11 15h9l-2 10 12-17h-9Z" fill="#e5c584" />
          <Path d="M14 17v6m20 9v3" stroke="#f7efdb" />
        </>
      );
    case 'tide_pearl':
      return (
        <>
          <Path d="M7 27q17-25 34 0L30 41H18Z" fill="#c6d5d0" />
          <Path
            d="m12 26 8 14m16-14-8 14M24 20v20"
            fill="none"
            stroke="#93b3b4"
            strokeWidth={1.3}
          />
          <Circle cx={24} cy={25} r={10} fill="#f8edd6" />
          <Path d="M19 24q0-5 5-5" fill="none" stroke="#c6d5d0" />
        </>
      );
    case 'frost_crystal':
      return (
        <>
          <Path d="m24 5 10 12 5 18-15 8L9 35l5-18Z" fill="#b7d0d4" />
          <Path
            d="m24 5-4 20 4 18 5-18-5-20M9 35l11-10-6-8m25 18L29 25l5-8"
            fill="none"
            stroke="#f5f3e6"
            strokeWidth={1.5}
          />
        </>
      );
    case 'old_inscription':
      return (
        <>
          <Path d="m12 7 24 2 4 27-8 6-22-4Z" fill="#c6bfaa" />
          <Path
            d="m14 10 3 4-3 5m22 12-5 2 1 6M19 15h11m-11 6h5v7h-5m10-7h3v8m-13 5h12"
            fill="none"
            stroke="#867f69"
            strokeWidth={1.5}
          />
        </>
      );
    case 'forged_heart':
      return (
        <>
          <Path d="M24 40 9 23C0 10 17 3 24 15 31 3 48 10 39 23Z" fill="#cf9d83" />
          <Path d="M24 33c-12-4-8-12-4-15-1 5 3 6 5-2 8 8 10 13-1 17Z" fill="#edcd92" />
          <Path d="m12 18 4 5m17-8 3 3" fill="none" stroke="#f6e2c3" />
        </>
      );
    case 'dusk_veil':
      return (
        <>
          <Path d="M13 10q11 8 22 0l7 27q-9 8-18 0-9 8-18 0Z" fill="#b8adc7" />
          <Path
            d="M15 12q9-10 18 0M17 20l-4 14m12-15v14m7-13 4 15"
            fill="none"
            stroke="#e8dfe8"
            strokeWidth={1.4}
          />
          <Circle cx={24} cy={10} r={3} fill="#e2c58d" />
        </>
      );
    case 'wind_plume':
      return (
        <>
          <Path d="M12 36C6 20 23 4 39 7c1 17-12 31-27 29Z" fill="#c3d3c7" />
          <Path
            d="m8 42 25-29M17 32l-2-10m8 3 12-2m-6-5V9m-14 26 10 1"
            fill="none"
            stroke="#829d93"
            strokeWidth={1.5}
          />
        </>
      );
    case 'dragon_scale':
      return (
        <>
          <Path d="M24 5q3 10 15 17-1 14-15 21C10 36 9 27 9 22 21 15 21 12 24 5Z" fill="#aec1ad" />
          <Path d="m14 24 10 13 10-13-10-9Z" fill="#d0d8b9" />
          <Path d="M24 15v22m-10-13h20" fill="none" stroke="#8a9e80" strokeWidth={1.3} />
        </>
      );
    case 'echo_bell':
      return (
        <>
          <Circle cx={24} cy={10} r={5} fill="#d6bd8a" />
          <Path d="M13 19q0-12 11-12t11 12l2 12 5 5H6l5-5Z" fill="#e1c68f" />
          <Path d="M18 36a6 6 0 0 0 12 0M16 26l1-7m14 0 1 7M8 12l-3 5m35-5 3 5" fill="none" />
          <Path d="M12 32h24" stroke="#f7e8bf" />
        </>
      );
    case 'amber_drop':
      return (
        <>
          <Path d="M24 5C20 17 9 21 10 31c1 16 28 16 28 0C39 21 28 17 24 5Z" fill="#dfb67e" />
          <Ellipse cx={25} cy={30} rx={8} ry={9} fill="#efd4a1" stroke="none" />
          <Path
            d="M22 25v10m-4-7 8 4m-5 0 7-6M15 27q0-5 4-8"
            fill="none"
            stroke="#b28b62"
            strokeWidth={1.4}
          />
        </>
      );
    default:
      return (
        <>
          <Path d="m16 8 16 2 9 19-17 12L7 28Z" fill="#c2b9ce" />
          <Path
            d="m16 8 7 15 9-13M7 28l16-5 1 18m17-12-18-6"
            fill="none"
            stroke="#f7f0e8"
            strokeWidth={1.4}
          />
        </>
      );
  }
}
