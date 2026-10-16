import { writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { CONTENT_VERSION, ITEMS, ITEM_POCKETS, SPECIES } from '../src/content/catalog';
import { CHEAT_CODES, CREATURE_CHEAT_CODES, ITEM_CHEAT_CODES } from '../src/game/cheats';
import { APP_NAME } from '../src/content/brand';

async function main() {
  const groups = Object.keys(ITEM_POCKETS) as (keyof typeof ITEM_POCKETS)[];
  const text = [
    `# ${APP_NAME}金手指代码`,
    '',
    `适用内容版本：\`${CONTENT_VERSION}\`。从游戏运行配置生成；更新命令为 \`pnpm exec tsx tools/export-cheats.ts\`。`,
    '',
    '在一段已载入的冒险中打开「菜单 → 设置 → 金手指」，输入数字指令并按「确认」。界面仅显示输入框和确认按钮。三位道具代码保留：首位1为精灵球、2为回复、3为培养、4为进化、5为重要物品；四位精灵代码为6加三位图鉴编号，6001至6250，每种精灵各一条。旧字母代码不接受。',
    '',
    '战斗、对话、初始伙伴选择和待处理的升级／进化中不能领取。无效代码、已有重要物品或完整奖励放不下时不发放，也不扣旅费。每种普通道具最多携带999个。大师球另外为尚未领取的三个正常剧情奖励预留空间；例如尚无剧情球时最多携带996枚金手指球。',
    '',
    '正常剧情仍最多获得三枚大师球，商店和兑换不出售。金手指额外获得与额外使用独立记账；当前持有 = 剧情领取 - 剧情使用 + 金手指领取 - 金手指使用。投球先消耗金手指来源；大师球不能捕获训练师伙伴或尚未开启的剧情相遇。',
    '',
    '物品、重要物品和金手指账本均随本地存档与整档传输保留。代码不授予徽章、不伪造调查标记，不会自动解锁未完成的故事。渡水装备、碎岩和各地工具捷径会识别实际持有的重要物品；剧情通用技能仍需其原本解锁条件。',
    '',
    ...groups.flatMap((pocket) => [
      `## ${ITEM_POCKETS[pocket]}`,
      '',
      '| 数字指令 | 道具 | 数量 |',
      '| --- | --- | --- |',
      ...ITEM_CHEAT_CODES.filter((entry) => ITEMS[entry.itemId]!.pocket === pocket).map(
        (entry) => `| \`${entry.code}\` | ${ITEMS[entry.itemId]!.name} | ${entry.quantity} |`,
      ),
      '',
    ]),
    '重要物品不消耗，不参与普通商店与兑换；正常通过剧情获得的同一工具也会显示在「重要物品」袋中。剪藤和碎岩工具不替代各城馆内练习。归流校准件虽然可以提前持有，但相关设备仍检查调查与证据前置。',
    '',
    '## 精灵代码',
    '',
    '先完成博士救援并正式获得初始伙伴。每次获得一只Lv.5精灵，同码可重复获得不同个体；队伍未满6只时加入队伍，否则进入360格仓库，全部满时拒绝领取。同步登记见过与捕获图鉴，角色、精灵和账本可正常保存、读取与传输。代码不自动完成剧情，不授予徽章或冠军。',
    '',
    '| 数字指令 | 图鉴编号 | 精灵 | 等级 |',
    '| --- | --- | --- | --- |',
    ...CREATURE_CHEAT_CODES.map(
      (entry) =>
        `| \`${entry.code}\` | ${String(SPECIES[entry.speciesId]!.dexNumber).padStart(3, '0')} | ${SPECIES[entry.speciesId]!.name} | ${entry.level} |`,
    ),
    '',
  ].join('\n');
  const path = 'docs/金手指/金手指代码.md';
  writeFileSync(path, await format(text, { ...(await resolveConfig(path)), filepath: path }));
  console.log(`导出 ${CHEAT_CODES.length} 条金手指代码到 ${path}`);
}
void main();
