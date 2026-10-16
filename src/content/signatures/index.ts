import design from '../../../docs/data/creature-types.json';
import acquisition from '../../../docs/data/acquisition-plan.json';
import type { Move } from '../catalog';
import type { TypeId } from '../../game/model';

// Each form owns its move. An evolution exchanges the old signature for the new one.
const designs: Record<string, [string, TypeId, string]> = {
  '025': ['引雾铃音', 'ghost', '铃音凝成幽雾，扰乱对手的攻击。'],
  '026': ['送魂钟岚', 'ghost', '钟岚掠过战场，撕开对手的防线。'],
  '033': ['晶露毒网', 'poison', '晶露织成毒网，有机会使对手中毒。'],
  '034': ['镜池倒影', 'psychic', '倒影化成念波，容易击中要害。'],
  '035': ['腐叶回旋', 'grass', '腐叶随壳旋转，攻击后汲取少量生机。'],
  '036': ['幽棘缚影', 'ghost', '棘刺钉住影子，降低对手速度。'],
  '057': ['眠云坠', 'flying', '云团轻轻坠落，有机会令对手入睡。'],
  '058': ['旋叶匿袭', 'grass', '藏身叶旋后突然袭击，容易命中要害。'],
  '077': ['镇矿钟鸣', 'rock', '矿石共振成钟声，降低对手特防。'],
  '078': ['盲灯冷闪', 'ice', '冷光急闪，有机会麻痹对手。'],
  '097': ['珊枝繁潮', 'water', '珊枝引来潮水，攻击后恢复少量体力。'],
  '098': ['浮岛落陆', 'ground', '浮岛压落地面，扬起岩土并增强自身防御。'],
  '099': ['回潮葬歌', 'ghost', '贝壳唱出回潮幽歌，降低对手特攻。'],
  '115': ['远雷贯空', 'electric', '远雷沿翼贯穿天空，有机会麻痹对手。'],
  '116': ['栖云霜环', 'ice', '云间霜环扩散，降低对手速度。'],
  '127': ['黑曜尾针', 'poison', '黑曜尾针刺入破绽，有机会使对手中毒。'],
  '128': ['日冕鳞舞', 'fire', '日冕鳞粉爆燃，有机会造成灼伤。'],
  '138': ['梦灯引魂', 'ghost', '梦灯照入意识，有机会令对手入睡。'],
  '139': ['铜翼电羽', 'steel', '电流沿铜羽射出，有机会麻痹对手。'],
  '140': ['讯流穿心', 'electric', '讯流精准穿过防线，容易击中要害。'],
  '141': ['纹印震', 'rock', '岩纹迸发冲击，增强自身防御。'],
  '142': ['碑纹裁断', 'psychic', '碑文凝成刃光，降低对手特防。'],
  '143': ['镇域天印', 'fighting', '镇域之印坠落，增强自身攻击。'],
  '144': ['遗羽星芒', 'psychic', '遗羽折射星芒，容易击中要害。'],
  '145': ['铭羽天书', 'psychic', '铭文随羽光展开，增强自身特攻。'],
  '146': ['星仪焚天', 'fire', '星仪之火化为羽阵，有机会造成灼伤。'],
  '147': ['残月噬影', 'dark', '残月之影掠过，容易击中要害。'],
  '148': ['镜月潮蚀', 'water', '镜月之潮侵蚀防线，降低对手特防。'],
  '149': ['源环五重光', 'psychic', '五重光环共鸣，增强自身特攻。'],
  '150': ['无相界裂', 'normal', '无相裂隙骤然合拢，容易击中要害。'],
  '164': ['菌冠孢伞', 'poison', '孢伞撑开并洒落毒孢，有机会使对手中毒。'],
  '175': ['远望蜃界', 'psychic', '蜃景收束成念波，降低对手命中。'],
  '186': ['封矿重扉', 'steel', '矿门重重合拢，增强自身防御。'],
  '200': ['九汐开匣', 'water', '匣中九汐涌出，降低对手速度。'],
  '214': ['断峰龙陨', 'dragon', '龙翼挟断峰之势俯冲，容易击中要害。'],
  '225': ['硫面鬼焰', 'fire', '硫烟面具喷出鬼焰，有机会造成灼伤。'],
  '236': ['锚钟敲魂', 'ghost', '锚钟敲中灵魂，降低对手攻击。'],
  '237': ['霓幕终场', 'fairy', '霓幕收拢成终场光束，降低对手命中。'],
  '238': ['砂字蚀刻', 'ground', '砂字刻入地面，降低对手防御。'],
  '239': ['铭砂封页', 'psychic', '铭砂化成封页，增强自身特防。'],
  '240': ['篆域千蝶', 'fairy', '篆文化作蝶群，增强自身特攻。'],
  '241': ['残曜碎鳞', 'rock', '残曜鳞片疾射，容易击中要害。'],
  '242': ['碑翼掠魂', 'ghost', '碑翼掠过魂影，降低对手特防。'],
  '243': ['古曜龙烬', 'dragon', '古曜龙焰贯地，有机会造成灼伤。'],
  '244': ['泉镜碎光', 'water', '泉镜折出碎光，降低对手命中。'],
  '245': ['轮镜回澜', 'water', '轮镜拨转水澜，攻击后恢复少量体力。'],
  '246': ['时涟逆流', 'psychic', '时涟逆转流速，降低对手速度。'],
  '247': ['玄锁封牙', 'dark', '玄锁咬合，降低对手攻击。'],
  '248': ['解印断界', 'dark', '封印解开时斩断界线，容易击中要害。'],
  '249': ['双衡星裁', 'psychic', '双衡星轨汇成裁决之光，增强自身特攻。'],
  '250': ['终宵烛寂', 'dragon', '烛龙以终宵之火封住天空，有机会造成灼伤。'],
};
const effects: Partial<Record<string, Move['effect']>> = {};
for (const [ids, effect] of [
  ['025 099 236 247', { stage: 'attack', amount: -1, target: 'enemy' }],
  ['026 238', { stage: 'defense', amount: -1, target: 'enemy' }],
  ['077 142 148 242', { stage: 'specialDefense', amount: -1, target: 'enemy' }],
  ['036 116 200 246', { stage: 'speed', amount: -1, target: 'enemy' }],
  ['175 237 244', { stage: 'accuracy', amount: -1, target: 'enemy' }],
  ['098 141 186', { stage: 'defense', amount: 1, target: 'self' }],
  ['143', { stage: 'attack', amount: 1, target: 'self' }],
  ['145 149 240 249', { stage: 'specialAttack', amount: 1, target: 'self' }],
  ['239', { stage: 'specialDefense', amount: 1, target: 'self' }],
  ['033 127 164', { status: 'poison', chance: 0.3 }],
  ['078 115 139', { status: 'paralysis', chance: 0.25 }],
  ['128 146 225 243 250', { status: 'burn', chance: 0.25 }],
  ['057 138', { status: 'sleep', chance: 0.2 }],
  ['035 097 245', { heal: 0.15, target: 'self' }],
] as [string, Move['effect']][]) {
  for (const id of ids.split(' ')) effects[id] = effect;
}
const rareFamilies = new Set(
  acquisition.families
    .filter((f) => f.rarity === 'rare' || f.rarity === 'legendary')
    .map((f) => f.familyId),
);
const legendaryFamilies = new Set(
  acquisition.families.filter((f) => f.rarity === 'legendary').map((f) => f.familyId),
);
export const SIGNATURES = design.families
  .filter((f) => rareFamilies.has(f.id))
  .flatMap((family) =>
    family.forms.map((species) => {
      const key = species.id.slice(-3);
      const [name, type, description] = designs[key]!;
      const legendary = legendaryFamilies.has(family.id);
      const move: Move = {
        id: `signature_${key}`,
        name,
        type,
        exclusiveSpeciesId: species.id,
        category:
          species.baseStats.attack > species.baseStats.specialAttack ? 'physical' : 'special',
        power: legendary ? 105 : 78 + (species.stage - 1) * 8,
        accuracy: 95,
        pp: legendary ? 5 : 10,
        priority: 0,
        ...(effects[key] ? { effect: effects[key] } : { criticalStage: 1 }),
      };
      return { speciesId: species.id, level: legendary ? 50 : 15, description, legendary, move };
    }),
  );
export const SIGNATURE_BY_SPECIES = Object.fromEntries(SIGNATURES.map((s) => [s.speciesId, s]));
