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
  /** Grid dims last draped onto the ground-cover mesh (0 = flat placeholder). */
  private groundGridW = 0;
  private groundGridH = 0;

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
    // Starts as a single quad; `setTerrainAffinity` rebuilds it to the sim
    // grid and drapes vertices onto elevation so it cannot clip through the
    // mountain as a flat y=const plane (the jagged white shards in the
    // 2026-08-05 bug screenshots).
    const groundGeo = new THREE.PlaneGeometry(worldSize * 1.02, worldSize * 1.02);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0xeef2f6,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.groundCover = new THREE.Mesh(groundGeo, groundMat);
    this.groundCover.position.y = 0;
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
   *
   * Also drapes the cover mesh onto `elevation` so the hold sits on the
   * landform instead of a flat y-plane cutting through peaks.
   */
  setTerrainAffinity(elevation: Float32Array, width: number, height: number): void {
    const tex = buildSnowAffinityTexture(elevation, width, height);
    this.groundAffinityTex?.dispose();
    this.groundAffinityTex = tex;
    const mat = this.groundCover.material as THREE.MeshBasicMaterial;
    mat.alphaMap = tex;
    mat.needsUpdate = true;
    this.drapeGroundCover(elevation, width, height);
  }

  /**
   * Rebuild (if needed) and displace ground-cover vertices onto the terrain
   * surface + a small lift. Presentation-only; does not write WorldState.
   */
  private drapeGroundCover(
    elevation: Float32Array,
    width: number,
    height: number,
  ): void {
    if (width < 2 || height < 2) return;
    if (width !== this.groundGridW || height !== this.groundGridH) {
      this.groundCover.geometry.dispose();
      const geo = new THREE.PlaneGeometry(
        this.worldSize,
        this.worldSize,
        width - 1,
        height - 1,
      );
      geo.rotateX(-Math.PI / 2);
      this.groundCover.geometry = geo;
      this.groundGridW = width;
      this.groundGridH = height;
    }
    const pos = this.groundCover.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const half = this.worldSize * 0.5;
    const lift = 0.06;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const u = (x + half) / this.worldSize;
      const v = (z + half) / this.worldSize;
      const fx = Math.min(width - 1, Math.max(0, u * (width - 1)));
      const fz = Math.min(height - 1, Math.max(0, v * (height - 1)));
      const x0 = Math.floor(fx);
      const z0 = Math.floor(fz);
      const x1 = Math.min(width - 1, x0 + 1);
      const z1 = Math.min(height - 1, z0 + 1);
      const tx = fx - x0;
      const tz = fz - z0;
      const e00 = elevation[z0 * width + x0]!;
      const e10 = elevation[z0 * width + x1]!;
      const e01 = elevation[z1 * width + x0]!;
      const e11 = elevation[z1 * width + x1]!;
      const e0 = e00 + (e10 - e00) * tx;
      const e1 = e01 + (e11 - e01) * tx;
      const e = e0 + (e1 - e0) * tz;
      pos.setY(i, e + lift);
    }
    pos.needsUpdate = true;
    this.groundCover.geometry.computeVertexNormals();
  }

  /**
   * Ceiling on particle motion per `update` call, in wall seconds.
   * Fade / melt use the full (possibly hitch-sized) `dt` so the 2026-08-05
   * snow-hold clear still progresses under a sim backlog; kinematics must
   * not — a day/s hitch integrating a full second of fall in one paint is
   * what turned rain into laser streaks (2026-08-06 evidence).
   */
  static readonly MOTION_DT_CAP_S = 1 / 30;

  /**
   * Advance streaks and fade veil. `dt` wall seconds.
   * `options.showStreaks === false` (presentation LOD P1+) skips particle
   * kinematics and hides the Points while fades / snow-hold still advance —
   * the hitch that stretched flakes into lasers must not reappear as a
   * rate-coupled drawing style (T-002 / U-002).
   */
  update(
    dt: number,
    windUx: number,
    windUz: number,
    options?: { showStreaks?: boolean; freezeTheatre?: boolean },
  ): void {
    const fadeDt = Math.max(0, dt);
    const showStreaks = options?.showStreaks !== false;
    const freezeTheatre = options?.freezeTheatre === true;
    const motionDt = showStreaks
      ? Math.min(fadeDt, RainCueMesh.MOTION_DT_CAP_S)
      : 0;
    const fade = 1 - Math.exp(-3.2 * fadeDt);

    if (freezeTheatre) {
      // Skip in flight (L8 P4): hold veil/streaks, still credit snow-hold
      // melt so a warm world cannot keep a pale sheet after the jump.
    } else {
      this.streakOpacity += (this.targetOpacity * 0.7 - this.streakOpacity) * fade;
      this.veilOpacity += (this.targetOpacity * 0.28 - this.veilOpacity) * fade;
    }

    // Snow cover builds with the spell; melts after. When the phase is no
    // longer snow (rain/sleet / spell cleared), melt at the build rate so a
    // warm world cannot keep a pale sheet around — the slow post-flake hold
    // only applies while we are still in snow phase with target 0 (spell
    // just ended, flakes stopped, brief linger).
    const building = this.targetGround > this.groundOpacity;
    const meltRate = !building && this.phase < 2 ? 3.5 : 0.4;
    const groundRate = building
      ? 1 - Math.exp(-2.2 * fadeDt)
      : 1 - Math.exp(-meltRate * fadeDt);
    this.groundOpacity += (this.targetGround - this.groundOpacity) * groundRate;
    if (this.groundOpacity < 0.01 && this.targetGround <= 0) {
      this.groundOpacity = 0;
    }

    const streakMat = this.points.material as THREE.PointsMaterial;
    const veilMat = this.veil.material as THREE.MeshBasicMaterial;
    const groundMat = this.groundCover.material as THREE.MeshBasicMaterial;
    if (!showStreaks || freezeTheatre) {
      this.streakOpacity = Math.min(this.streakOpacity, 0);
      this.points.visible = false;
    } else {
      this.points.visible = true;
    }
    streakMat.opacity = this.streakOpacity;
    veilMat.opacity = freezeTheatre ? 0 : this.veilOpacity;
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

    this.group.visible = true;
    if (!showStreaks || freezeTheatre || motionDt <= 0) {
      return;
    }

    this.time += motionDt;
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

    const driftX = windUx * 5 * motionDt * windResponseMul;
    const driftZ = windUz * 5 * motionDt * windResponseMul;
    const speed = (0.55 + this.targetOpacity * 0.9) * fallSpeedMul;
    const footprints = this.footprints;
    for (let i = 0; i < pos.count; i++) {
      const swayX =
        swayAmp > 0 ? Math.sin(this.time * 1.3 + i * 0.7) * swayAmp : 0;
      const swayZ =
        swayAmp > 0 ? Math.cos(this.time * 1.04 + i * 0.9) * swayAmp : 0;
      let x = pos.getX(i) + driftX + swayX * motionDt;
      let y = pos.getY(i) - this.velocities[i]! * motionDt * speed;
      let z = pos.getZ(i) + driftZ + swayZ * motionDt;
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
