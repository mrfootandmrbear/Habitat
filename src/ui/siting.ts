import * as THREE from "three";
import { config } from "../config";
import type { WaterStateView } from "../sim/types";

/**
 * Map a world-space hit on the terrain plane to grid cell indices.
 * World XZ are centered on the grid; matches TerrainMesh / WaterMesh layout.
 */
export function worldToGrid(
  worldX: number,
  worldZ: number,
  width = config.gridSize,
  height = config.gridSize,
  worldSize = config.worldSize,
): { x: number; z: number } | null {
  const cellW = worldSize / (width - 1);
  const cellH = worldSize / (height - 1);
  const ox = -worldSize / 2;
  const oz = -worldSize / 2;
  const x = Math.round((worldX - ox) / cellW);
  const z = Math.round((worldZ - oz) / cellH);
  if (x < 0 || z < 0 || x >= width || z >= height) return null;
  return { x, z };
}

export function pickTerrainCell(
  event: PointerEvent,
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  terrainMesh: THREE.Object3D,
): { x: number; z: number } | null {
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(terrainMesh, false);
  const hit = hits[0];
  if (!hit) return null;
  return worldToGrid(hit.point.x, hit.point.z);
}

/** Used by tests — elevation sample after a brush without needing Three. */
export function sampleTerrain(
  model: WaterStateView,
  x: number,
  z: number,
): number {
  return model.getTerrainHeight(x, z);
}
