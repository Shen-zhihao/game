import { ScrollView, View } from 'react-native';
import { Label, palette, Panel, styles } from '../../components/ui';
import { GameState, WeatherId } from '../../game/model';
import {
  isIndoor,
  TERRAIN_SPEEDS,
  travelProfile,
  WEATHER,
  weatherAt,
} from '../../game/environment';
import { MASTER_BALL_SOURCES } from '../../game/capture';
import { climateFor } from '../../content/climates';

export function EnvironmentMenu({ game }: { game: GameState }) {
  const profile = travelProfile(game);
  return (
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
      <Label style={styles.title}>天气、地形与野外生态</Label>
      <Panel style={{ gap: 7 }}>
        <Label style={{ color: palette.gold, fontWeight: '800' }}>
          {WEATHER[weatherAt(game)].mark} {WEATHER[weatherAt(game)].name} ·{' '}
          {TERRAIN_SPEEDS[profile.terrain].name} · 移速 {Math.round(profile.speed * 100)}%
        </Label>
        <Label muted>
          {isIndoor(game.player.map)
            ? '室内不受野外天气影响，户外天气暂停计时。'
            : `${climateFor(game.player.map).name} · 本轮天气还剩约 ${game.environment?.remaining ?? 240} 秒。自然天气每 3–6 分钟变换，暂停菜单、对话与战斗时不推进。`}
        </Label>
        <Label muted>
          天气只改变已有栖地的相对权重，不会让剧情稀有种随机出现。任何天气均保留普通道路与道馆入口。
        </Label>
      </Panel>
      {(Object.keys(WEATHER) as WeatherId[]).map((id) => (
        <Panel key={id} style={{ padding: 12, gap: 6 }}>
          <Label style={{ fontWeight: '800', color: palette.mint }}>
            {WEATHER[id].mark} {WEATHER[id].name}
          </Label>
          <Label>野外：{WEATHER[id].field}</Label>
          <Label>战斗：{WEATHER[id].battle}</Label>
        </Panel>
      ))}
      <Panel style={{ gap: 7 }}>
        <Label style={{ fontWeight: '800' }}>地形基础速度 · 土路为 100%</Label>
        <View style={styles.wrap}>
          {Object.entries(TERRAIN_SPEEDS).map(([id, t]) => (
            <Label key={id}>
              {t.name} {Math.round(t.speed * 100)}%　
            </Label>
          ))}
        </View>
        <Label muted>
          天气倍率与地形相乘，最低保留 50%
          步速；输入频率、移动动画使用同一规则。下雨不改变桥梁速度，渡水速度不叠加陆地惩罚。
        </Label>
      </Panel>
      <Panel style={{ gap: 7 }}>
        <Label style={{ fontWeight: '800' }}>稀有度与战斗奖励</Label>
        <Label>
          普通球 ×1、超级球 ×1.5、高级球
          ×2.5。种族强度、进化阶段、原始捕获率共同降低相遇权重；强度、等级、剩余
          HP、异常状态决定捕捉难度。
        </Label>
        <Label>
          每击败一只立即结算经验与金币：同种同级的野外 ＜ 训练师 ＜
          馆主。馆主胜利还有随徽章数量提升的经验与金币，以及成长果和高级球。捕获获得研究经验，逃走不发奖励。
        </Label>
        <Label muted>
          升级经验沿用递增的三次曲线；满级 100，升级获得 1–10
          能力点。战斗中的结算记录随存档保存，不会在结束页重复发放。
        </Label>
      </Panel>
      <Panel style={{ gap: 7 }}>
        <Label style={{ color: palette.gold, fontWeight: '800' }}>
          大师球 · 剧情领取 {game.masterBalls?.claimed.length ?? 0}/3 · 剧情已用{' '}
          {game.masterBalls?.used ?? 0} · 持有 {game.inventory.master_ball ?? 0}
        </Label>
        {!!game.cheats?.masterBallsGranted && (
          <Label muted>
            金手指额外获得 {game.cheats.masterBallsGranted} · 额外已用 {game.cheats.masterBallsUsed}
            ；与三枚正常剧情奖励分开记录。
          </Label>
        )}
        <Label>
          必定捕获已经通过剧情开启的稀有、神兽相遇；不会提前解锁剧情，也不能捕捉 NPC
          的伙伴或序章救援对象。所有商店、兑换、随机补给均不产出。
        </Label>
        {MASTER_BALL_SOURCES.map((s) => (
          <Label key={s.id} muted>
            {s.name}：
            {game.masterBalls?.claimed.includes(s.id)
              ? '已领取'
              : s.implemented
                ? '当前章节剧情奖励，仅一次'
                : '后续章节预留，仅一次'}
          </Label>
        ))}
      </Panel>
    </ScrollView>
  );
}
