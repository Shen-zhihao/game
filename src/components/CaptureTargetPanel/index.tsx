import { View } from 'react-native';
import { SPECIES } from '../../content/catalog';
import { MAPS } from '../../content/world';
import {
  captureSites,
  captureTarget,
  captureTimeHint,
  nearbyVisitedTowns,
} from '../../game/captureTracking';
import type { Command, GameState, MapId } from '../../game/model';
import { Button, Label, Panel } from '../ui';

export function CaptureTargetPanel({
  game,
  speciesId,
  dispatch,
  onOpenRegion,
}: {
  game: GameState;
  speciesId: string;
  dispatch?: (command: Command) => void;
  onOpenRegion: (map: MapId) => void;
}) {
  if (!game.dex.seen.includes(speciesId) || game.dex.caught.includes(speciesId)) return null;
  const tracked = captureTarget(game) === speciesId;
  const sites = captureSites(speciesId);
  return (
    <Panel>
      <Label>
        图鉴收集 · {SPECIES[speciesId]!.name}
        {tracked ? ' · 追踪中' : ''}
      </Label>
      <Label muted>{captureTimeHint(game, speciesId)}</Label>
      {dispatch && (
        <Button
          small
          testID="dex-track-capture"
          selected={tracked}
          onPress={() => dispatch({ kind: 'trackCapture', speciesId: tracked ? null : speciesId })}
        >
          {tracked ? '取消收集追踪' : '追踪此精灵'}
        </Button>
      )}
      {sites.map((site) => {
        const towns = nearbyVisitedTowns(game, site.map!);
        return (
          <View key={site.id} style={{ gap: 5 }}>
            <Button small testID={`capture-map-${site.id}`} onPress={() => onOpenRegion(site.map!)}>
              查看地图 · {site.name}
            </Button>
            <Label muted>{site.description}</Label>
            <Label muted>
              {site.medium === 'water'
                ? '在岸边面向水面调查；垂钓还需满足当地条件。'
                : '在当地草丛或碎石生境探索。'}
            </Label>
            <Label muted>
              相邻已到访城镇：
              {towns.length ? towns.map((town) => MAPS[town].name).join('、') : '暂无'}
              。地图查看不会传送，也不会解锁道路。
            </Label>
          </View>
        );
      })}
      <Label muted>获得后自动完成；不替换剧情任务追踪。</Label>
    </Panel>
  );
}
