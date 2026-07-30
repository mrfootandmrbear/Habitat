import * as THREE from "three";

/**
 * Observer-only storm event cue (Slice R / C-020 / T-006).
 * Reads as a weather event: soft overcast veil + wind-aligned streaks.
 * Never writes WorldState.
 */
export class RainCueMesh {
  readonly group: THREE.Group;
  private readonly points: THREE.Points;
  private readonly veil: THREE.Mesh;
  private readonly velocities: Float32Array;
  private targetOpacity = 0;
  private streakOpacity = 0;
  private veilOpacity = 0;
  private readonly worldSize: number;

  constructor(worldSize: number, count = 1400) {
    this.worldSize = worldSize;
    this.group = new THREE.Group();
    this.group.name = "rainCue";

    const half = worldSize * 0.5;
    this.velocities = new Float32Array(count);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * half;
      positions[i * 3 + 1] = Math.random() * 20 + 3;
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * half;
      this.velocities[i] = 10 + Math.random() * 14;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xb8c8d4,
      size: 0.16,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.group.add(this.points);

    // Soft overcast plane — "a front is here", not a blue flood.
    const veilGeo = new THREE.PlaneGeometry(worldSize * 1.15, worldSize * 1.15);
    veilGeo.rotateX(-Math.PI / 2);
    const veilMat = new THREE.MeshBasicMaterial({
      color: 0x6a7a88,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.veil = new THREE.Mesh(veilGeo, veilMat);
    this.veil.position.y = 14;
    this.group.add(this.veil);
    this.group.visible = false;
  }

  /**
   * Arm or clear the storm event. Presentation fades — no hard blink.
   * `strength` 0..1 scales veil/streak density feel (arid vs monsoon).
   * `phase` 0 rain · 1 sleet · 2 snow (C-020).
   */
  setStorm(active: boolean, strength: number = 1, phase: number = 0): void {
    const s = Math.min(1, Math.max(0, strength));
    this.targetOpacity = active ? s : 0;
    const streakMat = this.points.material as THREE.PointsMaterial;
    const veilMat = this.veil.material as THREE.MeshBasicMaterial;
    if (phase >= 2) {
      streakMat.color.setHex(0xeef2f6);
      streakMat.size = 0.28;
      veilMat.color.setHex(0xb8c4d0);
    } else if (phase >= 1) {
      streakMat.color.setHex(0xc0d0dc);
      streakMat.size = 0.2;
      veilMat.color.setHex(0x7a8a98);
    } else {
      streakMat.color.setHex(0xb8c8d4);
      streakMat.size = 0.16;
      veilMat.color.setHex(0x6a7a88);
    }
    if (active) this.group.visible = true;
  }

  /**
   * Advance streaks and fade veil. `dt` wall seconds.
   */
  update(dt: number, windUx: number, windUz: number): void {
    const fade = 1 - Math.exp(-3.2 * Math.max(0, dt));
    this.streakOpacity += (this.targetOpacity * 0.7 - this.streakOpacity) * fade;
    this.veilOpacity += (this.targetOpacity * 0.28 - this.veilOpacity) * fade;

    const streakMat = this.points.material as THREE.PointsMaterial;
    const veilMat = this.veil.material as THREE.MeshBasicMaterial;
    streakMat.opacity = this.streakOpacity;
    veilMat.opacity = this.veilOpacity;

    if (this.streakOpacity < 0.02 && this.targetOpacity <= 0) {
      this.group.visible = false;
      return;
    }

    const pos = this.points.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const half = this.worldSize * 0.5;
    const driftX = windUx * 5 * dt;
    const driftZ = windUz * 5 * dt;
    const speed = 0.55 + this.targetOpacity * 0.9;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i) + driftX;
      let y = pos.getY(i) - this.velocities[i]! * dt * speed;
      let z = pos.getZ(i) + driftZ;
      if (y < 0) {
        y = 16 + Math.random() * 8;
        x = (Math.random() * 2 - 1) * half;
        z = (Math.random() * 2 - 1) * half;
      }
      if (x < -half) x += this.worldSize;
      if (x > half) x -= this.worldSize;
      if (z < -half) z += this.worldSize;
      if (z > half) z -= this.worldSize;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.veil.geometry.dispose();
    (this.veil.material as THREE.Material).dispose();
  }
}
