import { writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import design from '../docs/精灵属性/精灵设计数据.json';
import acquisition from '../docs/精灵获取/稀有精灵获取.json';
import { ALL_SPECIES, CONTENT_VERSION, TYPES, TYPE_CHART, TYPE_IDS } from '../src/content/catalog';
import { analyzeTyping } from '../src/content/typeBalance';
import { APP_NAME } from '../src/content/brand';

const rarityNames = { ordinary: '普通', starter: '初始伙伴', rare: '稀有', legendary: '神兽' };
type Rarity = keyof typeof rarityNames;
const rarityFor = (familyId: string) =>
  (acquisition.families.find((family) => family.familyId === familyId)?.rarity ??
    'ordinary') as Rarity;
const distribution = Object.keys(rarityNames).map((key) => {
  const rarity = key as Rarity;
  const species = ALL_SPECIES.filter((entry) => rarityFor(entry.familyId) === rarity);
  return `| ${rarityNames[rarity]} | ${species.length} | ${[1, 2, 3, 4]
    .map((count) => species.filter((entry) => entry.types.length === count).length)
    .join(' | ')} |`;
});
const typeNames = (types: string[]) =>
  types.map((id) => TYPES[id as keyof typeof TYPES]).join('／');
const families = design.ecologies.map((ecology) => {
  const entries = design.families.filter((family) => family.ecology === ecology.id);
  return `### ${ecology.name}

${entries.length} 个家族，${entries.reduce((count, family) => count + family.forms.length, 0)} 种形态。

| 家族 | 获取分类 | 进化线与属性 | 设计依据 |
| --- | --- | --- | --- |
${entries
  .map(
    (family) =>
      `| ${family.id} | ${rarityNames[rarityFor(family.id)]} | ${family.forms
        .map(
          (species) =>
            `${String(species.dexNumber).padStart(3, '0')} ${species.name}（${typeNames(species.types)}）`,
        )
        .join(' → ')} | ${family.typingRationale} |`,
  )
  .join('\n')}`;
});
const charts = [TYPE_IDS.slice(0, 9), TYPE_IDS.slice(9)].map(
  (defenders, index) => `### 防守属性分组 ${index + 1}

| 攻击＼防守 | ${defenders.map((type) => TYPES[type]).join(' | ')} |
| --- | ${defenders.map(() => '---').join(' | ')} |
${TYPE_IDS.map(
  (attack) =>
    `| ${TYPES[attack]} | ${defenders.map((defense) => TYPE_CHART[attack][defense]).join(' | ')} |`,
).join('\n')}`,
);
const coverage = TYPE_IDS.map(
  (type) =>
    `| ${TYPES[type]} | ${ALL_SPECIES.filter((species) => species.types.includes(type)).length} |`,
).join('\n');
const invalid = ALL_SPECIES.filter((species) => analyzeTyping(species.types).issues.length);
if (invalid.length)
  throw new Error(`有未通过平衡校验的属性组合：${invalid.map((s) => s.name).join('、')}`);

async function main() {
  const path = 'docs/精灵属性/精灵属性.md';
  const body = `# ${APP_NAME}精灵属性分配

内容版本：\`${CONTENT_VERSION}\`。设计版本：v${design.designVersion}。250 种形态、115 个家族。

本文件由 \`pnpm exec tsx tools/export-typing-design.ts\` 从[精灵设计数据](精灵设计数据.json)与[剧情获取分类](../精灵获取/稀有精灵获取.json)生成，图鉴、战斗、天气、自然学招和培养方案共享运行中的物种属性。

## 分配原则

- 普通精灵以单属性为主。第二属性需要有独立能力或成熟生态依据，普通形态本轮最多投放双属性；不会因为有翅、住在水边、外壳坚硬或生活在夜间，就逐项添加属性。
- 初始伙伴的第一、第二阶段保持核心单属性，最终阶段才增加第二种鲜明能力：森冠鹿为草／妖精，烬冠鼬为火／格斗，沧流獭为水／岩石。
- 稀有精灵可以走单系专精，也可以保留两种及以上有明确依据的属性；不是每进化一次都增加一种属性。雾铃一族专精幽灵，讯流灵专精电，栖云灵专精冰，无相兽专精一般。
- 双衡星兽专精超能力，以现有神兽级能力和双衡星裁体现极致；终宵烛龙保留龙／幽灵／火／冰，对应龙脉、夜魂、幽焰和寒晶。
- 单系不额外叠加本系伤害。普通与稀有都保留各自的弱点、抗性或免疫；实际投放组合的最高承伤倍率为4倍，每个附加属性都要带来防御改善或额外攻击覆盖。
- 属性数组与通用战斗公式仍可处理更多属性，投放规则不构成程序的固定槽位限制。

## 当前分布

“普通”是获取分类，不是名为“一般”的元素属性。三只初始伙伴及其进化单独统计；稀有与神兽的分类沿用剧情获取表。

| 获取分类 | 形态总数 | 单属性 | 双属性 | 三属性 | 四属性 |
| --- | --- | --- | --- | --- | --- |
${distribution.join('\n')}

## 全家族分配与依据

箭头只表示既有进化关系；等级、道具、种族能力和捕获参数保持原配置。新增或转换的属性在设计依据中对应具体能力，不能从数量直接判断精灵强弱。

${families.join('\n\n')}

## 十八属性覆盖

同一精灵可计入多个属性，因此以下形态数不要求相加为250。

| 属性 | 形态数 |
| --- | --- |
${coverage}

冰系当前有 ${ALL_SPECIES.filter((s) => s.types.includes('ice')).length} 种形态，包含雪雾狸、雪针貂等完整进化线与寒潭、雪岭、剧情场景的对应物种；精确可获取位置见[生态栖地](../生态栖地/生态栖地.json)。

## 标准克制与多属性计算

沿用项目已记录的[宝可梦官网属性相克表](${design.ruleset.source.url})，来源核对日期为 ${design.ruleset.source.verifiedDate}。本轮只调整物种分配，18×18 共324项基础关系未改动。

行是攻击技能的属性，列是目标防守属性；2为克制、0.5为抵抗、1为中性、0为免疫。

${charts.join('\n\n')}

多属性目标逐项相乘，任一项为0则免疫；伤害不能因最低值钳制穿过免疫。本系加成在攻击技能属于出手精灵任一属性时只应用一次，倍率仍为1.5。

\`防守倍率 = 目标全部属性对应的基础关系之积\`。例如冰对草／地面／飞行／龙的通用公式仍为16倍；当前物种投放审核会避免这种超过4倍弱点的配置，不裁剪通用公式。

旧称“普通、风、岩、鬼、暗”分别对应“一般、飞行、岩石、幽灵、恶”，不新增额外元素。完整逐物种防守与属性收益见[属性平衡核验](属性平衡核验.json)。

## 存档与技能

存档保存物种ID，属性从当前内容读取。旧档恢复后自动使用新属性，不改等级、个体、能力点、成长记录、已学及待学招式、进化与剧情；已掌握的旧副属性技能可以继续使用，不自动删招或重抽能力。之后自然学招与精灵中心回忆采用当前物种配置；通用复刻规则保持，专属技能仍只归原物种。

天气遭遇偏好、天气战斗修正、属性伤害、本系加成与图鉴筛选均从同一份物种配置读取。能力总值、经验曲线、捕获率、栖息地、剧情获取和135条进化边未因本次属性分配而改变。
`;
  writeFileSync(path, await format(body, { ...(await resolveConfig(path)), filepath: path }));
  console.log(`生成 ${design.families.length} 个家族的属性依据与 ${ALL_SPECIES.length} 种分配表。`);
}
void main();
