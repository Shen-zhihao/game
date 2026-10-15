import { mkdirSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { mapBackground } from './map-guide';
import { MAPS } from '../src/content/world';
import { MapId } from '../src/game/model';

mkdirSync('exports/art-guides', { recursive: true });
for (const id of Object.keys(MAPS) as MapId[]) {
  const svg = mapBackground(id);
  writeFileSync(
    `exports/art-guides/${id}.png`,
    new Resvg(svg, { fitTo: { mode: 'width', value: 1536 } }).render().asPng(),
  );
}
