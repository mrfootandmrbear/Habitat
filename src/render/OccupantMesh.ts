import * as THREE from "three";
import { config } from "../config";
import type { WorldState } from "../sim/WorldState";
import type { WaterStateView } from "../sim/types";
import { shootVisibility } from "../ui/occupantEncoding";

/**
 * First-occupant shoots — presentation only (T-006).
 * Reads veg.biomass.herb; does not create population state.
 */
export class OccupantMesh {
  readonly object: THREE.InstancedMesh;
  private readonly width: number;
  private readonly height: number;
  private readonly worldSize: number;
  private readonly maxInstances: number;
  private readonly dummy = new THREE.Object3D();

  constructor(
    width: number = config.gridSize,
    height: number = config.gridSize,
    worldSize: number = config.worldSize,
  ) {
    this.width = width;
    this.height = height;
    this.worldSize = worldSize;
    this.maxInstances = width * height;
    const geo = new THREE.ConeGeometry(0.12, 0.55, 4);
    geo.translate(0, 0.275, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2ec44e,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });
    this.object = new THREE.InstancedMesh(geo, mat, this.maxInstances);
    this.object.name = "occupantShoots";
    this.object.frustumCulled = false;
    this.object.count = 0;
    this.object.castShadow = false;
    this.object.receiveShadow = false;
  }

  updateFrom(model: WaterStateView, world: WorldState): void {
    const cellW = this.worldSize / (this.width - 1);
    const ox = -this.worldSize / 2;
    const oz = -this.worldSize / 2;
    const maxB = config.herbBiomassMax;
    let n = 0;

    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const vis = shootVisibility(world.getHerbBiomass(x, z), maxB);
        if (vis <= 0) continue;
        const y = model.getTerrainHeight(x, z);
        const scaleY = 0.35 + vis * 1.4;
        const scaleXZ = 0.45 + vis * 0.9;
        this.dummy.position.set(ox + x * cellW, y, oz + z * cellW);
        this.dummy.scale.set(scaleXZ, scaleY, scaleXZ);
        this.dummy.rotation.set(0, ((x * 17 + z * 31) % 360) * (Math.PI / 180), 0);
        this.dummy.updateMatrix();
        this.object.setMatrixAt(n, this.dummy.matrix);
        n++;
      }
    }
    this.object.count = n;
    this.object.instanceMatrix.needsUpdate = true;
  }
}
