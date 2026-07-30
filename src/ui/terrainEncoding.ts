/**
 * Default-view terrain color encoding (Tier-P).
 * Moisture remains legible under vegetation; burn scars tint without an inspector.
 * Intertidal foreshore (C-016) tints without requiring the inspector layer.
 */

export type TerrainRgb = readonly [number, number, number];

const BASE: TerrainRgb = [0x8b / 255, 0x73 / 255, 0x55 / 255];
const WET: TerrainRgb = [0x4a / 255, 0x5c / 255, 0x3a / 255];
const VEG: TerrainRgb = [0x3a / 255, 0x7a / 255, 0x3a / 255];
const SCAR: TerrainRgb = [0x2a / 255, 0x22 / 255, 0x1c / 255];
/** Wet sand / mud foreshore — readable against dry land (Slice 17). */
const INTERTIDAL: TerrainRgb = [0xa8 / 255, 0x8a / 255, 0x62 / 255];

function lerpChannel(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: TerrainRgb, b: TerrainRgb, t: number): TerrainRgb {
  const u = Math.min(1, Math.max(0, t));
  return [
    lerpChannel(a[0], b[0], u),
    lerpChannel(a[1], b[1], u),
    lerpChannel(a[2], b[2], u),
  ];
}

/**
 * Default terrain color from moisture, cover, burn scar, and optional intertidal.
 * Cover greens the wet base rather than replacing it, so dry-down stays visible.
 */
export function defaultTerrainRgb(
  soilMoisture: number,
  porosity: number,
  cover: number,
  scar: number = 0,
  intertidal: boolean = false,
): TerrainRgb {
  const soilT = Math.min(1, Math.max(0, soilMoisture / Math.max(porosity, 1e-6)));
  const coverT = Math.min(1, Math.max(0, cover));
  const scarT = Math.min(1, Math.max(0, scar));
  const wetBase = lerpRgb(BASE, WET, soilT);
  // Stronger green only where soil is also wet — dry vegetation reads muted.
  const vegAmount = coverT * (0.28 + 0.62 * soilT);
  let rgb = lerpRgb(wetBase, VEG, vegAmount);
  if (scarT > 0) {
    rgb = lerpRgb(rgb, SCAR, Math.min(0.85, scarT * 0.9));
  }
  if (intertidal) {
    rgb = lerpRgb(rgb, INTERTIDAL, 0.62);
  }
  return rgb;
}

export function terrainEncodingDelta(
  a: { moisture: number; cover: number; scar?: number; intertidal?: boolean },
  b: { moisture: number; cover: number; scar?: number; intertidal?: boolean },
  porosity: number,
): number {
  const ca = defaultTerrainRgb(
    a.moisture,
    porosity,
    a.cover,
    a.scar ?? 0,
    a.intertidal ?? false,
  );
  const cb = defaultTerrainRgb(
    b.moisture,
    porosity,
    b.cover,
    b.scar ?? 0,
    b.intertidal ?? false,
  );
  return Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]);
}

/** Color distance between dry land and intertidal foreshore tint (Tier-P floor). */
export function intertidalEncodingDelta(porosity: number): number {
  return terrainEncodingDelta(
    { moisture: 0.08, cover: 0.05 },
    { moisture: 0.08, cover: 0.05, intertidal: true },
    porosity,
  );
}
