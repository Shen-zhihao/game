import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Resvg } from '@resvg/resvg-js';
import { MAPS, mapSize } from '../src/content/world';
import { BATTLE_SCENES } from '../src/content/battleScenes';
import { ILLUSTRATED_MAPS } from '../src/content/sceneArt';
import { illustratedBattle, illustratedMap } from '../src/content/sceneIllustrations';
import type { BattleTheme } from '../src/content/battleScenes';
import type { MapId } from '../src/game/model';
import { compressPng, PNG_COMPRESSION } from './png-compression';

const originals: Partial<Record<MapId, string>> = {
  dawn: 'dawn-expanded.png',
  route: 'route-expanded.png',
  moss: 'moss-expanded.png',
  forest: 'forest-expanded.png',
  gym: 'gym.png',
  stoneRoute: 'stone-route.png',
  stone: 'stone-city-coast-v2.png',
  mine: 'old-mine.png',
  rockGym: 'rock-gym.png',
  coastRoute: 'coast-route.png',
  harbor: 'harbor-city-v2.png',
  tideworks: 'tideworks-v2.png',
  waterGym: 'water-gym-v2.png',
};
mkdirSync('assets/maps/illustrated', { recursive: true });
const files = new Map<MapId, string>();
const imageDigests = new Map<string, string>();
const roomImages = new Map<string, string>();
const reservedRoomNames = new Set<string>();
for (const map of ILLUSTRATED_MAPS) {
  if (!MAPS[map]) throw new Error(`不存在的插画地图：${map}`);
  const png = new Resvg(illustratedMap(map), {
    fitTo: { mode: 'width', value: mapSize(map).width * 2 },
  })
    .render()
    .asPng();
  const hash = createHash('sha256').update(png).digest('hex');
  const room = MAPS[map].interior;
  const existing = room && roomImages.get(hash);
  if (existing) {
    files.set(map, existing);
    continue;
  }
  const roomName = room && `illustrated/interior-${room.kind}.png`;
  const file =
    roomName && !reservedRoomNames.has(roomName)
      ? roomName
      : (originals[map] ?? `illustrated/${map}.png`);
  if (room) {
    roomImages.set(hash, file);
    reservedRoomNames.add(file);
  }
  const compressed = compressPng(png);
  writeFileSync(`assets/maps/${file}`, compressed);
  imageDigests.set(file, createHash('sha256').update(compressed).digest('hex'));
  files.set(map, file);
}
for (const theme of Object.keys(BATTLE_SCENES) as BattleTheme[])
  writeFileSync(
    `assets/maps/${BATTLE_SCENES[theme].file}`,
    compressPng(new Resvg(illustratedBattle(theme)).render().asPng()),
  );
