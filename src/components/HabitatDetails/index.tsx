import { View } from 'react-native';
import { SPECIES } from '../../content/catalog';
import { evolutionRequirementsLabel } from '../../game/evolutionRequirements';
import { habitatSite, SPECIES_HABITATS } from '../../content/habitats';
import { dayNightHabitatHint } from '../../game/environment';
import { Label, palette, Panel } from '../ui';

export function HabitatDetails({
  speciesId,
  seenSpeciesIds,
}: {
  speciesId: string;
  seenSpeciesIds?: string[];
}) {
  const profile = SPECIES_HABITATS[speciesId]!;
  const source = profile.sourceSpeciesId ? SPECIES[profile.sourceSpeciesId] : null;
  const edge = source?.evolutions.find((e) => e.toId === speciesId);
  const method =
    source && edge
      ? seenSpeciesIds && !seenSpeciesIds.includes(source.id)
        ? '由尚未发现的前置形态进化获得，发现后显示详细条件。'
        : `${source.name}满足「${evolutionRequirementsLabel(edge)}」后进化获得`
      : profile.method === 'wild'
        ? '普通野生精灵 · 按生境遇见'
        : profile.storyBeat;
  return (
    <Panel style={{ padding: 12, gap: 8, alignSelf: 'stretch' }}>
      <Label style={{ fontWeight: '800', color: palette.gold }}>栖息地 · {profile.ecology}</Label>
      <Label muted style={{ fontSize: 12 }}>
        {profile.description}
      </Label>
      <Label style={{ fontSize: 12 }}>获得方式：{method}</Label>
      <Label testID="habitat-day-night-hint" muted style={{ fontSize: 12 }}>
        活动时段：{dayNightHabitatHint(speciesId)}
      </Label>
      {!profile.obtainableNow && (
        <Label muted style={{ fontSize: 11 }}>
          该物种的获取内容尚未开放，以下为已安排的自然栖地。
        </Label>
      )}
      {profile.siteIds.map((id) => {
        const site = habitatSite(id);
        const encounter = site.encounters.find((e) => e.speciesId === speciesId);
        return (
          <View key={id} style={{ gap: 2 }}>
            <Label style={{ fontSize: 12 }}>
              {site.storySpeciesId &&
              seenSpeciesIds &&
              !seenSpeciesIds.includes(site.storySpeciesId)
                ? '关联剧情栖地（发现对应精灵后显示名称）'
                : site.name}
              {encounter ? ` · Lv.${encounter.min}–${encounter.max}` : ''}
            </Label>
            <Label muted style={{ fontSize: 11 }}>
              {encounter
                ? site.medium === 'water'
                  ? '已开放 · 在岸边面向水面按 A 调查'
                  : '已开放 · 草丛或矿山碎石间探索'
                : site.map && site.medium === 'story' && profile.obtainableNow
                  ? '已开放 · 按剧情条件获得'
                  : site.map
                    ? '自然栖地记录 · 非该形态的直接遭遇点'
                    : '后续生境 · 随地图与物种制作开放'}
            </Label>
          </View>
        );
      })}
    </Panel>
  );
}
