import * as THREE from "three";
import { config } from "../config";
import type { WorldState } from "../sim/WorldState";
import type { WaterStateView } from "../sim/types";
import { hash01 } from "./OccupantMesh";

/**
 * A1 / C-027 (BUILD_GUIDE §4.66) — herbivore population render, presentation
 * only (T-006). Reads pop.herbivore.density + pop.herbivore.trait.limbLength;
 * does not create population state, same read-only contract OccupantMesh
 * already holds for the plant guilds.
 *
 * PLACEHOLDER GEOMETRY. This is a stand-in silhouette (body + four legs from
 * primitive Three.js geometry), not the real Foxel-authored asset — only
 * `AD-001` (limbLength) has an accepted animal-design card as of this slice
 * ([docs/animal-design/cards/](../../docs/animal-design/PROTOCOL.md));
 * `insulation`/`webbing` have none yet, so this mesh reads density and
 * limbLength only and does not vary by either. A static merged-geometry
 * `InstancedMesh` also has no skeleton to scale a single bone on, so
 * limbLength here scales the whole instance's Y-extent as an honest
 * approximation of bone-scale, not literal per-bone scaling — that arrives
 * once a real Foxel `.glb` skeleton replaces this placeholder.
 */

const HERBIVORE_MAX_PER_CELL = 4;

function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vertCount = 0;
  let indexCount = 0;
  for (const g of parts) {
    vertCount += g.attributes.position!.count;
    indexCount += g.index ? g.index.count : g.attributes.position!.count;
  }
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const indices = new Uint16Array(indexCount);
  let vBase = 0;
  let iOffset = 0;
  for (const g of parts) {
    const pos = g.attributes.position!.array as Float32Array;
    const nrm = g.attributes.normal!.array as Float32Array;
    positions.set(pos, vBase * 3);
    normals.set(nrm, vBase * 3);
    const count = g.attributes.position!.count;
    const idx = g.index;
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices[iOffset++] = idx.getX(i) + vBase;
      }
    } else {
      for (let i = 0; i < count; i++) {
        indices[iOffset++] = i + vBase;
      }
    }
    vBase += count;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}

/** Placeholder quadruped silhouette: an oval body over four leg cylinders. */
function buildHerbivoreGeometry(): THREE.BufferGeometry {
  const body = new THREE.CapsuleGeometry(0.09, 0.18, 4, 6);
  body.rotateZ(Math.PI / 2);
  body.translate(0, 0.16, 0);
  const legOffsets: [number, number][] = [
    [0.09, 0.08],
    [0.09, -0.08],
    [-0.09, 0.08],
    [-0.09, -0.08],
  ];
  const parts: THREE.BufferGeometry[] = [body];
  for (const [lx, lz] of legOffsets) {
    const leg = new THREE.CylinderGeometry(0.018, 0.022, 0.16, 5);
    leg.translate(lx, 0.08, lz);
    parts.push(leg);
  }
  return mergeParts(parts);
}

export class HerbivoreMesh {
  readonly object: THREE.InstancedMesh;
  private readonly width: number;
  private readonly height: number;
  private readonly worldSize: number;
  private readonly maxInstances: number;
  private readonly dummy = new THREE.Object3D();
  private count = 0;

  constructor(
    width: number = config.gridSize,
    height: number = config.gridSize,
    worldSize: number = config.worldSize,
  ) {
    this.width = width;
    this.height = height;
    this.worldSize = worldSize;
    this.maxInstances = width * height * HERBIVORE_MAX_PER_CELL;

    const geo = buildHerbivoreGeometry();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8a6f4f,
      roughness: 0.9,
      metalness: 0.02,
      flatShading: true,
    });
    this.object = new THREE.InstancedMesh(geo, mat, this.maxInstances);
    this.object.name = "herbivoreInstances";
    this.object.frustumCulled = false;
    this.object.count = 0;
    this.object.castShadow = true;
    this.object.receiveShadow = true;
  }

  updateFrom(model: WaterStateView, world: WorldState): void {
    const cellW = this.worldSize / (this.width - 1);
    const ox = -this.worldSize / 2;
    const oz = -this.worldSize / 2;
    // cellAreaKm2 uses the sim's real-world Δx (config.cellSizeMeters), not
    // the render-only worldSize scene span (C-012 — the two are not the
    // same number and must never be conflated).
    const cellAreaKm2 = (config.cellSizeMeters / 1000) ** 2;
    let idx = 0;

    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const density = world.getHerbivoreDensity(x, z);
        // Literal density readout (C-027 §2/§3.4) — fewer visible animals
        // always means genuinely lower simulated density, never a tuned
        // "always show a few" floor.
        const instanceCount = Math.min(
          HERBIVORE_MAX_PER_CELL,
          Math.round(density * cellAreaKm2),
        );
        if (instanceCount <= 0) continue;

        const limbLength = world.getHerbivoreLimbLength(x, z);
        const cellCx = ox + x * cellW;
        const cellCz = oz + z * cellW;
        const y = model.getTerrainHeight(x, z);

        for (let s = 0; s < instanceCount; s++) {
          if (idx >= this.maxInstances) break;
          const base = 10 * (s + 1);
          // Deterministic per-(cell, instance) seed only — no `tick` term,
          // so no persisted per-instance identity across frames (T-001/T-006).
          const offX = (hash01(x, z, base + 1) - 0.5) * 0.6 * cellW;
          const offZ = (hash01(x, z, base + 2) - 0.5) * 0.6 * cellW;
          const yaw = hash01(x, z, base + 3) * Math.PI * 2;

          this.dummy.position.set(cellCx + offX, y, cellCz + offZ);
          this.dummy.rotation.set(0, yaw, 0);
          // limbLength scales the whole placeholder's Y-extent — an honest
          // stand-in for bone-scale, not literal per-bone scaling (see
          // module doc comment).
          this.dummy.scale.set(1, limbLength, 1);
          this.dummy.updateMatrix();
          this.object.setMatrixAt(idx, this.dummy.matrix);
          idx++;
        }
      }
    }

    this.count = idx;
    this.object.count = this.count;
    this.object.instanceMatrix.needsUpdate = true;
  }
}
