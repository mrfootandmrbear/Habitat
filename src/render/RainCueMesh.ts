import * as THREE from "three";
import { snowCoverTarget } from "../ui/stormCue";
import type { CloudFootprint } from "./CloudMesh";
import { buildSnowAffinityTexture } from "./snowAffinity";

/**
 * Observer-only storm event cue (Slice R / C-020 / T-006).
 * Reads as a weather event: soft overcast veil + wind-aligned streaks.
 * Snow adds a short-lived ground cover hold (G3) — never writes WorldState.
 */
export class RainCueMesh {
  readonly group: THREE.Group;
  private readonly points: THREE.Points;
  private readonly veil: THREE.Mesh;
  private readonly groundCover: THREE.Mesh;
  private readonly velocities: Float32Array;
  private targetOpacity = 0;
  private streakOpacity = 0;
  private veilOpacity = 0;
  private targetGround = 0;
  private groundOpacity = 0;
  private readonly worldSize: number;
  /** 0 rain · 1 sleet · 2 snow — drives per-phase fall motion (G7). */
  private phase = 0;
  /** Wall-seconds accumulator driving snow sway (G7). */
  private time = 0;
  /** Cloud footprints to spawn precip under (G6) — empty falls back to a uniform veil. */
  private footprints: CloudFootprint[] = [];
  private groundAffinityTex: THREE.DataTexture | null = null;

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

    // Snow ground hold — pale sheet that lingers after flakes (G3).
    const groundGeo = new THREE.PlaneGeometry(worldSize * 1.02, worldSize * 1.02);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0xeef2f6,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.groundCover = new THREE.Mesh(groundGeo, groundMat);
    this.groundCover.position.y = 0.35;
    this.group.add(this.groundCover);

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
    this.targetGround = snowCoverTarget(phase, active, s);
    this.phase = phase;
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
    if (active || this.groundOpacity > 0.02) this.group.visible = true;
  }

  /** Current ground-cover opacity — Tier-P proxy for snow hold (G3). */
  getGroundCoverOpacity(): number {
    return this.groundOpacity;
  }

  /** Current overcast-veil opacity — Tier-P proxy; also feeds weather fog (G9). */
  getVeilOpacity(): number {
    return this.veilOpacity;
  }

  /** Mean particle height — Tier-P proxy for fall-speed divergence (G7). */
  meanHeight(): number {
    const pos = this.points.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    let sum = 0;
    for (let i = 0; i < pos.count; i++) sum += pos.getY(i);
    return sum / pos.count;
  }

  /** Fraction of particles within `radius` of (x, z) — Tier-P proxy for cloud-sourced spawn (G6). */
  fractionNear(x: number, z: number, radius: number): number {
    const pos = this.points.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    let within = 0;
    for (let i = 0; i < pos.count; i++) {
      const dx = pos.getX(i) - x;
      const dz = pos.getZ(i) - z;
      if (Math.sqrt(dx * dx + dz * dz) < radius) within++;
    }
    return pos.count > 0 ? within / pos.count : 0;
  }

  /**
   * Cloud footprints to spawn/respawn precip under (G6). Empty falls back
   * to the old uniform world-wide scatter so precip never just vanishes
   * while `CloudMesh` hasn't reported any releasing bodies yet.
   */
  setCloudFootprints(footprints: CloudFootprint[]): void {
    this.footprints = footprints;
  }

  /**
   * Bakes a terrain-weighted patchy mask for the snow ground-cover hold
   * (G8) from the elevation grid that already exists — flatter, lower
   * ground collects more, exposed slopes shed. Still the same
   * `groundOpacity` scalar driving build/melt; this only reshapes its
   * texture, so it stays a presentation hold, not a snowpack store.
   */
  setTerrainAffinity(elevation: Float32Array, width: number, height: number): void {
    const tex = buildSnowAffinityTexture(elevation, width, height);
    this.groundAffinityTex?.dispose();
    this.groundAffinityTex = tex;
    const mat = this.groundCover.material as THREE.MeshBasicMaterial;
    mat.alphaMap = tex;
    mat.needsUpdate = true;
  }

  /**
   * Advance streaks and fade veil. `dt` wall seconds.
   */
  update(dt: number, windUx: number, windUz: number): void {
    const fade = 1 - Math.exp(-3.2 * Math.max(0, dt));
    this.streakOpacity += (this.targetOpacity * 0.7 - this.streakOpacity) * fade;
    this.veilOpacity += (this.targetOpacity * 0.28 - this.veilOpacity) * fade;

    // Snow cover builds with the spell; melts slowly after (presentation hold).
    const groundRate =
      this.targetGround > this.groundOpacity
        ? 1 - Math.exp(-2.2 * Math.max(0, dt))
        : 1 - Math.exp(-0.4 * Math.max(0, dt));
    this.groundOpacity += (this.targetGround - this.groundOpacity) * groundRate;

    const streakMat = this.points.material as THREE.PointsMaterial;
    const veilMat = this.veil.material as THREE.MeshBasicMaterial;
    const groundMat = this.groundCover.material as THREE.MeshBasicMaterial;
    streakMat.opacity = this.streakOpacity;
    veilMat.opacity = this.veilOpacity;
    groundMat.opacity = this.groundOpacity;

    if (
      this.streakOpacity < 0.02 &&
      this.targetOpacity <= 0 &&
      this.groundOpacity < 0.02 &&
      this.targetGround <= 0
    ) {
      this.group.visible = false;
      return;
    }

    this.time += dt;
    const pos = this.points.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const half = this.worldSize * 0.5;

    // Rain vs snow read as different weather, not the same dot recolored
    // (G7): snow falls slower, drifts more with wind, and sways as it falls;
    // rain falls fast and mostly just follows the wind shear.
    const fallSpeedMul = this.phase >= 2 ? 0.35 : this.phase >= 1 ? 0.7 : 1;
    const windResponseMul = this.phase >= 2 ? 1.6 : this.phase >= 1 ? 1.2 : 1;
    const swayAmp = this.phase >= 2 ? 0.55 : this.phase >= 1 ? 0.15 : 0;

    const driftX = windUx * 5 * dt * windResponseMul;
    const driftZ = windUz * 5 * dt * windResponseMul;
    const speed = (0.55 + this.targetOpacity * 0.9) * fallSpeedMul;
    const footprints = this.footprints;
    for (let i = 0; i < pos.count; i++) {
      const swayX =
        swayAmp > 0 ? Math.sin(this.time * 1.3 + i * 0.7) * swayAmp : 0;
      const swayZ =
        swayAmp > 0 ? Math.cos(this.time * 1.04 + i * 0.9) * swayAmp : 0;
      let x = pos.getX(i) + driftX + swayX * dt;
      let y = pos.getY(i) - this.velocities[i]! * dt * speed;
      let z = pos.getZ(i) + driftZ + swayZ * dt;
      if (y < 0) {
        if (footprints.length > 0) {
          // Spawn under a cloud footprint (G6) — precip reads as coming
          // out of the sky, not from a uniform veil with no source.
          const fp = footprints[i % footprints.length]!;
          x = fp.x + (Math.random() * 2 - 1) * fp.radius;
          z = fp.z + (Math.random() * 2 - 1) * fp.radius;
          y = fp.y - 0.5 + Math.random() * 1.2;
        } else {
          y = 16 + Math.random() * 8;
          x = (Math.random() * 2 - 1) * half;
          z = (Math.random() * 2 - 1) * half;
        }
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
    this.groundCover.geometry.dispose();
    (this.groundCover.material as THREE.Material).dispose();
    this.groundAffinityTex?.dispose();
  }
}
