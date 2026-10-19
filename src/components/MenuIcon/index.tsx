import Svg, { Path } from 'react-native-svg';
import { palette } from '../ui';

const paths = {
  nursery: 'M12 3C8 3 5 11 5 15a7 7 0 0 0 14 0c0-4-3-12-7-12Zm-6 9 4 2 4-3 4 3',
  production: 'M3 21h18M5 21V9l7-6 7 6v12M9 21v-7h6v7M9 9h6',
  challenge:
    'M6 3h12v7a6 6 0 0 1-12 0ZM6 5H3v3a5 5 0 0 0 5 5m10-8h3v3a5 5 0 0 1-5 5M12 16v5m-5 0h10',
  party:
    'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20v-3a5 5 0 0 1 10 0v3M16 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5v1',
  center: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',
  bag: 'M7 8V6a5 5 0 0 1 10 0v2M5 8h14l2 13H3ZM8 12h8v5H8Z',
  dex: 'M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v16M5 8h4m-4 4h4m6-4h4m-4 4h4',
  quests: 'M9 4H5v17h14V4h-4M9 2h6v5H9ZM8 12h8m-8 4h5',
  map: 'm2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3Zm6-3v17M16 5v17',
  save: 'M4 3h13l4 4v14H3V3Zm3 0v7h10V3M7 21v-7h10v7',
  transfer: 'M3 7h17l-4-4m4 4-4 4M21 17H4l4-4m-4 4 4 4',
  settings:
    'm9 3 1 3h4l1-3 4 2-2 3 2 4 3 1-1 4-4-1-3 2-1 4H9l-1-4-3-2-3 1-1-4 3-1 2-4-1-3Zm7 9a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z',
};

export function MenuIcon({
  name,
  size = 20,
  color = palette.ink,
}: {
  name: keyof typeof paths;
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Path
        d={paths[name]}
        fill="none"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
