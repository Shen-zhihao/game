import { MAPS, mapSize } from '../src/content/world';
import { MapId } from '../src/game/model';

const rect = (x: number, y: number, w: number, h: number, fill: string, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
function tree(x: number, y: number, forest: boolean) {
  return `<g transform="translate(${x},${y})">${rect(1, 23, 30, 8, '#173e31', 'opacity=".3"')}${rect(13, 16, 7, 15, '#715a3b')}${rect(15, 20, 3, 9, '#a17a49')}<path d="M2 13H5V7H10V2H22V5H27V10H31V22H27V27H7V24H2Z" fill="${forest ? '#245941' : '#39704b'}"/>${rect(8, 7, 16, 12, forest ? '#36764d' : '#518351')}${rect(10, 5, 9, 5, '#6e9a61')}${rect(5, 16, 10, 5, '#448555')}${rect(18, 21, 8, 4, '#1b4f3b')}${rect(22, 9, 4, 4, '#62915a')}</g>`;
}
function building(x: number, y: number, w: number, h: number, type: string) {
  const roof =
    type === 'C' ? '#b97662' : type === 'G' ? '#567d61' : type === 'S' ? '#7299a1' : '#c29c68';
  return `<g>${rect(x + 5, y + 8, w, h, '#163f31', 'opacity=".25"')}${rect(x + 2, y + h * 0.4, w - 4, h * 0.6, '#ddcf9e')}${rect(x + 6, y + h * 0.45, w - 12, h * 0.48, '#e9deb3')}${rect(x, y, w, h * 0.45, roof)}${rect(x + 3, y + 3, w - 6, 5, '#efd0a0', 'opacity=".5"')}${rect(x - 3, y + h * 0.4, w + 6, 6, '#684f39')}${rect(x + w * 0.42, y + h * 0.62, w * 0.17, h * 0.38, '#567366')}${rect(x + w * 0.45, y + h * 0.67, w * 0.11, h * 0.33, '#2a4c40')}${rect(x + 12, y + h * 0.58, 14, 15, '#5a7c7a')}${rect(x + 14, y + h * 0.6, 10, 9, '#b8dfca')}${rect(x + w - 26, y + h * 0.58, 14, 15, '#5a7c7a')}${rect(x + w - 24, y + h * 0.6, 10, 9, '#b8dfca')}${type === 'C' ? rect(x + w / 2 - 8, y + 8, 16, 5, '#f3eccf') + rect(x + w / 2 - 3, y + 3, 6, 16, '#f3eccf') : ''}${type === 'G' ? `<path d="M${x + w / 2} ${y + 6}q-18 8 0 24q18-18 0-24" fill="#d8d493"/>` : ''}${Array.from({ length: Math.floor(w / 16) }, (_, i) => rect(x + i * 16 + 4, y + 13, 12, 2, '#f9e3ba', 'opacity=".22"')).join('')}</g>`;
}
export function mapBackground(mapId: MapId): string {
  const map = MAPS[mapId];
  const forest = mapId === 'forest';
  const stone = [
    'stoneRoute',
    'stone',
    'mine',
    'rockGym',
    'coastRoute',
    'harbor',
    'tideworks',
    'waterGym',
  ].includes(mapId);
  const gym = mapId === 'gym' || mapId === 'rockGym' || mapId === 'waterGym';
  const ground =
    mapId === 'mine'
      ? '#676356'
      : stone
        ? '#b7ac87'
        : gym
          ? '#9bb37a'
          : forest
            ? '#78a66b'
            : '#9fbd7d';
  const { width, height } = mapSize(mapId);
  let content = rect(0, 0, width, height, ground);
  const buildingTiles = new Set<string>();
  for (let y = 0; y < map.rows.length; y++)
    for (let x = 0; x < map.rows[0]!.length; x++) {
      const tile = map.rows[y]![x]!;
      const xx = x * 32;
      const yy = y * 32;
      const n = (x * 37 + y * 59) % 11;
      if (tile === ':' || tile === '=' || tile === 'R' || tile === 'W') {
        content += rect(xx, yy, 32, 32, gym ? '#d5d1a0' : '#d7c895');
        if (n < 5)
          content +=
            rect(xx + 4 + ((n * 4) % 20), yy + 9, 3, 2, '#bcb681') +
            rect(xx + 21, yy + 24, 5, 2, '#eee0ae');
        if (map.rows[y - 1]?.[x] !== ':' && map.rows[y - 1]?.[x] !== '=')
          content += rect(xx, yy, 32, 3, '#bbc08b');
      } else if (tile === '~') {
        content +=
          rect(xx, yy, 32, 32, '#579e9b') +
          rect(xx + 3, yy + 8, 15, 2, '#84c6b7') +
          rect(xx + 17, yy + 22, 10, 2, '#73b5aa');
      } else if ('HCSG'.includes(tile)) {
        if (!buildingTiles.has(`${x},${y}`)) {
          let w = 1;
          let h = 1;
          while (map.rows[y]?.[x + w] === tile) w++;
          while (map.rows[y + h]?.[x] === tile) h++;
          for (let by = y; by < y + h; by++)
            for (let bx = x; bx < x + w; bx++) buildingTiles.add(`${bx},${by}`);
          content += building(xx, yy, w * 32, h * 32, tile);
        }
      } else if (tile !== '#') {
        content +=
          rect(xx + ((n * 7) % 27), yy + ((n * 11) % 27), 3, 2, '#86a96e') +
          rect(xx + 21, yy + 16, 2, 4, '#b5ce8e');
        if (tile === 'g')
          for (let j = 0; j < 4; j++)
            content +=
              mapId === 'mine'
                ? rect(xx + 3 + j * 7, yy + 8 + (j % 2) * 9, 6, 5, j % 2 ? '#9da3a0' : '#8f8a70')
                : `<path d="M${xx + 3 + j * 8} ${yy + 25 - (j % 2) * 8}l-2-9 5 5 3-11 1 15Z" fill="${j % 2 ? '#50885b' : '#639762'}"/>`;
        if (tile === '^')
          for (let j = 0; j < 4; j++)
            content +=
              rect(xx + j * 7 + 3, yy + (j % 2) * 10 + 8, 5, 5, j % 2 ? '#edd9a0' : '#e8bd99') +
              rect(xx + j * 7 + 4, yy + (j % 2) * 10 + 9, 2, 2, '#f4efc3');
      }
    }
  for (let y = 0; y < map.rows.length; y++)
    for (let x = 0; x < map.rows[0]!.length; x++)
      if (map.rows[y]![x] === '#')
        content += stone
          ? rect(x * 32, y * 32, 32, 32, mapId === 'mine' ? '#343638' : '#796e58') +
            rect(x * 32 + 2, y * 32 + 3, 28, 8, '#a69b7c') +
            rect(x * 32 + 9, y * 32 + 17, 19, 4, '#504e43')
          : gym
            ? rect(x * 32, y * 32, 32, 32, '#3a6550') +
              rect(x * 32 + 2, y * 32 + 2, 28, 7, '#52775b')
            : tree(x * 32, y * 32, forest);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`;
}
