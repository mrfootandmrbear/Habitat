/**
 * Substrate property table (Slice S / C-009 / T-004).
 * One infiltration + erosion law; materials differ by data, not process forks.
 * Loam matches the pre-S global knobs so existing probes keep their baselines.
 * Rock = rocky ground / lithosol — not derived bedrock (elev − depth).
 */

/** Class ids stored in soil.material (Float32 raster). */
export const SUBSTRATE_LOAM = 0;
export const SUBSTRATE_SAND = 1;
export const SUBSTRATE_CLAY = 2;
export const SUBSTRATE_ROCK = 3;

export type SubstrateId =
  | typeof SUBSTRATE_LOAM
  | typeof SUBSTRATE_SAND
  | typeof SUBSTRATE_CLAY
  | typeof SUBSTRATE_ROCK;

/** Player-depositable geological materials (loam stays the probe default). */
export const DEPOSIT_MATERIALS = [
  SUBSTRATE_SAND,
  SUBSTRATE_CLAY,
  SUBSTRATE_ROCK,
] as const;

export type DepositMaterialId = (typeof DEPOSIT_MATERIALS)[number];

export type SubstrateProps = {
  id: SubstrateId;
  name: string;
  /** Volumetric porosity — moisture capacity (m³/m³). */
  porosity: number;
  /** Base infiltration rate (m/day) before veg contribution. */
  infiltrationRate: number;
  /** Hillslope / channel erosion scale (m / decadal band) at unit forcing. */
  erosionK: number;
  /** Dry-ground BASE color for default-view encoding (Tier-P). */
  dryRgb: readonly [number, number, number];
};

/**
 * Data table — process code must look up, never hardcode sand/clay/rock constants.
 * Loam = prior config.soilPorosity / infiltrationRate / soilErosionK.
 */
export const SUBSTRATES: readonly SubstrateProps[] = [
  {
    id: SUBSTRATE_LOAM,
    name: "loam",
    porosity: 0.45,
    infiltrationRate: 0.08,
    erosionK: 0.003,
    dryRgb: [0x8b / 255, 0x73 / 255, 0x55 / 255],
  },
  {
    id: SUBSTRATE_SAND,
    name: "sand",
    porosity: 0.35,
    infiltrationRate: 0.22,
    erosionK: 0.007,
    // Warm pale — drains and bleaches dry.
    dryRgb: [0xc4 / 255, 0xa8 / 255, 0x6e / 255],
  },
  {
    id: SUBSTRATE_CLAY,
    name: "clay",
    porosity: 0.52,
    infiltrationRate: 0.025,
    erosionK: 0.0012,
    // Cooler red-brown — holds and darkens dry.
    dryRgb: [0x6e / 255, 0x4a / 255, 0x3a / 255],
  },
  {
    id: SUBSTRATE_ROCK,
    name: "rock",
    porosity: 0.08,
    infiltrationRate: 0.002,
    erosionK: 0.00015,
    // Cool gray — sheds and resists.
    dryRgb: [0x7a / 255, 0x78 / 255, 0x74 / 255],
  },
] as const;

/** Upper bound for soil.moisture registry range (widest table porosity). */
export const MAX_SUBSTRATE_POROSITY = Math.max(
  ...SUBSTRATES.map((s) => s.porosity),
);

export function substrateProps(classId: number): SubstrateProps {
  const id = Math.round(classId);
  const row = SUBSTRATES.find((s) => s.id === id);
  return row ?? SUBSTRATES[SUBSTRATE_LOAM]!;
}

/**
 * Paint a readable sand | clay mosaic on land (ocean cells stay loam).
 * West of mid-x → sand; east → clay. Seed reserved for future noise variants.
 */
export function paintSubstrateMosaic(
  material: Float32Array,
  width: number,
  height: number,
  oceanCells: ReadonlySet<number>,
  _seed: number = 0,
): void {
  const mid = width * 0.5;
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const i = z * width + x;
      if (oceanCells.has(i)) {
        material[i] = SUBSTRATE_LOAM;
        continue;
      }
      material[i] = x < mid ? SUBSTRATE_SAND : SUBSTRATE_CLAY;
    }
  }
}
