import * as THREE from "three";
import { config } from "../config";
import type { WorldState } from "../sim/WorldState";
import type { WaterStateView } from "../sim/types";

const D8_DX = [-1, 0, 1, -1, 1, -1, 0, 1] as const;
const D8_DZ = [-1, -1, -1, 0, 0, 1, 1, 1] as const;

/**
 * Short flow-direction segments on wet cells (motion-in-time cue).
 * Reads authoritative depth + flowDirection only (T-006).
 */
export class FlowCueMesh {
  readonly object: THREE.LineSegments;
  private readonly geometry: THREE.BufferGeometry;
  private readonly width: number;
  private readonly height: number;
  private readonly worldSize: number;
  private readonly maxSegments: number;

  constructor(
    width: number = config.gridSize,
    height: number = config.gridSize,
    worldSize: number = config.worldSize,
  ) {
    this.width = width;
    this.height = height;
    this.worldSize = worldSize;
    this.maxSegments = Math.min(width * height, 4096);
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxSegments * 2 * 3);
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const mat = new THREE.LineBasicMaterial({
      color: 0x7ec8e8,
      transparent: true,
      opacity: 0.65,
    });
    this.object = new THREE.LineSegments(this.geometry, mat);
    this.object.name = "flowCue";
    this.object.frustumCulled = false;
  }

  updateFrom(model: WaterStateView, world: WorldState): void {
    const dir = world.flowDirection;
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const cellW = this.worldSize / (this.width - 1);
    const cellH = this.worldSize / (this.height - 1);
    const ox = -this.worldSize / 2;
    const oz = -this.worldSize / 2;
    let seg = 0;
    const stride = Math.max(1, Math.floor((this.width * this.height) / this.maxSegments));

    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const i = z * this.width + x;
        if (i % stride !== 0) continue;
        const w = model.getWaterDepth(x, z);
        if (w <= config.dryEpsilon || !dir) continue;
        const d = dir[i]!;
        if (d < 0) continue;
        if (seg >= this.maxSegments) break;
        const y = model.getTerrainHeight(x, z) + w + 0.08;
        const x0 = ox + x * cellW;
        const z0 = oz + z * cellH;
        const len = cellW * 0.35;
        const x1 = x0 + D8_DX[d]! * len;
        const z1 = z0 + D8_DZ[d]! * len;
        const o = seg * 6;
        positions[o] = x0;
        positions[o + 1] = y;
        positions[o + 2] = z0;
        positions[o + 3] = x1;
        positions[o + 4] = y;
        positions[o + 5] = z1;
        seg++;
      }
    }
    this.geometry.setDrawRange(0, seg * 2);
    posAttr.needsUpdate = true;
  }
}
