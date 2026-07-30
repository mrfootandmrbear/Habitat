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

/** Beer–Lambert canopy attenuation (NATURAL_PROCESS_MATH §3.2). */
export function evaluateLight(
  insolation: number,
  cover: number,
  maxLeafAreaIndex: number = config.vegMaxLeafAreaIndex,
  extinctionCoefficient: number = config.lightExtinctionCoefficient,
): LightSample {
  const incoming = clamp01(insolation);
  const boundedCover = clamp01(cover);
  const leafAreaIndex = boundedCover * maxLeafAreaIndex;
  const understoryLight = clamp01(
    incoming * Math.exp(-extinctionCoefficient * leafAreaIndex),
  );
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
