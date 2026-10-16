export const PLAYER_APPEARANCES = [
  { id: 0, name: '青杉旅人', atlas: 'traveler', description: '短发 · 青蓝外套 · 棕色便帽' },
  { id: 1, name: '藤野旅人', atlas: 'ranger', description: '长发 · 紫色外套 · 浅色宽檐帽' },
] as const;

export const playerAppearance = (avatar: number) =>
  PLAYER_APPEARANCES.find((appearance) => appearance.id === avatar) ?? PLAYER_APPEARANCES[0];
