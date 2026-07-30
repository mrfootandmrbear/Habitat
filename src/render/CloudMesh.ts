import * as THREE from "three";

/**
 * Observer-only cloud bodies (full C-020 / T-006).
 * Opacity tracks atmospheric cloud water — never writes WorldState.
 */
export class CloudMesh {
  readonly group: THREE.Group;
  private readonly clouds: THREE.Mesh[] = [];
  private opacity = 0;
  private targetOpacity = 0;
  private readonly worldSize: number;

  constructor(worldSize: number, count = 7) {
    this.worldSize = worldSize;
    this.group = new THREE.Group();
    this.group.name = "clouds";

    const half = worldSize * 0.42;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(2.8 + (i % 3) * 0.9, 12, 10);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xd8dee6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const ang = (i / count) * Math.PI * 2;
      const r = half * (0.35 + (i % 4) * 0.12);
      mesh.position.set(
        Math.cos(ang) * r,
        11 + (i % 3) * 1.4,
        Math.sin(ang) * r * 0.85,
      );
      mesh.scale.set(1.6 + (i % 2) * 0.5, 0.45, 1.1 + (i % 3) * 0.25);
      this.group.add(mesh);
      this.clouds.push(mesh);
    }
    this.group.visible = false;
  }

  /**
   * `cloudWater` is depth-equivalent meters; map to a soft 0..1 veil.
   * `phase` 2 (snow) cools the tint slightly.
   */
  setAtmosphere(cloudWater: number, phase: number = 0): void {
    const cover = Math.min(1, Math.max(0, cloudWater * 140));
    this.targetOpacity = cover * 0.55;
    const tint = phase >= 2 ? 0xe8eef4 : phase === 1 ? 0xc5ced8 : 0xd8dee6;
    for (const mesh of this.clouds) {
      (mesh.material as THREE.MeshBasicMaterial).color.setHex(tint);
    }
    if (cover > 0.02) this.group.visible = true;
  }

  update(dt: number, windUx: number, windUz: number): void {
    const fade = 1 - Math.exp(-2.4 * Math.max(0, dt));
    this.opacity += (this.targetOpacity - this.opacity) * fade;
    for (const mesh of this.clouds) {
      (mesh.material as THREE.MeshBasicMaterial).opacity = this.opacity;
      mesh.position.x += windUx * 1.8 * dt;
      mesh.position.z += windUz * 1.8 * dt;
      const half = this.worldSize * 0.55;
      if (mesh.position.x > half) mesh.position.x -= this.worldSize * 1.1;
      if (mesh.position.x < -half) mesh.position.x += this.worldSize * 1.1;
      if (mesh.position.z > half) mesh.position.z -= this.worldSize * 1.1;
      if (mesh.position.z < -half) mesh.position.z += this.worldSize * 1.1;
    }
    if (this.opacity < 0.015 && this.targetOpacity <= 0) {
      this.group.visible = false;
    }
  }

  dispose(): void {
    for (const mesh of this.clouds) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }
}
