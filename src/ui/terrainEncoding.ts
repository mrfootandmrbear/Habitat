/**
 * Default-view terrain color encoding (Tier-P).
 * Moisture remains legible under vegetation; burn scars tint without an inspector.
 * Intertidal foreshore (C-016) tints without requiring the inspector layer.
 * High soil.salinity (C-018) washes green and adds a pale crust without Inspect.
 * Substrate class (C-009) sets dry BASE from the material table.
 */

import {
  SUBSTRATE_LOAM,
  SUBSTRATES,
  substrateProps,
} from "../sim/terrain/substrates";
import { rgbDistance } from "./colorDistance";

export type TerrainRgb = readonly [number, number, number];

// Exported so the GPU default-view path (render/TerrainMesh.ts) can pass
// these as shader uniforms instead of duplicating the hex values — one
// palette definition, sourced by both the CPU and GPU coloring paths.
export const WET: TerrainRgb = [0x4a / 255, 0x5c / 255, 0x3a / 255];
export const VEG: TerrainRgb = [0x3a / 255, 0x7a / 255, 0x3a / 255];
export const SCAR: TerrainRgb = [0x2a / 255, 0x22 / 255, 0x1c / 255];
/**
 * Wet sand / mud foreshore — readable against dry land (Slice 17). Darker
 * and cooler than the old `0xc49a5e`, which sat ~0.07 unit-RGB from
 * occupantEncoding.ts's BINDER (`0xc4a24e`) — two different quantities
 * (terrain tidal state vs. occupant guild cover) that co-occur on the shore
 * and read as the same khaki. Physically defensible too: wet mud is darker
 * and greyer than dry sand. Minimal collision fix only — the full six-guild
 * CVD-safe palette redesign is C-026, filed separately (BUILD_GUIDE §4.52).
 */
export const INTERTIDAL: TerrainRgb = [0x9c / 255, 0x88 / 255, 0x68 / 255];
/** Pale salt crust — ground still tasting of the sea (C-018). */
export const SALT: TerrainRgb = [0xe8 / 255, 0xde / 255, 0xc4 / 255];

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
 * Default terrain color from moisture, cover, burn scar, intertidal, salinity,
 * and substrate class. Cover greens the wet base rather than replacing it.
 * Salinity suppresses green and pulls toward crust so salty hollows stay pale.
 */
export function defaultTerrainRgb(
  soilMoisture: number,
  porosity: number,
  cover: number,
  scar: number = 0,
  intertidal: boolean = false,
  salinity: number = 0,
  materialClass: number = SUBSTRATE_LOAM,
): TerrainRgb {
  const base = substrateProps(materialClass).dryRgb;
  const soilT = Math.min(1, Math.max(0, soilMoisture / Math.max(porosity, 1e-6)));
  const coverT = Math.min(1, Math.max(0, cover));
  const scarT = Math.min(1, Math.max(0, scar));
  const saltT = Math.min(1, Math.max(0, salinity));
  const wetBase = lerpRgb(base, WET, soilT);
  // Stronger green only where soil is also wet — dry vegetation reads muted.
  // Salt washes the green so a salty hollow does not read as a healthy lawn.
  const vegAmount = coverT * (0.28 + 0.62 * soilT) * (1 - saltT * 0.9);
  const baseRgb = lerpRgb(wetBase, VEG, vegAmount);

  // Categorical overlays (burned / foreshore / salty) blend proportionally
  // to their own weight instead of layering sequentially. Sequential lerps
  // let whichever overlay applies last (salt, up to 0.78) wash out an
  // earlier one (scar) almost entirely even though both states are still
  // true — two things the player is meant to read, masked by a third. A
  // single active overlay reproduces the old lerp exactly (BUILD_GUIDE §4.52).
  const overlays: { color: TerrainRgb; weight: number }[] = [];
  if (scarT > 0) overlays.push({ color: SCAR, weight: Math.min(0.85, scarT * 0.9) });
  if (intertidal) overlays.push({ color: INTERTIDAL, weight: 0.62 });
  if (saltT > 0) overlays.push({ color: SALT, weight: Math.min(0.78, saltT * 0.7) });
  if (overlays.length === 0) return baseRgb;

  const sumWeight = overlays.reduce((sum, o) => sum + o.weight, 0);
  let overlayColor: TerrainRgb = [0, 0, 0];
  for (const o of overlays) {
    const share = o.weight / sumWeight;
    overlayColor = [
      overlayColor[0] + o.color[0] * share,
      overlayColor[1] + o.color[1] * share,
      overlayColor[2] + o.color[2] * share,
    ];
  }
  return lerpRgb(baseRgb, overlayColor, sumWeight);
}

