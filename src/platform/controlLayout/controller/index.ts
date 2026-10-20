export const CONTROL_IDS = ['dpad', 'interact', 'menu', 'growth'] as const;
export type ControlId = (typeof CONTROL_IDS)[number];
export const CONTROL_NAMES: Record<ControlId, string> = {
  dpad: '摇杆',
  interact: 'A 键',
  menu: '菜单',
  growth: '培养',
};
export const MIN_CONTROL_SCALE = 0.75;
export const MAX_CONTROL_SCALE = 1.75;
export const DEFAULT_JOYSTICK_OPACITY = 0.85;
export const MIN_JOYSTICK_OPACITY = 0;
export type Orientation = 'landscape' | 'portrait';
export interface ControlPlacement {
  x: number;
  y: number;
  scale: number;
  opacity?: number;
}
export type ControlLayout = Partial<Record<ControlId, ControlPlacement>>;
export interface ControlPreferences {
  version: 1;
  landscape: ControlLayout;
  portrait: ControlLayout;
}
export interface ControlArea {
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export interface ControlFrame {
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
}
export interface ControlPreferenceDriver {
  read: () => unknown;
  write: (value: string) => void;
}
export const controlOrientation = (width: number, height: number): Orientation =>
  width >= height ? 'landscape' : 'portrait';
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const emptyPreferences = (): ControlPreferences => ({ version: 1, landscape: {}, portrait: {} });
function parseLayout(value: unknown): ControlLayout {
  const result: ControlLayout = {};
  if (!value || typeof value !== 'object') return result;
  for (const id of CONTROL_IDS) {
    const placement = (value as Record<string, unknown>)[id];
    if (!placement || typeof placement !== 'object') continue;
    const { x, y, scale, opacity } = placement as ControlPlacement;
    if (![x, y, scale].every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
    result[id] = {
      x: clamp(x, 0, 1),
      y: clamp(y, 0, 1),
      scale: clamp(scale, MIN_CONTROL_SCALE, MAX_CONTROL_SCALE),
      ...(id === 'dpad' && typeof opacity === 'number' && Number.isFinite(opacity)
        ? { opacity: clamp(opacity, MIN_JOYSTICK_OPACITY, 1) }
        : {}),
    };
  }
  return result;
}
function parsePreferences(raw: unknown): ControlPreferences {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!value || value.version !== 1) return emptyPreferences();
    return {
      version: 1,
      landscape: parseLayout(value.landscape),
      portrait: parseLayout(value.portrait),
    };
  } catch {
    return emptyPreferences();
  }
}
function controlSize(id: ControlId, area: ControlArea, scale: number) {
  const tiny = area.height < 300;
  const sizes = {
    dpad: [tiny ? 108 : 132, tiny ? 108 : 132],
    interact: [tiny ? 58 : 70, tiny ? 58 : 70],
    menu: [90, 44],
    growth: [110, 44],
  } as const;
  const [width, height] = sizes[id];
  const fitted = Math.min(
    scale,
    Math.max(1, area.width - area.left - area.right) / width,
    Math.max(1, area.height - area.top - area.bottom) / height,
  );
  return { width: width * fitted, height: height * fitted, scale: fitted };
}
export function resolveControlFrame(
  id: ControlId,
  layout: ControlLayout,
  area: ControlArea,
): ControlFrame {
  const placement = layout[id];
  const size = controlSize(id, area, placement?.scale ?? 1);
  const horizontal = Math.max(0, area.width - area.left - area.right - size.width);
  const vertical = Math.max(0, area.height - area.top - area.bottom - size.height);
  if (placement)
    return {
      ...size,
      left: area.left + horizontal * placement.x,
      top: area.top + vertical * placement.y,
    };
  const defaults: Record<ControlId, [number, number]> = {
    dpad: [16, vertical - 16],
    interact: [horizontal - 22, vertical - (area.height < 300 ? 24 : 40)],
    menu: [horizontal - 14, 10],
    growth: [horizontal - 14, 64],
  };
  return {
    ...size,
    left: area.left + clamp(defaults[id][0], 0, horizontal),
    top: area.top + clamp(defaults[id][1], 0, vertical),
  };
}
/** Place contextual actions around the active, user-positioned controls.
 * A fully covered custom layout has no collision-free solution; in that case
 * choose the least overlap while keeping the entire action inside the safe area.
 */
