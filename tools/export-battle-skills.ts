import { writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { CONTENT_VERSION, MOVES, SPECIES, TYPES } from '../src/content/catalog';
import { SIGNATURES } from '../src/content/signatures';
import { MOVE_VISUALS } from '../src/game/battleVisuals';

async function main() {
  const path = 'docs/战斗技能/战斗技能.json';
  const data = {
    contentVersion: CONTENT_VERSION,
    totalMoves: Object.keys(MOVES).length,
    signatureCount: SIGNATURES.length,
    policy: {
      rareLevel: 15,
      legendaryLevel: 50,
      exclusiveToExactSpecies: true,
      copyItemCanCopySignatures: false,
      evolution:
        '已学专属技能变为新形态对应招式，保留剩余 PP（不超过新招上限）；未学则按等级回忆。',
      haptics:
        '默认开启，可在设置关闭；本机独立保存。按钮 80ms 节流，方向键长按只在开始触发，后台不触发。',
    },
    moves: Object.values(MOVES).map((move) => ({ ...move, visual: MOVE_VISUALS[move.id] })),
    signatures: SIGNATURES.map((s) => ({ ...s, speciesName: SPECIES[s.speciesId]!.name })),
  };
  writeFileSync(
    path,
    await format(JSON.stringify(data), { ...(await resolveConfig(path)), filepath: path }),
  );
  const rows = SIGNATURES.map(
    (s) =>
      `| ${String(SPECIES[s.speciesId]!.dexNumber).padStart(3, '0')} | ${SPECIES[s.speciesId]!.name} | ${s.move.name} | ${TYPES[s.move.type!]} | ${s.level} | ${s.move.power} / ${s.move.accuracy}% / ${s.move.pp} | ${s.description} |`,
  ).join('\n');
  const doc = `# 技能演出、专属招式与触感反馈\n\n内容版本 ${CONTENT_VERSION}。全部 ${data.totalMoves} 招都有画面或动作特效，其中 ${SIGNATURES.length} 招为稀有／神兽专属。\n\n每次实际出手独立播放，速度带来的第二、三次出手也各播一次。近身招式前冲／挥击，远程招式蓄力／飞行／命中，18属性使用不同符号、颜色与粒子；治疗、护盾、凝神、削弱和天气各有表现。专属招式附加光阵和名称演出。落空／免疫不播放受击震动，睡眠或PP不足取消的行动没有虚假攻击。演出期间锁住继续按钮与新指令，结束后继续经典文字流程。开启系统减少动态效果后改为短暂淡入淡出。\n\n战斗按日志位置保存有限的演出记录和双方画面状态，HP与换人按消息显示。读档只恢复结算状态，不自动重播旧动画，也不重复消耗PP、抽取随机数或发放奖励。\n\n## 专属技能规则\n\n36个稀有家族的49个形态，加上2个神兽，共51个精灵形态分别拥有一招。稀有形态Lv.15、神兽Lv.50自然解锁；四招已满时选择替换，错过后可到精灵中心免费回忆。归属精确到形态，其他种族、同家族旧形态都不能学；复刻剂对专属招式一律不可用，同种精灵也必须按自己的等级习得。进化时已掌握的专属招式变为新形态对应招式，剩余PP保留且不超新上限；不会把旧形态的专属技能放入复刻册。读取旧档不强行覆盖既有配招。\n\n| 编号 | 精灵 | 专属技能 | 属性 | 等级 | 威力 / 命中 / PP | 效果 |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows}\n\n## 触感反馈\n\n标题、菜单、背包、技能、队伍、地图选择、对话、确认按钮和半透明方向键统一接入。确认按钮轻触，命中提供一次冲击反馈，要害提供更明显反馈；取消的行动与禁用按钮无反馈。连续按键限频80ms，长按移动不逐格震动。设置中可统一关闭，偏好保存在设备本地，分享存档不会改动接收手机的偏好。iOS使用系统触感API，Android使用系统触觉效果，网页仅在浏览器支持振动时响应；不支持或调用失败不影响游戏。原生接口需要包含expo-haptics的新客户端，网页截图不代表真机马达验收。\n`;
  writeFileSync(
    'docs/战斗技能/战斗技能.md',
    await format(doc, {
      ...(await resolveConfig('docs/战斗技能/战斗技能.md')),
      parser: 'markdown',
    }),
  );
  console.log(`Exported ${data.totalMoves} move visuals and ${SIGNATURES.length} signatures.`);
}
void main();
