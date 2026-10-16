import { writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { ALL_SPECIES, CONTENT_VERSION } from '../src/content/catalog';
import { HABITAT_SITES, SPECIES_HABITATS } from '../src/content/habitats';

async function main() {
  const path = 'docs/data/habitat-plan.json';
  const data = {
    contentVersion: CONTENT_VERSION,
    policy:
      '按食物、水源、温度、载体与进化适应安排自然栖地。草丛、湿岸、岩坡和水面分开；稀有、神兽与初始家族保留剧情来源。后续生境不计作当前可玩内容。',
    land: '在对应草丛或矿山碎石间行走触发。',
    water: '完成捕捉入门后，在可站立岸边朝向水面按 A 调查，不需要渡水。',
    discoveries: '新生成的随机发现使用所在陆地生境的精灵池；已有存档的发现记录保留，不重刷。',
    sites: HABITAT_SITES,
    species: ALL_SPECIES.map((s) => ({
      dexNumber: s.dexNumber,
      name: s.name,
      types: s.types,
      ...SPECIES_HABITATS[s.id],
    })),
  };
  writeFileSync(
    path,
    await format(JSON.stringify(data), { ...(await resolveConfig(path)), filepath: path }),
  );
  console.log(
    `导出 ${ALL_SPECIES.length} 种精灵的栖地、${HABITAT_SITES.length} 个生境与对应获取方式。`,
  );
}
void main();
