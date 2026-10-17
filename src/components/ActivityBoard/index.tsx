import { useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { HapticPressable as Pressable } from '../HapticPressable';
import { Button, Label } from '../ui';
import type { ActivityDefinition } from '../../content/fieldActivities';
import type { ActivityAction, ActivityRun } from '../../game/activities/types';
import {
  balanceTarget,
  balanceWeights,
  connectedPipes,
  forgeTargets,
  miningTargets,
  mirrorTrace,
  MIRROR_POSITIONS,
  pipePorts,
  pushLayout,
} from '../../game/activities';

const ink = '#756952',
  cream = '#f4edd9',
  sage = '#a4b9a0',
  blue = '#a3c3c2',
  gold = '#d9ba70';
function Tile({
  children,
  label,
  onPress,
  selected = false,
  disabled = false,
  id,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  id: string;
}) {
  return (
    <Pressable
      testID={id}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => ({
        width: '100%',
        aspectRatio: 1,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: selected ? '#b99045' : '#c8bda4',
        backgroundColor: selected ? '#f5e5b6' : cream,
        overflow: 'hidden',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}
function Plate({ children }: { children: React.ReactNode }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 80 80" aria-hidden>
      <Rect
        x={4}
        y={5}
        width={72}
        height={70}
        rx={12}
        fill="#ede5cb"
        stroke="#c8bda4"
        strokeWidth={1.5}
      />
      <Path d="M13 16q28-8 54 0M13 65q27 6 54 0" fill="none" stroke="#fff9eb" strokeWidth={2} />
      {children}
    </Svg>
  );
}
function Grid({
  count,
  columns,
  children,
}: {
  count: number;
  columns: number;
  children: (i: number) => React.ReactNode;
}) {
  return (
    <View
      style={{
        width: '100%',
        maxWidth: 340,
        alignSelf: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: `${100 / columns}%`, padding: 3 }}>
          {children(i)}
        </View>
      ))}
    </View>
  );
}
export function ActivityBoard({
  definition: d,
  run,
  onAction,
}: {
  definition: ActivityDefinition;
  run: ActivityRun;
  onAction: (action: ActivityAction) => void;
}) {
  const mirrorSize = Math.max(180, Math.min(290, useWindowDimensions().width - 96));
  const mirrorScale = mirrorSize / 290;
  const playing = run.status === 'playing';
  const cell = (index: number) => onAction({ kind: 'cell', index });
  const step = (value: string) => onAction({ kind: 'step', value });
  const control = (value: string, title: string, disabled = false) => (
    <Button
      testID={`activity-${value}`}
      disabled={!playing || disabled}
      onPress={() => step(value)}
    >
      {title}
    </Button>
  );
  const bar = (value: number, max: number, color: string) => (
    <View style={{ height: 14, borderRadius: 8, backgroundColor: '#e6dfcb', overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.max(0, Math.min(1, value / max)) * 100}%`,
          height: '100%',
          backgroundColor: color,
        }}
      />
    </View>
  );
  if (d.kind === 'pipes') {
    const connected = connectedPipes(run.board),
      energized = d.town === 'volt' || d.npcId.startsWith('electric');
    return (
      <View style={{ gap: 8 }}>
        <Label style={{ textAlign: 'center' }}>
          入口 ↘　{energized ? '供电节点' : '引露藤槽'}　↗ 出口
        </Label>
        <Grid count={9} columns={3}>
          {(i) => {
            const ports = pipePorts(i, run.board[i]!),
              coords = [
                [40, 3],
                [77, 40],
                [40, 77],
                [3, 40],
              ],
              a = coords[ports[0]!]!,
              b = coords[ports[1]!]!;
            return (
              <Tile
                id={`activity-cell-${i}`}
                label={`旋转第${i + 1}块${energized ? '接线盘' : '藤槽'}`}
                onPress={() => cell(i)}
                selected={connected.includes(i)}
                disabled={!playing}
              >
                <Plate>
                  <Path
                    d={`M${a[0]},${a[1]}Q40,40 ${b[0]},${b[1]}`}
                    fill="none"
                    stroke={ink}
                    strokeWidth={14}
                    strokeLinecap="round"
                  />
                  <Path
                    d={`M${a[0]},${a[1]}Q40,40 ${b[0]},${b[1]}`}
                    fill="none"
                    stroke={connected.includes(i) ? (energized ? gold : blue) : sage}
                    strokeWidth={9}
                    strokeLinecap="round"
                  />
                  <Circle cx={40} cy={40} r={4} fill="#fff9eb" opacity={0.7} />
                </Plate>
              </Tile>
            );
          }}
        </Grid>
        <Label muted style={{ textAlign: 'center' }}>
          已连通 {connected.length}/9 个节点
        </Label>
      </View>
    );
  }
  if (d.kind === 'mirrors') {
    const trace = mirrorTrace(run.board),
      point = ([x, y]: readonly number[]) => [35 + x! * 50, 35 + y! * 50];
    return (
      <View style={{ width: mirrorSize, height: mirrorSize, alignSelf: 'center' }}>
        <Svg width={mirrorSize} height={mirrorSize} viewBox="0 0 290 290" aria-hidden>
          <Rect
            x={2}
            y={2}
            width={286}
            height={286}
            rx={24}
            fill="#d6c5a4"
            stroke={ink}
            strokeWidth={2}
          />
          <Rect x={10} y={10} width={270} height={270} rx={18} fill={cream} />
          {Array.from({ length: 5 }, (_, i) => (
            <G key={i} stroke="#d6cdb6" strokeWidth={0.8}>
              <Line x1={10} y1={35 + i * 50} x2={280} y2={35 + i * 50} />
              <Line x1={35 + i * 50} y1={10} x2={35 + i * 50} y2={280} />
            </G>
          ))}
          <Path
            d={trace.points.map((p, i) => `${i ? 'L' : 'M'}${point(p).join(',')}`).join(' ')}
            fill="none"
            stroke={gold}
            strokeWidth={5}
            strokeLinecap="round"
          />
          {MIRROR_POSITIONS.map((p, i) => {
            const [x, y] = point(p);
            return (
              <G key={i} transform={`rotate(${run.board[i] === 0 ? -45 : 45} ${x} ${y})`}>
                <Rect
                  x={x! - 23}
                  y={y! - 6}
                  width={46}
                  height={12}
                  rx={5}
                  fill={blue}
                  stroke={ink}
                  strokeWidth={2}
                />
                <Path d={`M${x! - 16},${y! - 3}h32`} stroke="#fff9eb" strokeWidth={2} />
              </G>
            );
          })}
          <Circle cx={10} cy={185} r={8} fill={gold} stroke={ink} />
          <Path d="M23 265q12-25 24 0-12 20-24 0Z" fill={trace.solved ? gold : sage} stroke={ink} />
        </Svg>
        {MIRROR_POSITIONS.map(([x, y], i) => (
          <Pressable
            key={i}
            testID={`activity-cell-${i}`}
            accessibilityRole="button"
            accessibilityLabel={`转动第${i + 1}块反射镜`}
            disabled={!playing}
            hitSlop={4}
            onPress={() => cell(i)}
            style={({ pressed }) => ({
              position: 'absolute',
              left: (10 + x * 50) * mirrorScale,
              top: (10 + y * 50) * mirrorScale,
              width: 50 * mirrorScale,
              height: 50 * mirrorScale,
              borderRadius: 12,
              backgroundColor: pressed ? '#ffffff55' : 'transparent',
            })}
          />
        ))}
      </View>
    );
  }
  if (d.kind === 'push') {
    const l = pushLayout(d);
    return (
      <View style={{ gap: 10 }}>
        <Grid count={25} columns={5}>
          {(i) => (
            <View
              style={{
                aspectRatio: 1,
                borderRadius: 8,
                backgroundColor: l.walls.includes(i)
                  ? '#c0b49a'
                  : i === l.goal
                    ? '#ecd795'
                    : '#e9e6d7',
                borderWidth: 1,
                borderColor: '#c8bfa7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Svg width="100%" height="100%" viewBox="0 0 50 50" aria-hidden>
                {l.walls.includes(i) ? (
                  <Path
                    d="M6 17h38M6 34h38M18 3v14m17 0v17M18 34v13"
                    stroke="#a39883"
                    fill="none"
                  />
                ) : i === run.aux ? (
                  <>
                    <Rect
                      x={5}
                      y={6}
                      width={40}
                      height={37}
                      rx={10}
                      fill="#b1b5a2"
                      stroke={ink}
                      strokeWidth={2}
                    />
                    <Path d="m12 17 10-5 14 5-8 12Z" fill="#cbd0b7" />
                  </>
                ) : i === run.cursor ? (
                  <>
                    <Ellipse cx={25} cy={42} rx={13} ry={4} fill="#76745f" opacity={0.2} />
                    <Circle cx={25} cy={18} r={10} fill="#c9aa7b" stroke={ink} />
                    <Path d="M13 42V31q12-13 24 0v11Z" fill={sage} stroke={ink} />
                  </>
                ) : i === l.goal ? (
                  <Path d="m25 10 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2Z" fill={gold} />
                ) : null}
              </Svg>
            </View>
          )}
        </Grid>
        <View style={{ alignItems: 'center', gap: 4 }}>
          {control('up', '↑ 上')}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {control('left', '← 左')}
            {control('down', '↓ 下')}
            {control('right', '右 →')}
          </View>
        </View>
      </View>
    );
  }
  if (d.kind === 'excavate')
    return (
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          <Button selected={run.cursor !== 1} onPress={() => onAction({ kind: 'tool', index: 0 })}>
            细凿 · 1支撑
          </Button>
          <Button selected={run.cursor === 1} onPress={() => onAction({ kind: 'tool', index: 1 })}>
            小锤 · 3支撑
          </Button>
        </View>
        <Label style={{ textAlign: 'center' }}>
          支撑 {run.value}/18　矿晶 {miningTargets.filter((i) => run.board[i] === 0).length}/3
        </Label>
        <Grid count={25} columns={5}>
          {(i) => (
            <Tile
              id={`activity-cell-${i}`}
              label={`敲击岩层${i + 1}，剩${run.board[i]}层${miningTargets.includes(i) ? '，有矿晶纹路' : ''}`}
              onPress={() => cell(i)}
              disabled={!playing || run.board[i] === 0}
            >
              <Plate>
                <Rect
                  x={9}
                  y={9}
                  width={62}
                  height={62}
                  rx={12}
                  fill={run.board[i] === 2 ? '#c3b095' : run.board[i] === 1 ? '#d9c8a8' : '#eee6d2'}
                />
                <Path
                  d="m13 22 18 9-7 18 29 10m-8-45-6 17 25 10"
                  stroke="#a59177"
                  strokeWidth={2}
                  fill="none"
                />
                {miningTargets.includes(i) && (
                  <Path
                    d="m40 19 16 21-16 23-16-23Z"
                    fill={run.board[i] === 0 ? blue : '#d8cfb9'}
                    stroke={ink}
                    strokeWidth={run.board[i] === 0 ? 2 : 1}
                    opacity={run.board[i] === 2 ? 0.45 : 1}
                  />
                )}
              </Plate>
            </Tile>
          )}
        </Grid>
      </View>
    );
  if (d.kind === 'garden')
    return (
      <View style={{ gap: 12 }}>
        <Grid count={3} columns={3}>
          {(i) => (
            <Tile
              id={`activity-cell-${i}`}
              label={`照顾第${i + 1}盆，${['未播种', '已播种待浇水', '土壤湿润', '土壤积水'][run.board[i]!]}`}
              onPress={() => cell(i)}
              disabled={!playing}
            >
              <Plate>
                <Path d="m18 45 7 23h30l7-23Z" fill="#c6ab8a" stroke={ink} strokeWidth={2} />
                <Ellipse
                  cx={40}
                  cy={46}
                  rx={23}
                  ry={6}
                  fill={run.board[i]! >= 2 ? blue : '#ad9877'}
                  stroke={ink}
                />
                {run.board[i]! > 0 && (
                  <G stroke="#798e70" strokeWidth={2}>
                    <Path
                      d="M40 46V24m0 11q-21-18-23-2 9 10 23 2m0-7q21-19 23-2-8 11-23 2"
                      fill={sage}
                    />
                  </G>
                )}
                {run.board[i] === 3 && (
                  <Path d="M18 50q22 12 44 0" fill="none" stroke="#739dba" strokeWidth={4} />
                )}
              </Plate>
            </Tile>
          )}
        </Grid>
        <Label style={{ textAlign: 'center' }}>遮阳棚：{['全阳', '半阴', '全阴'][run.aux]}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {control('shade', '调整遮阳')}
          {control('drain', '排出积水', !run.board.includes(3))}
          {control('grow', '观察生长')}
        </View>
      </View>
    );
  if (d.kind === 'fish')
    return (
      <View style={{ gap: 12 }}>
        <Svg width="100%" height={180} viewBox="0 0 360 180" aria-hidden>
          <Rect x={6} y={10} width={348} height={164} rx={40} fill="#d9dfca" />
          <Path
            d="M17 90q64-79 157-31 91-49 166 21v69H17Z"
            fill={blue}
            stroke="#eef2dc"
            strokeWidth={5}
          />
          {[50, 125, 235, 290].map((x) => (
            <Path key={x} d={`M${x} 120q13 5 26 0`} fill="none" stroke="#edf4e8" strokeWidth={2} />
          ))}
          <Path d="m295 20-90 90" stroke={ink} strokeWidth={4} />
          <Path d={`M205 110q-15 26-55 ${run.stage === 2 ? 15 : 29}`} fill="none" stroke={ink} />
          <Ellipse
            cx={143}
            cy={run.stage === 2 ? 122 : 140}
            rx={16}
            ry={7}
            fill={run.value >= 2 && run.stage === 1 ? gold : '#faf2da'}
          />
          <Path
            d="m90 123-12-10v20Zm0 0q37-25 54 0-17 26-54 0Z"
            fill="#c5d1b4"
            stroke={ink}
            strokeWidth={1.5}
          />
        </Svg>
        {run.stage === 0 ? (
          <>
            <View
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}
            >
              {['芦苇浅岸', '潮沟深水'].map((name, i) => (
                <Button key={i} selected={run.board[0] === i} onPress={() => cell(i)}>
                  {name}
                </Button>
              ))}
            </View>
            {control('cast', '投竿')}
          </>
        ) : run.stage === 1 ? (
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}
          >
            {control('wait', '观察浮漂')}
            {control('hook', '提竿')}
          </View>
        ) : (
          <>
            <Label>收线进度 {Math.min(4, run.value)}/4</Label>
            {bar(run.value, 4, sage)}
            <Label>钓线张力 {run.aux}/7 · 保持在1至6</Label>
            {bar(run.aux, 7, run.aux >= 6 ? '#cc957c' : gold)}
            <View
              style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}
            >
              {control('reel', '收线 · 张力+2')}
              {control('slack', '放线 · 张力−2')}
            </View>
          </>
        )}
      </View>
    );
  if (d.kind === 'bells')
    return (
      <View style={{ gap: 12 }}>
        <Svg width="100%" height={55} viewBox="0 0 320 55" aria-hidden>
          <Path d="M12 24q145-20 296 0" fill="none" stroke={ink} strokeWidth={4} />
          <Path
            d="M30 21q-20-23-24-6 9 13 24 6m260 0q20-23 24-6-9 13-24 6"
            fill={sage}
            stroke={ink}
          />
        </Svg>
        <Grid count={4} columns={4}>
          {(i) => (
            <Tile
              id={`activity-cell-${i}`}
              label={`音高${run.board[i]}的铃片，第${i + 1}位`}
              onPress={() => cell(i)}
              selected={run.cursor === i}
              disabled={!playing}
            >
              <Plate>
                <Path d={`M40 0v${12 + run.board[i]! * 3}`} stroke={ink} strokeWidth={2} />
                <Path
                  d={`M28 18q12-8 24 0l5 ${run.board[i]! * 7 + 13}H23Z`}
                  fill={i % 2 ? blue : gold}
                  stroke={ink}
                  strokeWidth={2}
                />
                <Circle cx={40} cy={60} r={4} fill={ink} />
                <SvgText x={40} y={43} textAnchor="middle" fontSize={17} fill={ink}>
                  {run.board[i]}
                </SvgText>
              </Plate>
            </Tile>
          )}
        </Grid>
        <Label muted style={{ textAlign: 'center' }}>
          低音　1　2　3　4　高音
        </Label>
      </View>
    );
  if (d.kind === 'forge')
    return (
      <View style={{ gap: 12 }}>
        <Svg width="100%" height={170} viewBox="0 0 320 170" aria-hidden>
          <Ellipse cx={160} cy={155} rx={102} ry={7} fill="#b6a78c" opacity={0.2} />
          <Path
            d="M71 80h177l-39 31-13 31h-89l10-31Z"
            fill="#a9b7ae"
            stroke={ink}
            strokeWidth={3}
          />
          <Path
            d="M99 72h102v13H99Z"
            fill={run.value >= 3 ? '#d7a17f' : '#b8bca5'}
            stroke={ink}
            strokeWidth={2}
          />
          <Path d="m229 55 21-23 24 18-21 23Z" fill="#b5ada0" stroke={ink} strokeWidth={2} />
          <Path d="m239 60-30 33" stroke="#bfa17b" strokeWidth={9} />
          <Path
            d="M48 131q-18-22 3-42-4 18 8 21 4-12 9-17 15 32-4 42Z"
            fill={run.value > 4 ? '#d59a73' : gold}
            stroke={ink}
            strokeWidth={2}
          />
        </Svg>
        <Label>
          当前温度 {Math.min(9, run.value)} / 目标 {forgeTargets[run.stage] ?? '完成'}　锻打{' '}
          {run.stage}/3　裂纹 {run.aux}/3
        </Label>
        {bar(run.value, 7, run.value === forgeTargets[run.stage] ? sage : gold)}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          {control('heat', '添火 +2')}
          {control('cool', '通风 −1')}
          {control('strike', '落锤')}
        </View>
      </View>
    );
  if (d.kind === 'balance') {
    const weights = balanceWeights(d),
      sums = [1, 2].map((side) =>
        run.board.reduce((sum, n, i) => sum + (n === side ? weights[i]! : 0), 0),
      );
    const tilt = Math.max(-18, Math.min(18, (sums[0]! - sums[1]!) * 4));
    return (
      <View style={{ gap: 12 }}>
        <Svg width="100%" height={190} viewBox="0 0 320 190" aria-hidden>
          <Path d="M150 170V49h20v121m-52 0h84" fill="#c3b08b" stroke={ink} strokeWidth={3} />
          <Path d={`M50 ${62 + tilt} 270 ${62 - tilt}`} stroke={ink} strokeWidth={5} />
          <Circle cx={160} cy={62} r={11} fill={gold} stroke={ink} />
          <G stroke={ink} strokeWidth={2}>
            {[70, 250].map((x, i) => (
              <G key={x} transform={`translate(0 ${i === 0 ? tilt : -tilt})`}>
                <Path d={`M${x} 62v64m-30 0 30-64 30 64`} fill="none" />
                <Path d={`M${x - 34} 126q34 34 68 0Z`} fill={blue} />
                {run.board.map((side, n) =>
                  side === i + 1 ? (
                    <Circle key={n} cx={x - 21 + n * 14} cy={120} r={8} fill={gold} />
                  ) : null,
                )}
                <SvgText x={x} y={173} textAnchor="middle" fontSize={18} fill={ink}>
                  {sums[i]}/{balanceTarget(d)}
                </SvgText>
              </G>
            ))}
          </G>
        </Svg>
        <Grid count={4} columns={4}>
          {(i) => (
            <Tile
              id={`activity-cell-${i}`}
              label={`${weights[i]}点砝码，当前${['在桌面', '在左盘', '在右盘'][run.board[i]!]}`}
              onPress={() => cell(i)}
              disabled={!playing}
              selected={run.board[i] !== 0}
            >
              <Plate>
                <Circle cx={40} cy={36} r={23} fill={gold} stroke={ink} strokeWidth={2} />
                <SvgText x={40} y={43} textAnchor="middle" fontSize={22} fill={ink}>
                  {weights[i]}
                </SvgText>
                <SvgText x={40} y={68} textAnchor="middle" fontSize={12} fill={ink}>
                  {['桌面', '左盘', '右盘'][run.board[i]!]}
                </SvgText>
              </Plate>
            </Tile>
          )}
        </Grid>
      </View>
    );
  }
  return (
    <Grid count={9} columns={3}>
      {(i) => (
        <Tile
          id={`activity-cell-${i}`}
          label={run.board[i] ? `移动${run.board[i]}号徽章拓片` : '空格'}
          onPress={() => cell(i)}
          disabled={!playing || run.board[i] === 0}
        >
          <Plate>
            {run.board[i]! > 0 && (
              <>
                <Path
                  d="m40 13 19 12-4 25-15 10-15-10-4-25Z"
                  fill={i % 2 ? blue : sage}
                  stroke={ink}
                  strokeWidth={2}
                />
                <SvgText x={40} y={45} textAnchor="middle" fontSize={24} fill={ink}>
                  {run.board[i]}
                </SvgText>
              </>
            )}
          </Plate>
        </Tile>
      )}
    </Grid>
  );
}
