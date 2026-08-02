import { config } from "../../config";

export type LightSample = {
  insolation: number;
  leafAreaIndex: number;
  understoryLight: number;
};

/**
 * Slice 11 reduced slope/aspect insolation (NATURAL_PROCESS_MATH §1.9).
 * Coordinates use x=east/west and z=north/south; the representative sun is
 * due south at config.solarAltitudeDegrees.
 */
export function terrainInsolation(
  elevation: Float32Array,
  width: number,
  height: number,
  x: number,
  z: number,
  cellSize: number = config.cellSizeMeters,
): number {
  const dzdx = axisGradient(elevation, width, height, x, z, 1, 0, cellSize);
  const dzdz = axisGradient(elevation, width, height, x, z, 0, 1, cellSize);
  const normalLength = Math.hypot(dzdx, 1, dzdz);
  const nx = -dzdx / normalLength;
  const ny = 1 / normalLength;
  const nz = -dzdz / normalLength;

  const altitude = (config.solarAltitudeDegrees * Math.PI) / 180;
  const sunX = 0;
  const sunY = Math.sin(altitude);
  const sunZ = Math.cos(altitude);
  return clamp01(nx * sunX + ny * sunY + nz * sunZ);
}

/**
 * Beer–Lambert canopy attenuation (NATURAL_PROCESS_MATH §3.2).
 *
 * §4.47: leaf-area index is the Beer–Lambert-*consistent* inverse of cover,
 * `LAI = −ln(1 − cover)/k`, not the linear `cover · maxLAI`. Under that form
 * the transmitted fraction is exactly `exp(−k·LAI) = 1 − cover`, so understory
 * light is `I₀(1 − cover)` and approaches darkness as cover → 1 instead of
 * resting on the old `exp(−k·maxLAI)` floor. The reported `leafAreaIndex`
 * diverges at full cover, so it is clamped to `maxLeafAreaIndex` to stay inside
 * its registered bound; the transmitted light is computed from the exact
 * `(1 − cover)` identity rather than the clamped LAI so no floor is
 * reintroduced.
 */
export function evaluateLight(
  insolation: number,
  cover: number,
  maxLeafAreaIndex: number = config.vegMaxLeafAreaIndex,
  extinctionCoefficient: number = config.lightExtinctionCoefficient,
): LightSample {
  const incoming = clamp01(insolation);
  const boundedCover = clamp01(cover);
  const k = Math.max(extinctionCoefficient, 1e-6);
  const openFraction = 1 - boundedCover;
  const understoryLight = clamp01(incoming * openFraction);
  const rawLeafAreaIndex =
    openFraction > 0 ? -Math.log(openFraction) / k : Number.POSITIVE_INFINITY;
  const leafAreaIndex = Math.min(maxLeafAreaIndex, rawLeafAreaIndex);
  return { insolation: incoming, leafAreaIndex, understoryLight };
}

function axisGradient(
  elevation: Float32Array,
  width: number,
  height: number,
  x: number,
  z: number,
  ox: number,
  oz: number,
  cellSize: number,
): number {
  const loX = Math.max(0, x - ox);
  const loZ = Math.max(0, z - oz);
  const hiX = Math.min(width - 1, x + ox);
  const hiZ = Math.min(height - 1, z + oz);
  const lo = elevation[loZ * width + loX]!;
  const hi = elevation[hiZ * width + hiX]!;
  const cells = Math.max(1, Math.abs(hiX - loX) + Math.abs(hiZ - loZ));
  return (hi - lo) / (cells * cellSize);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