export function resolveAuxiliaryFrames(
  area: ControlArea,
  obstacles: ControlFrame[],
  count: number,
  decorations: ControlFrame[] = [],
): ControlFrame[] {
  const gap = 6;
  const width = Math.min(104, Math.max(1, area.width - area.left - area.right));
  const height = Math.min(36, Math.max(1, area.height - area.top - area.bottom));
  const minX = area.left;
  const maxX = Math.max(minX, area.width - area.right - width);
  const minY = area.top;
  const maxY = Math.max(minY, area.height - area.bottom - height);
  const occupied = [...obstacles];
  const result: ControlFrame[] = [];
  for (let index = 0; index < count; index++) {
    const preferredX = clamp(area.width - area.right - width - 14, minX, maxX);
    const preferredY = clamp(area.top + 58 + index * (height + gap), minY, maxY);
    const xs = [
      ...new Set([
        preferredX,
        minX,
        maxX,
        ...[...occupied, ...decorations].flatMap((frame) => [
          clamp(frame.left - width - gap, minX, maxX),
          clamp(frame.left + frame.width + gap, minX, maxX),
        ]),
      ]),
    ];
    const ys = [
      ...new Set([
        preferredY,
        minY,
        maxY,
        ...[...occupied, ...decorations].flatMap((frame) => [
          clamp(frame.top - height - gap, minY, maxY),
          clamp(frame.top + frame.height + gap, minY, maxY),
        ]),
      ]),
    ];
    const candidates = xs.flatMap((left) =>
      ys.map((top) => ({ left, top, width, height, scale: 1 })),
    );
    const overlap = (candidate: ControlFrame, frames = occupied) =>
      frames.reduce(
        (sum, frame) =>
          sum +
          Math.max(
            0,
            Math.min(candidate.left + width + gap, frame.left + frame.width) -
              Math.max(candidate.left - gap, frame.left),
          ) *
            Math.max(
              0,
              Math.min(candidate.top + height + gap, frame.top + frame.height) -
                Math.max(candidate.top - gap, frame.top),
            ),
        0,
      );
    const ranked = candidates.map((frame) => ({
      frame,
      blocked: overlap(frame),
      decoration: overlap(frame, decorations),
      distance: Math.abs(frame.left - preferredX) + Math.abs(frame.top - preferredY),
    }));
    ranked.sort(
      (a, b) => a.blocked - b.blocked || a.decoration - b.decoration || a.distance - b.distance,
    );
    const frame = ranked[0]!.frame;
    result.push(frame);
    occupied.push(frame);
  }
  return result;
}
export function moveControl(
  id: ControlId,
  layout: ControlLayout,
  area: ControlArea,
  left: number,
  top: number,
): ControlLayout {
  const frame = resolveControlFrame(id, layout, area);
  const horizontal = Math.max(0, area.width - area.left - area.right - frame.width);
  const vertical = Math.max(0, area.height - area.top - area.bottom - frame.height);
  return {
    ...layout,
    [id]: {
      ...layout[id],
      x: horizontal ? clamp((left - area.left) / horizontal, 0, 1) : 0,
      y: vertical ? clamp((top - area.top) / vertical, 0, 1) : 0,
      scale: layout[id]?.scale ?? 1,
    },
  };
}
export function resizeControl(
  id: ControlId,
  layout: ControlLayout,
  area: ControlArea,
  scale: number,
): ControlLayout {
  if (!Number.isFinite(scale)) return layout;
  const frame = resolveControlFrame(id, layout, area);
  // Preserve the centre while resizing, then clamp the whole control inside the safe area.
  const resized = {
    ...layout,
    [id]: { ...layout[id], x: 0, y: 0, scale: clamp(scale, MIN_CONTROL_SCALE, MAX_CONTROL_SCALE) },
  };
  const size = resolveControlFrame(id, resized, area);
  return moveControl(
    id,
    resized,
    area,
    frame.left + (frame.width - size.width) / 2,
    frame.top + (frame.height - size.height) / 2,
  );
}
export function setJoystickOpacity(
  layout: ControlLayout,
  area: ControlArea,
  opacity: number,
): ControlLayout {
  if (!Number.isFinite(opacity)) return layout;
  const frame = resolveControlFrame('dpad', layout, area);
  const positioned = moveControl('dpad', layout, area, frame.left, frame.top);
  return {
    ...positioned,
    dpad: { ...positioned.dpad!, opacity: clamp(opacity, MIN_JOYSTICK_OPACITY, 1) },
  };
}
/** Leave room for the custom A key; long dialogue can scroll within the free region. */
export function resolveDialogueFrame(area: ControlArea, action: ControlFrame) {
  const left = area.left + 16,
    top = area.top + 16;
  const right = area.width - area.right - 16,
    bottom = area.height - area.bottom - 16;
  const regions = [
    { left, top, right: action.left - 12, bottom },
    { left: action.left + action.width + 12, top, right, bottom },
    { left, top, right, bottom: action.top - 12 },
    { left, top: action.top + action.height + 12, right, bottom },
  ];
  const readable = regions.filter(
    (r) => r.right - r.left >= Math.min(220, right - left) && r.bottom - r.top >= 48,
  );
  const usable = readable.length
    ? readable
    : regions.filter((r) => r.right - r.left >= 64 && r.bottom - r.top >= 48);
  const score = (r: (typeof regions)[number]) =>
    Math.min(640, r.right - r.left) * Math.min(180, r.bottom - r.top);
  const region = usable.sort((a, b) => score(b) - score(a))[0] ?? { left, top, right, bottom };
  return {
    left: region.left,
    right: area.width - region.right,
    bottom: area.height - region.bottom,
    maxHeight: Math.max(48, region.bottom - region.top),
  };
}
export function createControlPreferences(driver: ControlPreferenceDriver) {
  let preferences = emptyPreferences();
  try {
    preferences = parsePreferences(driver.read());
  } catch {
    /* Use the default layout if storage is unavailable. */
  }
  const listeners = new Set<() => void>();
  return {
    getPreferences: () => preferences,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    saveLayouts(layouts: Pick<ControlPreferences, 'landscape' | 'portrait'>): boolean {
      const next: ControlPreferences = {
        version: 1,
        landscape: parseLayout(layouts.landscape),
        portrait: parseLayout(layouts.portrait),
      };
      try {
        driver.write(JSON.stringify(next));
      } catch {
        return false;
      }
      preferences = next;
      listeners.forEach((listener) => listener());
      return true;
    },
  };
}
