/**
 * Conservative hydroclimate ET (NATURAL_PROCESS_MATH §1.6–1.7).
 * PET from representative insolation (Slice 11 I₀); AET moisture-limited
 * between wilting point and field capacity. Partitions into bare-soil
 * evaporation, plant transpiration, and open-water evaporation.
 *
 * Evaporation is an external boundary sink — not recycled into local rain.
 */

export type EtSample = {
  /** Potential ET depth (m) for this step before moisture limit. */
  pet: number;
  /** Actual ET depth (m) removed from storages. */
  aet: number;
  /** Bare-soil evaporation from the moisture column (m). */
  soilEvaporation: number;
  /** Plant transpiration from the moisture column (m). */
  transpiration: number;
  /** Open-water evaporation from surface depth (m). */
  openWaterEvaporation: number;
};

export type EtInputs = {
  /** Incoming terrain insolation [0,1] (Slice 11 I₀). */
  insolation: number;
  /** Volumetric soil moisture [0, porosity]. */
  moisture: number;
  soilPorosity: number;
  /** Wilting-point fraction of porosity — AET→0 below. */
  wiltingFraction: number;
  /** Field-capacity fraction of porosity — AET→PET at/above. */
  fieldCapacityFraction: number;
  /** Vegetation cover [0,1] — raises transpiration share. */
  cover: number;
  /** Surface water depth (m). */
  surfaceDepth: number;
  /** Reference PET depth (m) at insolation = 1 for this step. */
  petAtFullSun: number;
  /** Max open-water evaporative depth (m) this step. */
  openWaterPet: number;
};

/**
 * Piecewise moisture stress: 0 at/below wilting, 1 at/above field capacity.
 */
export function moistureStressFactor(
  moisture: number,
  porosity: number,
  wiltingFraction: number,
  fieldCapacityFraction: number,
): number {
  const wilt = porosity * wiltingFraction;
  const fc = porosity * fieldCapacityFraction;
  if (!(moisture > wilt)) return 0;
  if (moisture >= fc) return 1;
  const span = Math.max(fc - wilt, 1e-9);
  return (moisture - wilt) / span;
}

/** Evaluate PET → AET and partition sinks for one cell. */
export function evaluateEt(input: EtInputs): EtSample {
  const insolation = clamp01(input.insolation);
  const cover = clamp01(input.cover);
  const pet = Math.max(0, input.petAtFullSun) * insolation;
  const openCap = Math.max(0, input.openWaterPet) * insolation;
  const surface = Math.max(0, input.surfaceDepth);
  const openWaterEvaporation = Math.min(surface, openCap);

  const remainingPet = Math.max(0, pet - openWaterEvaporation);
  const stress = moistureStressFactor(
    input.moisture,
    input.soilPorosity,
    input.wiltingFraction,
    input.fieldCapacityFraction,
  );
  const soilDemand = remainingPet * stress;
  const transpiration = soilDemand * cover;
  const soilEvaporation = soilDemand * (1 - cover);
  const aet = openWaterEvaporation + transpiration + soilEvaporation;

  return {
    pet,
    aet,
    soilEvaporation,
    transpiration,
    openWaterEvaporation,
  };
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
