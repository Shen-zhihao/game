import { View } from 'react-native';
import { SPECIES } from '../../content/catalog';
import {
  FISHING_REGIONS,
  FISHING_REGION_NAMES,
  FISHING_SITES,
  fishingRegion,
  type FishingRegion,
} from '../../content/fishing';
import { fishingCatchCount } from '../../game/fishing';
import type { GameState } from '../../game/model';
import { Button, Label, palette } from '../ui';

export function FishingJournal({
  game,
  onClaim,
}: {
  game: GameState;
  onClaim?: (region: FishingRegion) => void;
}) {
  return (
    <View
      testID="fishing-journal"
      style={{ gap: 10, padding: 12, backgroundColor: palette.panel2, borderRadius: 12 }}
    >
      <Label style={{ fontWeight: '800' }}>地区垂钓手册 · 捕捉 {fishingCatchCount(game)} 次</Label>
      <Label muted>
        仅记录垂钓遭遇中成功投球的伙伴，收线、击败或逃跑不计入。岸边面向水面可选「垂钓」，按 A
        仍是直接调查。
      </Label>
      {FISHING_REGIONS.map((region) => {
        const count = fishingCatchCount(game, region);
        const claimed = game.fishing?.claimed.includes(region);
        const entries = (game.fishing?.catches ?? []).filter(
          (entry) => fishingRegion(entry.siteId) === region,
        );
        return (
          <View key={region} style={{ gap: 5 }}>
            <Label style={{ fontWeight: '700' }}>
              {FISHING_REGION_NAMES[region]} · 捕捉 {count} 次 ·{' '}
              {claimed ? '首钓奖励已领取' : count ? '首钓奖励可领取' : '首钓 0/1'}
            </Label>
            <Label muted>
              首次捕捉：水网星纹球 ×3、旅费 120。
              {!onClaim && count > 0 && !claimed ? '进入任意垂钓界面领取。' : ''}
            </Label>
            {entries.map((entry) => (
              <Label key={`${entry.siteId}:${entry.speciesId}`} muted>
                {FISHING_SITES.find((site) => site.id === entry.siteId)?.name} ·{' '}
                {SPECIES[entry.speciesId]?.name} ×{entry.count}
              </Label>
            ))}
            {onClaim && count > 0 && !claimed && (
              <Button small testID={`fishing-claim-${region}`} onPress={() => onClaim(region)}>
                领取{FISHING_REGION_NAMES[region]}首钓奖励
              </Button>
            )}
          </View>
        );
      })}
    </View>
  );
}
