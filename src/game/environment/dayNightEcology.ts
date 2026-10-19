import { isOrdinarySpecies, SPECIES } from '../../content/catalog';
import type { DayPeriod } from '../calendar';

export type SpeciesActivity = 'anytime' | 'day' | 'night' | 'dayOnly' | 'nightOnly';

const ACTIVITY: Record<SpeciesActivity, { day: number; night: number; hint: string }> = {
  anytime: { day: 1, night: 1, hint: '全天活动，昼夜均可遇见。' },
  day: { day: 1.6, night: 0.55, hint: '白天更活跃，夜晚也有机会遇见。' },
  night: { day: 0.55, night: 1.6, hint: '夜晚更活跃，白天也有机会遇见。' },
  dayOnly: { day: 1.6, night: 0, hint: '仅白天出没（06:00–18:00）。' },
  nightOnly: { day: 0, night: 1.6, hint: '仅夜晚出没（18:00–次日 06:00）。' },
};

// Family ecology, rather than a type-wide rule: cave bats remain available by day,
// while glowing moths, dusk foxes and lantern jellyfish have true night-only pools.
const FAMILY_ACTIVITY: Partial<Record<string, SpeciesActivity>> = {
  F004: 'day', // 叶耳兔
  F006: 'nightOnly', // 萤灯蛾
  F007: 'night', // 绒芽菇
  F008: 'day', // 苔甲蜥
  F010: 'night', // 荷叶蛙
  F011: 'dayOnly', // 蜜芽蜂
  F012: 'night', // 盘根蛇
  F017: 'night', // 绒团鼠
  F018: 'dayOnly', // 风翎雀
  F019: 'day', // 绵球羊
  F020: 'day', // 滚果兽
  F021: 'day', // 蹦石兔
  F022: 'nightOnly', // 黄昏狐
  F023: 'dayOnly', // 草铃雀
  F024: 'day', // 踏沙驹
  F029: 'day', // 砂鳞蜥
  F030: 'night', // 煤团鼹
  F031: 'night', // 听岩蝠: 洞穴白天仍可遇见
  F033: 'night', // 滴石鲶
  F036: 'night', // 水纹鳅
  F037: 'night', // 泡沫蟹
  F038: 'night', // 细鳍鲨
  F039: 'night', // 小潮蛇
  F040: 'nightOnly', // 灯伞水母
  F041: 'day', // 帆尾鱼
  F042: 'night', // 滩泥螺
  F046: 'day', // 攀岩羊
  F047: 'dayOnly', // 雏岚鹰
  F048: 'night', // 雪雾狸
  F049: 'dayOnly', // 旋羽蝶
  F050: 'day', // 鸣峰鹤
  F051: 'day', // 岩喙雀
  F054: 'nightOnly', // 烛芯灵
  F055: 'day', // 熔团蜥
  F056: 'day', // 温泉猿
  F057: 'day', // 炉羽雀
  F060: 'night', // 插尾鼠
  F062: 'night', // 纸翼偶
  F071: 'day', // 苇哨雏
  F072: 'night', // 墨点螈
  F074: 'day', // 果盏狸
  F075: 'night', // 睡莲貘
  F077: 'dayOnly', // 穗绒雀
  F078: 'night', // 垒泥獾
  F079: 'day', // 弹芽羚
  F080: 'night', // 拂尘蛾
  F082: 'night', // 硫晶鼬
  F084: 'night', // 钟乳鳐
  F087: 'night', // 卷浪螺
  F088: 'day', // 泡舟鸭
  F089: 'night', // 藻绳鳗
  F090: 'night', // 砾砂鲎
  F091: 'day', // 明潮灯鱼: 珊瑚浅礁唯一普通物种，夜晚仍保留少量活动。
  F093: 'night', // 雪针貂
  F094: 'day', // 翼铃驹
  F095: 'day', // 砾羽雏
  F096: 'day', // 晕雪狐
  F097: 'night', // 风索蛛
  F099: 'day', // 炉砂蜥
  F100: 'night', // 烬壳螈
  F101: 'day', // 炭弦蝉
  F102: 'night', // 火漆鸦
  F104: 'nightOnly', // 线团灵
  F105: 'day', // 纸匣雀
};
const SPECIES_ACTIVITY: Partial<Record<string, SpeciesActivity>> = {
  creature_015: 'night', // 晶翼蛾成虫与石壳虫、矿纹蛹的活动时段不同。
  creature_159: 'night', // 锦林蛾成虫沿夜间树冠迁飞。
};

export function speciesActivity(speciesId: string): SpeciesActivity {
  const species = SPECIES[speciesId];
  if (!species || !isOrdinarySpecies(speciesId)) return 'anytime';
  return SPECIES_ACTIVITY[speciesId] ?? FAMILY_ACTIVITY[species.familyId] ?? 'anytime';
}

/** Shared by land, shore investigation, surfing and fishing; no RNG is consumed. */
export function dayNightEncounterMultiplier(speciesId: string, period: DayPeriod): number {
  return ACTIVITY[speciesActivity(speciesId)][period];
}

export function dayNightHabitatHint(speciesId: string): string {
  if (!isOrdinarySpecies(speciesId)) return '剧情与固定事件不受昼夜随机分布限制。';
  return `${ACTIVITY[speciesActivity(speciesId)].hint} 普通草丛、水域调查与垂钓共用此规律。`;
}