if (files.size !== Object.keys(MAPS).length) throw new Error('场景插画覆盖不完整');
writeFileSync(
  'src/components/sceneAssets/index.ts',
  `import type { MapId } from '../../game/model';\n\n/** Generated from every final playable grid by tools/generate-scene-art.ts. */\nexport const MAP_IMAGES: Record<MapId, number> = {\n${[...files].map(([map, file]) => `  ${map}: require('../../../assets/maps/${file}'),`).join('\n')}\n};\n/** Content revisions refresh mutable development URLs after illustration edits. */\nexport const MAP_IMAGE_REVISIONS: Record<MapId, string> = {\n${[...files].map(([map, file]) => `  ${map}: '${imageDigests.get(file)!.slice(0, 16)}',`).join('\n')}\n};\nexport const TRAVELER_ATLAS = require('../../../assets/characters/traveler-walk.png');\nexport const NPC_ATLAS = require('../../../assets/characters/npcs.png');\nexport const RANGER_ATLAS = require('../../../assets/characters/ranger-walk.png');\n`,
);
const provenancePath = 'docs/美术资源/美术来源.json';
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'));
const generator = 'code-native SVG + @resvg/resvg-js';
const sceneRecords = [
  ...[...new Set(files.values())].map((file) => {
    const mapIds = [...files].filter(([, image]) => image === file).map(([map]) => map);
    const map = mapIds[0]!;
    return {
      file: `assets/maps/${file}`,
      mapIds,
      usage:
        mapIds.length > 1
          ? `${mapIds.length}个相同室内共用的插画；各自NPC、入口和存档地图ID保持独立。`
          : `${MAPS[map].name}完整插画地图；道路、建筑、门槛与最终可行走格一致。`,
      dimensions: [mapSize(map).width * 2, mapSize(map).height * 2],
      sha256: imageDigests.get(file)!,
    };
  }),
  ...Object.values(BATTLE_SCENES).map((scene) => ({
    file: `assets/maps/${scene.file}`,
    usage: `${scene.name}插画战斗背景；沿用双方站位锚点。`,
    dimensions: [scene.width, scene.height],
    sha256: createHash('sha256')
      .update(readFileSync(`assets/maps/${scene.file}`))
      .digest('hex'),
  })),
];
let changedProvenance = false;
const currentImages = new Set(sceneRecords.map((record) => record.file));
const stale = provenance.assets.filter(
  (asset: { file: string; generationTool?: string }) =>
    asset.generationTool === 'tools/generate-scene-art.ts' && !currentImages.has(asset.file),
);
for (const asset of stale) {
  const previousMap = asset.file.match(/illustrated\/(interior_\w+)\.png$/)?.[1] as
    MapId | undefined;
  const replacement = previousMap && files.get(previousMap);
  const previousFile = asset.file;
  const { file: _file, ...history } = asset;
  (provenance.retiredAssets ??= []).push({
    previousFile,
    replacement: replacement ? `assets/maps/${replacement}` : null,
    retiredAt: new Date().toISOString().slice(0, 10),
    reason: replacement
      ? '内容逐字节相同，合并为共享室内图片。'
      : '地图已使用完整插画，旧图块没有运行引用。',
    ...history,
  });
  // Only this generator's own previous outputs may be removed, after the new registry is written.
  if (previousFile.startsWith('assets/maps/') && existsSync(previousFile)) unlinkSync(previousFile);
}
if (stale.length) {
  provenance.assets = provenance.assets.filter((asset: { file: string }) => !stale.includes(asset));
  changedProvenance = true;
}
for (const record of sceneRecords) {
  const index = provenance.assets.findIndex(
    (asset: { file: string }) => asset.file === record.file,
  );
  const previous = provenance.assets[index];
  const updated = {
    ...record,
    sourceGenerator: generator,
    sourceFile: 'src/content/sceneIllustrations/index.ts',
    generationTool: 'tools/generate-scene-art.ts',
    transparentBackgroundRequested: false,
    compression: PNG_COMPRESSION,
    ...(previous?.sourceGenerator === generator
      ? previous.previousGenerations
        ? { previousGenerations: previous.previousGenerations }
        : {}
      : previous
        ? { previousGenerations: [previous] }
        : {}),
  };
  if (JSON.stringify(previous) !== JSON.stringify(updated)) changedProvenance = true;
  if (index < 0) provenance.assets.push(updated);
  else provenance.assets[index] = updated;
}
if (changedProvenance) {
  provenance.version += 1;
  provenance.date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
  provenance.sceneStyle = `全部${files.size}张地图与${Object.keys(BATTLE_SCENES).length}套战斗背景统一使用参考截图的奶油纸色、低饱和青绿、柔和棕色描边与圆润造型；城市包含扩建街区、地域地标及不同用途的室内，后续地图补充同风格的设备、书柜、窑炉、观测仪与遗迹雕饰，相同室内按图片内容共用素材。废弃图块与旧图集来源保留在retiredAssets，各资源历史保留在previousGenerations中。`;
  writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`);
}
console.log(
  `Updated ${files.size} maps using ${new Set(files.values()).size} images and ${Object.keys(BATTLE_SCENES).length} battle backgrounds.`,
);
