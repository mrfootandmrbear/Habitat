import * as THREE from "three";
import type { WaterStateView } from "../sim/types";

export class TerrainMesh {
  readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly width: number;
  private readonly height: number;
  private readonly worldSize: number;

  constructor(width: number, height: number, worldSize: number) {
    this.width = width;
    this.height = height;
    this.worldSize = worldSize;

    this.geometry = new THREE.PlaneGeometry(
      worldSize,
      worldSize,
      width - 1,
      height - 1,
    );
    this.geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true,
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.name = "terrain";
  }

  updateFrom(model: WaterStateView): void {
    const pos = this.geometry.attributes.position as THREE.BufferAttribute;
    const cellW = this.worldSize / (this.width - 1);
    const cellH = this.worldSize / (this.height - 1);
    const ox = -this.worldSize / 2;
    const oz = -this.worldSize / 2;

    let i = 0;
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        pos.setXYZ(i, ox + x * cellW, model.getTerrainHeight(x, z), oz + z * cellH);
        i++;
      }
    }
    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}
