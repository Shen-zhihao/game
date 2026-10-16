/** Atlas coordinates are data; renderers own static native require() references. */
export const EXPANSION_ATLAS_IDS = {
  urban: [226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 38, 10, 13, 16, 27, 40],
  mirror_a: [141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 238, 239, 240, 241, 242, 243],
  mirror_b: [244, 245, 246, 247, 248, 249, 250, 78, 138, 139, 193, 194, 195, 236, 237, 200],
  field_a: [57, 58, 65, 66, 67, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161],
  field_b: [162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 185, 186],
  fire_a: [117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 215, 216, 217, 218],
  fire_b: [219, 220, 221, 222, 223, 224, 225, 176, 177, 178, 179, 180, 181, 182, 183, 184],
  wind_a: Array.from({ length: 16 }, (_, i) => 100 + i),
  wind_b: [116, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 42],
  forest_a: [3, 6, 9, 11, 12, 19, 20, 21, 22, 23, 24, 26, 28, 29, 30, 31],
  forest_b: [32, 33, 34, 35, 36, 39, 41, 46, 47, 48, 51, 52, 53, 54, 55, 56],
};
export const EXPANSION_SPRITES = Object.fromEntries(
  Object.entries(EXPANSION_ATLAS_IDS).flatMap(([atlas, ids]) =>
    ids.map((n, cell) => [
      `creature_${String(n).padStart(3, '0')}`,
      { atlas: atlas as keyof typeof EXPANSION_ATLAS_IDS, cell },
    ]),
  ),
);
