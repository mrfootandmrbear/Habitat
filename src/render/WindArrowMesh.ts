import * as THREE from "three";
import { config } from "../config";
import type { WindId } from "../sim/climate/windRegime";
import { windById } from "../sim/climate/windRegime";

/**
 * World-space wind arrow — observer only (T-006).
 * Tip = downwind (blow direction); warm mark = upwind origin.
 */
export class WindArrowMesh {
  readonly group: THREE.Group;
  private readonly shaft: THREE.Mesh;
  private readonly head: THREE.Mesh;
  private readonly originMark: THREE.Mesh;

  constructor(worldSize = config.worldSize) {
    this.group = new THREE.Group();
    this.group.name = "windArrow";

    const shaftMat = new THREE.MeshBasicMaterial({ color: 0x2a4a6a });
    const headMat = new THREE.MeshBasicMaterial({ color: 0x1a3348 });
    const markMat = new THREE.MeshBasicMaterial({ color: 0xc45c3a });

    const len = worldSize * 0.28;
    // Cylinder default axis is +Y; tip toward +Z after group yaw.
    this.shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, len, 8),
      shaftMat,
    );
    this.shaft.rotation.x = Math.PI / 2;

    this.head = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.0, 8), headMat);
    this.head.rotation.x = Math.PI / 2;
    this.head.position.z = len * 0.5 + 0.4;

    this.originMark = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 10, 10),
      markMat,
    );
    this.originMark.position.z = -len * 0.5 - 0.25;

    this.group.add(this.shaft, this.head, this.originMark);
    // Clear of island relief — was reading inside the dome at peak*0.55.
    this.group.position.set(0, config.mountainPeak + 8, 0);
    this.group.visible = false;
  }

  /** Show blow direction. Calm hides the arrow. */
  setWind(id: WindId): void {
    const w = windById(id);
    if (w.ux === 0 && w.uz === 0) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    // Local +Z aligns with wind velocity (ux, uz).
    this.group.rotation.y = Math.atan2(w.ux, w.uz);
  }
}