export type TerrainEncodingSample = {
  moisture: number;
  cover: number;
  scar?: number;
  intertidal?: boolean;
  salinity?: number;
  material?: number;
};

export function terrainEncodingDelta(
  a: TerrainEncodingSample,
  b: TerrainEncodingSample,
  porosity: number,
): number {
  const ca = defaultTerrainRgb(
    a.moisture,
    porosity,
    a.cover,
    a.scar ?? 0,
    a.intertidal ?? false,
    a.salinity ?? 0,
    a.material ?? SUBSTRATE_LOAM,
  );
  const cb = defaultTerrainRgb(
    b.moisture,
    porosity,
    b.cover,
    b.scar ?? 0,
    b.intertidal ?? false,
    b.salinity ?? 0,
    b.material ?? SUBSTRATE_LOAM,
  );
  return rgbDistance(ca, cb);
}

/** Color distance between dry land and intertidal foreshore tint (Tier-P floor). */
export function intertidalEncodingDelta(porosity: number): number {
  return terrainEncodingDelta(
    { moisture: 0.08, cover: 0.05 },
    { moisture: 0.08, cover: 0.05, intertidal: true },
    porosity,
  );
}

/**
 * Color distance between freshened and salty ground under the same moisture/cover
 * (Tier-P floor for C-018 default-view salt crust).
 */
export function salinityEncodingDelta(
  porosity: number,
  freshSalinity = 0,
  saltySalinity = 0.85,
): number {
  return terrainEncodingDelta(
    { moisture: 0.25, cover: 0.35, salinity: freshSalinity },
    { moisture: 0.25, cover: 0.35, salinity: saltySalinity },
    porosity,
  );
}

/**
 * Twin-hollow salt memory (C-018 engagement): freshened twin greens while the salty twin
 * stays pale and sparse — outcome pair, not equal-cover crust alone.
 */
export function saltMemoryEncodingDelta(porosity: number): number {
  return terrainEncodingDelta(
    { moisture: 0.25, cover: 0.55, salinity: 0 },
    { moisture: 0.25, cover: 0.08, salinity: 0.85 },
    porosity,
  );
}

/**
 * Color distance between the driest-reading pair of substrates under the
 * same moisture/cover, each read at its OWN porosity — not sand-vs-clay and
 * sand-vs-rock alone (clay↔rock went unchecked, so two of four substrates
 * could have been indistinguishable and this floor would still pass), and
 * not a hardcoded porosity shared by every sample (the real render computes
 * `soilT = moisture / porosity` per-cell from that cell's own material — a
 * low-porosity rock at a given moisture reads far wetter than a hardcoded
 * 0.4 simulated, BUILD_GUIDE §4.52).
 */
export function substrateEncodingDelta(): number {
  let minDelta = Number.POSITIVE_INFINITY;
  for (let i = 0; i < SUBSTRATES.length; i++) {
    for (let j = i + 1; j < SUBSTRATES.length; j++) {
      const matA = SUBSTRATES[i]!;
      const matB = SUBSTRATES[j]!;
      const rgbA = defaultTerrainRgb(0.05, matA.porosity, 0, 0, false, 0, matA.id);
      const rgbB = defaultTerrainRgb(0.05, matB.porosity, 0, 0, false, 0, matB.id);
      minDelta = Math.min(minDelta, rgbDistance(rgbA, rgbB));
    }
  }
  return minDelta;
}
