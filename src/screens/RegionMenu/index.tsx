import { RegionalHandbook } from '../../components/RegionalHandbook';
import { FishingJournal } from '../../components/FishingJournal';
import { HabitatDetails } from '../../components/HabitatDetails';
import { CaptureTargetPanel } from '../../components/CaptureTargetPanel';
import { captureSites, captureTarget } from '../../game/captureTracking';
import { SPECIES } from '../../content/catalog';
import { HapticPressable as Pressable } from '../../components/HapticPressable';
import { useMemo, useState } from 'react';
import { Image as RasterImage, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { MAP_IMAGES, MAP_IMAGE_REVISIONS } from '../../components/sceneAssets';
import { mapImageSource } from '../../components/sceneAssets/mapSource';
import { Button, Label, palette } from '../../components/ui';
import {
  localMapPoint,
  regionPlaceForMap,
  regionRoadOpen,
  REGION_PLACES,
  REGION_ROADS,
  REGION_SIZE,
  RegionPlace,
} from '../../content/region';
import { MAPS, isTown } from '../../content/world';
import { Command, GameState, MapId, TownId } from '../../game/model';
import { HABITAT_SITES } from '../../content/habitats';
import { TileMapLayers } from '../../components/TileMap';
import { layoutRegionLabels } from '../../content/regionLabels';
import { ADVENTURE_GYMS } from '../../content/adventure';
import { CITY_TOWNS, CITY_IDENTITIES, cityLayout } from '../../content/cityDistricts';
import { fastTravelBlockedReason, hasVisitedTown } from '../../game/travel';
import { CITY_ACTIVITIES } from '../../content/fieldActivities';

function LocalMap({ game, map }: { game: GameState; map: MapId }) {
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [failedMap, setFailedMap] = useState<MapId | null>(null);
  const source = mapImageSource(map);
  const data = MAPS[map];
  const width = data.rows[0]!.length * 32;
  const height = data.rows.length * 32;
  const point = localMapPoint(map, game.player.x, game.player.y);
  const town = CITY_TOWNS.find((id) => id === map);
  const layout = town && cityLayout(town);
  const quarters = town && CITY_IDENTITIES[town].quarters;
  const scale = Math.min(frame.width / width, frame.height / height);
  const displayWidth = width * scale;
  const displayHeight = height * scale;
  const raster = MAP_IMAGES[map] && failedMap !== map;
  return (
    <View
      testID={`local-map-${map}`}
      style={{ flex: 1 }}
      onLayout={({ nativeEvent: { layout } }) =>
        setFrame({ width: layout.width, height: layout.height })
      }
      accessibilityLabel={`${data.name}完整地图${game.player.map === map ? '，红色箭头为你的位置' : ''}`}
    >
      <View
        style={{
          position: 'absolute',
          left: (frame.width - displayWidth) / 2,
          top: (frame.height - displayHeight) / 2,
          width: displayWidth,
          height: displayHeight,
        }}
      >
        {raster && (
          <RasterImage
            key={`${map}:${MAP_IMAGE_REVISIONS[map]}`}
            source={source}
            resizeMode="stretch"
            fadeDuration={0}
            // Native Image supplies the asset's intrinsic dimensions before our style.
            // Insets alone do not override them: size the raster to the same fitted
            // rectangle as the marker layer, rather than clipping the full-size PNG.
            style={[StyleSheet.absoluteFill, { width: displayWidth, height: displayHeight }]}
            onError={() => setFailedMap(map)}
          />
        )}
        {/* Keep markers in a separate upper layer: async raster loading must not cover them. */}
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          {!raster && <TileMapLayers map={map} />}
          {layout &&
            quarters &&
            [
              { text: quarters[0], x: layout.boulevard + 1, y: 11.7 },
              { text: quarters[1], x: layout.oldWidth / 2, y: layout.oldHeight + 11.5 },
              { text: quarters[2], x: layout.gardenX, y: layout.gardenY - 4.5 },
            ].map((label) => (
              <G key={label.text} transform={`translate(${label.x * 32},${label.y * 32})`}>
                <Rect
                  x={-label.text.length * 15 - 10}
                  y={-22}
                  width={label.text.length * 30 + 20}
                  height={36}
                  rx={9}
                  fill="#fffcf5ed"
                  stroke="#b9a986"
                  strokeWidth={1.5}
                />
                <SvgText textAnchor="middle" fontSize={26} fontWeight="700" fill="#655541" y={5}>
                  {label.text}
                </SvgText>
              </G>
            ))}
          {game.player.map === map && (
            <G
              testID="local-player-pin"
              transform={`translate(${point.x * width},${point.y * height})`}
            >
              <Circle r={24} fill="#122d27bb" stroke="#fff3b7" strokeWidth={3} />
              <Path
                d="M0 -20 L15 15 L0 8 L-15 15 Z"
                fill="#f1846d"
                stroke="#fff7d6"
                strokeWidth={4}
              />
            </G>
          )}
        </Svg>
      </View>
    </View>
  );
}

function WorldMap({
  selected,
  current,
  onSelect,
}: {
  selected: string;
  current: string;
  onSelect: (place: RegionPlace) => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const labels = useMemo(
    () => layoutRegionLabels(REGION_PLACES, selected, current),
    [selected, current],
  );
  const scale = Math.min(size.width / REGION_SIZE.width, size.height / REGION_SIZE.height);
  const left = (size.width - REGION_SIZE.width * scale) / 2;
  const top = (size.height - REGION_SIZE.height * scale) / 2;
  return (
    <View
      testID="region-world-map"
      style={{ flex: 1 }}
      onLayout={({ nativeEvent: { layout } }) =>
        setSize({ width: layout.width, height: layout.height })
      }
    >
      <Svg width="100%" height="100%" viewBox="0 0 600 420" pointerEvents="none">
        <Rect width={600} height={420} rx={16} fill="#ebe1c9" />
        {[60, 120, 180, 240, 300, 360, 420, 480, 540].map((x) => (
          <Line key={x} x1={x} y1={0} x2={x} y2={420} stroke="#ddd1b5" strokeWidth={1} />
        ))}
        {[60, 120, 180, 240, 300, 360].map((y) => (
          <Line key={y} x1={0} y1={y} x2={600} y2={y} stroke="#ddd1b5" strokeWidth={1} />
        ))}
        <Path
          d="M45 306 L35 270 57 220 50 161 65 112 98 57 161 43 198 8 250 14 309 34 362 23 405 41 442 54 453 89 509 83 551 119 547 167 524 191 538 234 517 282 535 326 515 381 462 391 417 368 358 390 310 380 269 398 220 379 170 397 119 380 72 389 40 353 Z"
          fill="#d3c69c"
          stroke="#a89b73"
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <Path
          d="M70 300 L85 252 141 217 190 231 230 207 283 227 327 267 302 310 243 315 207 287 144 311 Z"
          fill="#b0b88b"
        />
        <Path d="M80 135 L112 78 150 134 179 88 219 145 176 174 117 168 Z" fill="#b7ac91" />
        <Path d="M135 92 L150 134 120 133 Z M167 110 L179 88 194 116 Z" fill="#f8f0d8" />
        <Path
          d="M330 137 C360 110 403 134 416 162 C429 184 404 202 388 188 C361 184 345 166 330 137 Z"
          fill="#8caaa3"
          stroke="#c5d6ca"
          strokeWidth={3}
        />
        <Path
          d="M366 195 Q351 236 383 266 T440 327"
          stroke="#8caaa3"
          strokeWidth={11}
          fill="none"
        />
        <Path d="M485 96 l24 23 -15 24 -26 -20 Z" fill="#c4b99d" />
        {REGION_ROADS.map(([from, to]) => {
          const a = REGION_PLACES.find((place) => place.id === from)!;
          const b = REGION_PLACES.find((place) => place.id === to)!;
          const available = regionRoadOpen(from, to);
          return (
            <Line
              key={`${from}-${to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={available ? '#f4dc9f' : '#ced1ac'}
              strokeWidth={available ? 6 : 3}
              strokeDasharray={available ? undefined : '7 6'}
            />
          );
        })}
        <G fill="#b6a98d" opacity={0.75}>
          <SvgText x={563} y={30} fontSize={16} textAnchor="middle">
            北
          </SvgText>
          <Path d="M563 39 l-6 15 6 -4 6 4 Z" />
          <SvgText x={555} y={360} fontSize={14} textAnchor="middle">
            苔海
          </SvgText>
        </G>
        {REGION_PLACES.map((place) => {
          const active = selected === place.id;
          const here = current === place.id;
          return (
            <G key={place.id}>
              {active && (
                <Circle
                  cx={place.x}
                  cy={place.y}
                  r={21}
                  stroke="#ffe3a1"
                  strokeWidth={3}
                  fill="#cbb06b55"
                />
              )}
              {place.kind === 'town' || place.kind === 'league' ? (
                <Rect
                  x={place.x - 8}
                  y={place.y - 7}
                  width={16}
                  height={14}
                  rx={3}
                  fill={place.map ? '#f4d994' : '#becbb1'}
                  stroke="#827653"
                  strokeWidth={3}
                />
              ) : (
                <Circle
                  cx={place.x}
                  cy={place.y}
                  r={6}
                  fill={place.map ? '#d8c687' : '#c5bfae'}
                  stroke="#827653"
                  strokeWidth={2}
                />
              )}
              {here && (
                <Path
                  d={`M${place.x + 10} ${place.y - 25} l15 0 -7.5 12 Z`}
                  fill="#ff9a7e"
                  stroke="#fff6d1"
                  strokeWidth={2}
                />
              )}
            </G>
          );
        })}
        {labels.map((label) => {
          const active = label.id === selected;
          const toX = Math.max(label.x, Math.min(label.x + label.width, label.anchor.x));
          const toY = Math.max(label.y, Math.min(label.y + label.height, label.anchor.y));
          return (
            <G key={`label-${label.id}`} testID={`region-label-${label.id}`}>
              <Line
                x1={label.anchor.x}
                y1={label.anchor.y}
                x2={toX}
                y2={toY}
                stroke={active ? '#a36c18' : '#b4a889'}
                strokeWidth={active ? 1.5 : 0.8}
              />
              <Rect
                x={label.x}
                y={label.y}
                width={label.width}
                height={label.height}
                rx={4}
                fill={active ? '#fff0c4' : '#fffcf5'}
                fillOpacity={0.96}
                stroke={active ? '#b47b20' : '#ded2bd'}
                strokeWidth={0.7}
              />
              {label.lines.map((text, i) => (
                <SvgText
                  key={i}
                  x={label.x + label.width / 2}
                  y={label.y + 3 + label.fontSize + i * (label.fontSize + 3)}
                  fontSize={label.fontSize}
                  fontWeight={active ? '800' : '600'}
                  textAnchor="middle"
                  fill="#362f26"
                >
                  {text}
                </SvgText>
              ))}
            </G>
          );
        })}
      </Svg>
      {scale > 0 &&
        REGION_PLACES.map((place) => (
          <Pressable
            key={place.id}
            testID={`region-place-${place.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${place.name}${current === place.id ? '，当前位置' : ''}${place.map ? '' : '，尚未开放'}`}
            accessibilityState={{ selected: selected === place.id }}
            onPress={() => onSelect(place)}
            style={({ pressed }) => [
              s.mapTarget,
              { left: left + place.x * scale - 22, top: top + place.y * scale - 22 },
              pressed && { backgroundColor: '#ffdda33a', transform: [{ scale: 0.92 }] },
            ]}
          />
        ))}
      {scale > 0 &&
        labels.map((label) => (
          <Pressable
            key={`label-hit-${label.id}`}
            testID={`region-label-target-${label.id}`}
            accessibilityRole="button"
            accessibilityLabel={`查看${REGION_PLACES.find((p) => p.id === label.id)!.name}`}
            onPress={() => onSelect(REGION_PLACES.find((p) => p.id === label.id)!)}
            style={{
              position: 'absolute',
              left: left + label.x * scale,
              top: top + label.y * scale,
              width: label.width * scale,
              height: label.height * scale,
            }}
          />
        ))}
    </View>
  );
}

export function RegionMenu({
  game,
  initialMap,
  onTravel,
  dispatch,
}: {
  game: GameState;
  initialMap?: MapId;
  dispatch?: (command: Command) => void;
  onTravel: (town: TownId) => void;
}) {
  const [contentWidth, setContentWidth] = useState(600);
  const [showDetails, setShowDetails] = useState(false);
  const narrow = contentWidth < 540;
  const target = captureTarget(game);
  const current = regionPlaceForMap(game.player.map);
  const [selected, setSelected] = useState(regionPlaceForMap(initialMap ?? game.player.map).id);
  const [local, setLocal] = useState<MapId | null>(initialMap ?? null);
  const place = REGION_PLACES.find((p) => p.id === selected)!;
  const town = place.map && isTown(place.map) ? place.map : null;
  const travelBlocked = town ? fastTravelBlockedReason(game, town) : null;
  const selectPlace = (p: RegionPlace) => {
    setSelected(p.id);
    setLocal(null);
    setShowDetails(true);
  };
  const openLocal = (map: MapId) => {
    setSelected(regionPlaceForMap(map).id);
    setLocal(map);
    setShowDetails(false);
  };
  return (
    <View
      testID="region-menu"
      style={s.root}
      onLayout={({ nativeEvent }) => setContentWidth(nativeEvent.layout.width)}
    >
      <View style={s.heading}>
        <View>
          <Label style={{ fontSize: 20, fontWeight: '800', color: palette.gold }}>星苔地区</Label>
          <Label muted style={{ fontSize: 11 }}>
            当前位置 · {MAPS[game.player.map].name}
          </Label>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {narrow && (
            <Button
              small
              testID="map-toggle-details"
              selected={showDetails}
              onPress={() => setShowDetails(!showDetails)}
            >
              {showDetails ? '查看地图' : '地点详情'}
            </Button>
          )}
          <Button
            small
            testID="map-locate-player"
            onPress={() => {
              setSelected(current.id);
              setLocal(null);
              setShowDetails(false);
            }}
          >
            ◎ 定位自己
          </Button>
        </View>
      </View>
      {target && (
        <Button
          small
          testID="map-capture-target"
          onPress={() => {
            const site = captureSites(target)[0];
            if (site?.map) openLocal(site.map);
            else setShowDetails(true);
          }}
        >
          图鉴追踪 · {SPECIES[target]!.name} ·{' '}
          {captureSites(target).length ? '查看生境' : '查看获取说明'}
        </Button>
      )}
      <View style={s.body}>
        {(!narrow || !showDetails) && (
          <View style={s.board}>
            {local ? (
              <>
                <View style={s.localHeading}>
                  <Label style={{ fontWeight: '700' }}>{MAPS[local].name} · 街区全图</Label>
                  <Button small testID="map-back-world" onPress={() => setLocal(null)}>
                    返回全境
                  </Button>
                </View>
                <View style={{ flex: 1, margin: 8 }}>
                  <LocalMap game={game} map={local} />
                </View>
              </>
            ) : (
              <WorldMap selected={selected} current={current.id} onSelect={selectPlace} />
            )}
            <Label muted style={s.legend}>
              {local
                ? '▲ 你的位置　街区名称标在全图上，沿建筑正门可进入室内'
                : '▲ 你的位置　点选地点查看小地图与道路连接'}
            </Label>
          </View>
        )}
        {(!narrow || showDetails) && (
          <ScrollView
            key={place.id}
            testID="region-place-details"
            style={[s.detail, narrow && { width: '100%', maxWidth: undefined, minWidth: 0 }]}
            contentContainerStyle={{ gap: 9, paddingBottom: 16 }}
          >
            {target && (
              <CaptureTargetPanel
                game={game}
                speciesId={target}
                dispatch={dispatch}
                onOpenRegion={openLocal}
              />
            )}
            {target && !captureSites(target).length && (
              <HabitatDetails speciesId={target} seenSpeciesIds={game.dex.seen} />
            )}
            <Label style={{ fontSize: 19, fontWeight: '800' }}>{place.name}</Label>
            <Label style={{ color: place.map ? palette.accent : palette.gold, fontSize: 12 }}>
              {place.map
                ? `${current.id === place.id ? '你在这里 · ' : ''}已开放 · 可探索`
                : '后续旅程 · 尚未开放'}
            </Label>
            {town && (
              <View style={{ gap: 5 }}>
                <Button
                  small
                  testID={`fast-travel-${town}`}
                  disabled={!!travelBlocked}
                  onPress={() => onTravel(town)}
                >
                  {hasVisitedTown(game, town) ? '快速旅行至精灵中心' : '尚未到访'}
                </Button>
                <Label muted style={{ fontSize: 11, lineHeight: 16 }}>
                  {travelBlocked ?? '抵达已到访城市，不恢复伙伴 HP 或 PP。'}
                </Label>
              </View>
            )}
            {place.map && (
              <Pressable
                testID="map-local-preview"
                accessibilityRole="button"
                accessibilityLabel={`放大${place.name}街区地图`}
                onPress={() => openLocal(place.map!)}
                style={({ pressed }) => [s.preview, pressed && { opacity: 0.7 }]}
              >
                <LocalMap game={game} map={place.map} />
                <View style={s.previewHint}>
                  <Label style={{ fontSize: 11 }}>点击放大街区 ↗</Label>
                </View>
              </Pressable>
            )}
            <Label muted style={{ fontSize: 12, lineHeight: 19 }}>
              {place.description}
            </Label>
            <Label style={{ fontSize: 12, color: palette.accent }}>{place.services}</Label>
            {CITY_ACTIVITIES.filter((a) => a.town === place.map).map((a) => (
              <View
                key={a.id}
                testID={`map-activity-${a.town}`}
                style={{ gap: 4, padding: 10, borderRadius: 10, backgroundColor: palette.panel2 }}
              >
                <Label style={{ fontWeight: '700', color: palette.gold }}>
                  {a.title}
                  {game.progress.flags[a.goalFlag] ? ' · 已完成' : ''}
                </Label>
                <Label muted style={{ fontSize: 11 }}>
                  {a.town === 'harbor'
                    ? '潮声滨园北岸 · 垂钓员白汀'
                    : `${CITY_IDENTITIES[a.town!].houses[1]} · 屋内工作台`}
                </Label>
                <Label muted style={{ fontSize: 11 }}>
                  {a.instructions}
                </Label>
              </View>
            ))}
            {place.id === 'moss' && (
              <Button small testID="map-show-gym" onPress={() => openLocal('gym')}>
                查看苔丘道馆
              </Button>
            )}
            {place.id === 'town-2' && (
              <Button small testID="map-show-rock-gym" onPress={() => openLocal('rockGym')}>
                查看砾岩道馆
              </Button>
            )}
            {place.id === 'town-3' && (
              <Button small testID="map-show-water-gym" onPress={() => openLocal('waterGym')}>
                查看潮汐道馆
              </Button>
            )}
            {ADVENTURE_GYMS.filter((g) => place.gym === g.number).map((g) => (
              <Button key={g.map} small onPress={() => openLocal(g.map)}>
                查看{g.badge}道馆
              </Button>
            ))}
            {current.id === place.id &&
              (game.player.map === 'gym' ||
                game.player.map === 'rockGym' ||
                game.player.map === 'waterGym') && (
                <Label muted style={{ fontSize: 11 }}>
                  你正在{MAPS[game.player.map].name}内，点击上方按钮查看馆内位置。
                </Label>
              )}
            <RegionalHandbook
              game={game}
              regionId={place.id}
              onMap={openLocal}
              dispatch={dispatch}
            />
            <FishingJournal game={game} />
            <Label style={{ color: palette.gold, fontSize: 12, fontWeight: '700' }}>生境记录</Label>
            {HABITAT_SITES.filter((s) => s.regionId === place.id).map((site) => (
              <View key={site.id} style={{ gap: 3 }}>
                <Label style={{ fontSize: 12 }}>
                  {site.name}
                  {site.map ? '' : ' · 后续生境'}
                </Label>
                <Label muted style={{ fontSize: 11 }}>
                  {site.description}
                </Label>
                {site.map && site.medium === 'water' && (
                  <Label style={{ fontSize: 11, color: palette.accent }}>
                    岸边朝向水面按 A 调查，或选择「垂钓」，不需渡水。
                  </Label>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  body: { flex: 1, flexDirection: 'row', gap: 14 },
  board: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
    overflow: 'hidden',
  },
  detail: { width: '31%', minWidth: 170, maxWidth: 245 },
  mapTarget: { position: 'absolute', width: 44, height: 44, borderRadius: 22 },
  legend: {
    fontSize: 10,
    lineHeight: 15,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: palette.canvas,
  },
  localHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    gap: 6,
  },
  preview: {
    height: 116,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: 'hidden',
    backgroundColor: palette.panel,
  },
  previewHint: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: `${palette.panel}ee`,
  },
});
