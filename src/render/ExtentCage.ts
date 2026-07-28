import * as THREE from "three";
import { config } from "../config";

/** Wireframe box around the preserve extent (BUILD_GUIDE §4.2 cage). */
export function createExtentCage(
  worldSize = config.worldSize,
  peakHint = config.mountainPeak,
): THREE.LineSegments {
  const half = worldSize / 2;
  const y0 = config.elevationFloor - 0.05;
  const y1 = peakHint + 2;
  const positions = new Float32Array([
    // bottom
    -half, y0, -half, half, y0, -half,
    half, y0, -half, half, y0, half,
    half, y0, half, -half, y0, half,
    -half, y0, half, -half, y0, -half,
    // top
    -half, y1, -half, half, y1, -half,
    half, y1, -half, half, y1, half,
    half, y1, half, -half, y1, half,
    -half, y1, half, -half, y1, -half,
    // verticals
    -half, y0, -half, -half, y1, -half,
    half, y0, -half, half, y1, -half,
    half, y0, half, half, y1, half,
    -half, y0, half, -half, y1, half,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0x5a7a68,
    transparent: true,
    opacity: 0.55,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.name = "extentCage";
  return lines;
}
