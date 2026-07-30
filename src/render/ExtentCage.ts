import * as THREE from "three";
import { config } from "../config";

/**
 * Horizon ring at sea level instead of a closed extent box (C-015 / §4.2).
 * When sea level is absent, falls back to the classic cage silhouette.
 */
export function createExtentCage(
  worldSize = config.worldSize,
  peakHint = config.mountainPeak,
  options?: { seaLevel?: number },
): THREE.LineSegments {
  const half = worldSize / 2;
  const sea = options?.seaLevel;
  let positions: Float32Array;

  if (sea !== undefined) {
    // Horizon: square ring at sea, plus soft verticals up to peak (open top).
    const y0 = sea;
    const y1 = peakHint + 1.5;
    positions = new Float32Array([
      -half, y0, -half, half, y0, -half,
      half, y0, -half, half, y0, half,
      half, y0, half, -half, y0, half,
      -half, y0, half, -half, y0, -half,
      -half, y0, -half, -half, y1, -half,
      half, y0, -half, half, y1, -half,
      half, y0, half, half, y1, half,
      -half, y0, half, -half, y1, half,
    ]);
  } else {
    const y0 = config.elevationFloor - 0.05;
    const y1 = peakHint + 2;
    positions = new Float32Array([
      -half, y0, -half, half, y0, -half,
      half, y0, -half, half, y0, half,
      half, y0, half, -half, y0, half,
      -half, y0, half, -half, y0, -half,
      -half, y1, -half, half, y1, -half,
      half, y1, -half, half, y1, half,
      half, y1, half, -half, y1, half,
      -half, y1, half, -half, y1, -half,
      -half, y0, -half, -half, y1, -half,
      half, y0, -half, half, y1, -half,
      half, y0, half, half, y1, half,
      -half, y0, half, -half, y1, half,
    ]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: sea !== undefined ? 0x2a6080 : 0x3d5548,
    transparent: false,
    depthWrite: false,
    depthTest: true,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.name = "extentCage";
  lines.renderOrder = -1;
  return lines;
}
