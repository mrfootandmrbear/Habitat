import * as THREE from "three";
import { config } from "../config";

/**
 * Visual ocean plane at sea level (observer only — T-006).
 * C-015: shoreline reads against this plane without an inspector.
 */
export class OceanMesh {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;

  constructor(worldSize = config.worldSize) {
    const geo = new THREE.PlaneGeometry(worldSize * 1.35, worldSize * 1.35);
    geo.rotateX(-Math.PI / 2);
    this.material = new THREE.MeshBasicMaterial({
      color: 0x1a4a6e,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = "ocean";
    this.mesh.renderOrder = 0;
    this.mesh.visible = false;
  }

  /** Show ocean at sea level (m). Pass undefined to hide. */
  setSeaLevel(seaLevel: number | undefined): void {
    if (seaLevel === undefined) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.position.y = seaLevel;
    this.mesh.visible = true;
  }
}
