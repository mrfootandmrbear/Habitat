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
    // Opaque-enough + depthWrite + FrontSide: DoubleSide + depthWrite:false
    // z-fought the shoreline every sim/camera frame (playtest flash).
    // Opacity kept moderate so Sea: mid reads as a surrounding plane, not a
    // filled aquarium tank that looks like the island is drowning (playtest).
    this.material = new THREE.MeshBasicMaterial({
      color: 0x1a4a6e,
      transparent: true,
      opacity: 0.55,
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
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
    // Hair below datum so land foreshore verts at ~sea win depth cleanly.
    this.mesh.position.y = seaLevel - 0.02;
    this.mesh.visible = true;
  }
}
