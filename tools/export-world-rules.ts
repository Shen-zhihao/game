import { writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { CONTENT_VERSION, MOVES } from '../src/content/catalog';
import { BALLS, MASTER_BALL_SOURCES } from '../src/game/capture';
import { isIndoor, TERRAIN_SPEEDS, WEATHER } from '../src/game/environment';
import { MAPS } from '../src/content/world';
import { climateFor } from '../src/content/climates';
import { CITY_SURFACES } from '../src/content/surfaces';
import { FIELD_SKILLS } from '../src/game/fieldSkills';
import { CALENDAR_RATE, DAY_NIGHT_HALF_SECONDS } from '../src/game/calendar';

async function main() {
  const path = 'docs/世界系统/世界规则.json';
  const data = {
    contentVersion: CONTENT_VERSION,
    weather: WEATHER,
    calendar: {
      initial: '星苔历 1 年 1 月 1 日 06:00；旧存档按已有游玩时长初始化。',
      gameSecondsPerRealSecond: CALENDAR_RATE,
      halfCycleSeconds: DAY_NIGHT_HALF_SECONDS,
      daytime: '06:00–18:00',
      nighttime: '18:00–次日06:00',
      date: '午夜推进日期，按公历月份与闰年规则计算；日期和时间随存档、传档保留。',
      progression: '游玩时自动推进，室内、对话与战斗中继续；暂停菜单、后台和未运行时停止。',
      lighting:
        '夜间整个露天游戏画面适度变暗，建筑门窗和门前暖灯点亮，昼夜交替平滑过渡；战斗界面、室内不叠加夜色。',
      setting: '默认开启；本机设置可关闭昼夜循环，露天保持白天亮度，日期继续推进。',
    },
    citySurfaces: CITY_SURFACES,
    naturalWeather: {
      initial: '按所在气候区权重随机生成，不固定晴天；旧存档保留当地有效天气和剩余时间。',
      durationSeconds: [180, 360],
      regions: Object.fromEntries(
        Object.values(MAPS)
          .filter((map) => !isIndoor(map.id))
          .map((map) => [map.id, climateFor(map.id)]),
      ),
      persistence:
        '独立种子；每个气候区分别保存天气和剩余秒数，同气候区地图共享，跨区首次随机生成、重返不重抽；仅当前气候区户外自由探索计时，菜单、对话、战斗、成长选择与室内暂停。存档、传档保留各区天气和剩余秒数。',
      selection:
        '初次生成按基础权重抽签；每轮切换排除当前天气，按其余正权重重新归一化抽签，任何露天地图都有多种天气。',
      scene:
        '雨雪、雾气、光照叠加场景；草木颜色和摇动、露天水面波纹随天气变化，室内不显示自然天气。',
      ecology: '偏好属性相对权重 ×1.8，受抑制属性 ×0.6，不相乘叠加；不增添原栖地之外或剧情限定种。',
      battle:
        '入场冻结自然天气；天气招式覆盖五轮含施放轮，到期恢复入场天气。速度额度每轮锁定，天气不改十八属性克制表和免疫。',
    },
    terrain: TERRAIN_SPEEDS,
    travel: {
      baseIntervalMs: 160,
      baseDurationMs: 140,
      minimumSpeed: 0.5,
      formula:
        '地形倍率 × 天气倍率，下限 0.5；输入间隔 round(160 / speed)，动画时长 round(140 / speed)。桥梁免降雨惩罚，水面免陆地天气惩罚。',
    },
    rewards: {
      wild: { experienceFactor: 1, moneyPerLevel: 8 },
      trainer: { experienceFactor: 1.5, moneyPerLevel: 18 },
      leader: { experienceFactor: 2.5, moneyPerLevel: 32 },
      baseExperiencePerLevel: 32,
      strength: 'clamp(种族总值 / 350, 0.8, 1.5)',
      settlement:
        '逐只击败即时结算，保存已击败 ID 与累计池；参与者均分，健康后备每只获池的 25%。捕获仅给原队伍 level ×16 研究经验，不发击败金币。逃跑不发奖。',
      gymCompletion:
        '原训练师胜利旅费 + 300 × 当前徽章数金币；sum(敌方等级) ×16 × 当前徽章数额外经验池；成长果 ×2、高级星纹球 ×2，每枚新徽章一次。',
      growth: '沿用四条三次经验曲线，100 级封顶，每次升级 1–10 能力点。',
    },
    fieldSkills: FIELD_SKILLS.map((s) => ({ ...s, move: MOVES[s.id] })),
    weatherMoves: Object.values(MOVES).filter((m) => m.weather),
    capture: {
      balls: BALLS,
      strength: 'clamp(1 - max(0, 种族总值 - 300) / 650, 0.35, 1)',
      level: '1 / (1 + max(0, level - 10) / 100)',
      chance:
        'clamp(捕获率/255 × 球倍率 × 强度倍率 × 等级倍率 × (1 - HP/(1.5×最大HP)) × 异常倍率, 0.03, 0.95)；睡眠 ×2，其他异常 ×1.5；大师球 100%。',
      ecology:
        '基础权重 × clamp(1 - max(0, 种族总值 - 300) / 500, 0.12, 1) × 0.5^(阶段-1) × min(1, 捕获率/120) × 天气偏好，再在同一栖地内归一化。',
      masterBallSources: MASTER_BALL_SOURCES,
      masterBallLimit: 3,
      masterBallRestrictions:
        '仅可捕获已开启的野生／剧情精灵；禁止训练师伙伴与序章救援对象。所有商店、兑换、随机补给均排除。正常剧情最多三枚；金手指额外领取和使用独立记账。持有数 = 剧情领取 - 剧情使用 + 金手指领取 - 金手指使用。',
    },
    freedom:
      '仅入门与本馆练习约束道馆；剧情调查保留实际证据依赖。所有普通城际道路和已开放道馆不要求天气、冲浪、其他徽章或稀有精灵；渡水只增加可选路线。',
  };
  writeFileSync(
    path,
    await format(JSON.stringify(data), { ...(await resolveConfig(path)), filepath: path }),
  );
  console.log(`导出 ${Object.keys(WEATHER).length} 种天气、地形、奖励、剧情技能与限量捕捉规则。`);
}
void main();
