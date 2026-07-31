/**
 * Default-view terrain color encoding (Tier-P).
 * Moisture remains legible under vegetation; burn scars tint without an inspector.
 * Intertidal foreshore (C-016) tints without requiring the inspector layer.
 * High soil.salinity (C-018) washes green and adds a pale crust without Inspect.
 * Substrate class (C-009) sets dry BASE from the material table.
 */

import {
  SUBSTRATE_CLAY,
  SUBSTRATE_LOAM,
  SUBSTRATE_ROCK,
  SUBSTRATE_SAND,
  substrateProps,
} from "../sim/terrain/substrates";

export type TerrainRgb = readonly [number, number, number];

const WET: TerrainRgb = [0x4a / 255, 0x5c / 255, 0x3a / 255];
const VEG: TerrainRgb = [0x3a / 255, 0x7a / 255, 0x3a / 255];
const SCAR: TerrainRgb = [0x2a / 255, 0x22 / 255, 0x1c / 255];
/** Wet sand / mud foreshore — readable against dry land (Slice 17). */
const INTERTIDAL: TerrainRgb = [0xc4 / 255, 0x9a / 255, 0x5e / 255];
/** Pale salt crust — ground still tasting of the sea (C-018). */
const SALT: TerrainRgb = [0xe8 / 255, 0xde / 255, 0xc4 / 255];

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
  let rgb = lerpRgb(wetBase, VEG, vegAmount);
  if (scarT > 0) {
    rgb = lerpRgb(rgb, SCAR, Math.min(0.85, scarT * 0.9));
  }
  if (intertidal) {
    rgb = lerpRgb(rgb, INTERTIDAL, 0.62);
  }
  if (saltT > 0) {
    rgb = lerpRgb(rgb, SALT, Math.min(0.78, saltT * 0.7));
  }
  return rgb;
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
 * Color distance between dry sand and dry rock under the same moisture/cover
 * (Tier-P floor for C-009 default-view substrate contrast, including rock).
 */
export function substrateEncodingDelta(): number {
  const porosity = 0.4;
  const sandClay = terrainEncodingDelta(
    {
      moisture: 0.05,
      cover: 0,
      material: SUBSTRATE_SAND,
    },
    {
      moisture: 0.05,
      cover: 0,
      material: SUBSTRATE_CLAY,
    },
    porosity,
  );
  const sandRock = terrainEncodingDelta(
    {
      moisture: 0.05,
      cover: 0,
      material: SUBSTRATE_SAND,
    },
    {
      moisture: 0.05,
      cover: 0,
      material: SUBSTRATE_ROCK,
    },
    porosity,
  );
  return Math.min(sandClay, sandRock);
}
