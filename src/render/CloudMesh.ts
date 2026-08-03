import * as THREE from "three";
import { wrapEdgeFade } from "../ui/stormCue";

type CloudBody = {
  mesh: THREE.Mesh;
  homeX: number;
  homeZ: number;
  homeY: number;
  /** Approximate horizontal footprint radius — base sphere radius × mean XZ scale. */
  radius: number;
  /** This frame's pick for "actively releasing" (G6) — top-N by opacity. */
  releasing: boolean;
};

export type CloudFootprint = {
  x: number;
  z: number;
  y: number;
  radius: number;
};

/**
 * Observer-only cloud bodies (full C-020 / T-006).
 * Opacity tracks atmospheric cloud water — never writes WorldState.
 * G2: soft edge fade before wrap. G4: bias toward windward / delivery side.
 */
export class CloudMesh {
  readonly group: THREE.Group;
  private readonly clouds: CloudBody[] = [];
  private opacity = 0;
  private targetOpacity = 0;
  private readonly worldSize: number;
  private readonly wrapHalf: number;
  private readonly wrapPad: number;
  /** How many clouds should read as actively releasing this frame (G6). */
  private releasingCount = 0;

  constructor(worldSize: number, count = 7) {
    this.worldSize = worldSize;
    this.wrapHalf = worldSize * 0.55;
    this.wrapPad = worldSize * 0.1;
    this.group = new THREE.Group();
    this.group.name = "clouds";

    const half = worldSize * 0.42;
    for (let i = 0; i < count; i++) {
      const baseRadius = 2.8 + (i % 3) * 0.9;
      const scaleX = 1.6 + (i % 2) * 0.5;
      const scaleZ = 1.1 + (i % 3) * 0.25;
      const geo = new THREE.SphereGeometry(baseRadius, 12, 10);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xd8dee6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const ang = (i / count) * Math.PI * 2;
      const r = half * (0.35 + (i % 4) * 0.12);
      const homeX = Math.cos(ang) * r;
      const homeZ = Math.sin(ang) * r * 0.85;
      const homeY = 11 + (i % 3) * 1.4;
      mesh.position.set(homeX, homeY, homeZ);
      mesh.scale.set(scaleX, 0.45, scaleZ);
      this.group.add(mesh);
      this.clouds.push({
        mesh,
        homeX,
        homeZ,
        homeY,
        radius: baseRadius * ((scaleX + scaleZ) / 2),
        releasing: false,
      });
    }
    this.group.visible = false;
  }

  /**
   * Arm the number of clouds that should read as releasing this frame (G6).
   * Selection happens in `update()` against whichever bodies are currently
   * densest (windward bias already ranks them) — no cell targeting, no new
   * RNG, just picking among the same drifting pool.
   */
  setReleasingCount(count: number): void {
    this.releasingCount = Math.max(0, count | 0);
  }

  /**
   * World-space footprints of the clouds currently marked releasing (G6) —
   * `RainCueMesh` spawns/respawns precip under these instead of a uniform
   * world-wide veil. Empty when nothing is releasing this frame.
   */
  getReleasingFootprints(): CloudFootprint[] {
    const out: CloudFootprint[] = [];
    for (const body of this.clouds) {
      if (!body.releasing) continue;
      out.push({
        x: body.mesh.position.x,
        z: body.mesh.position.z,
        y: body.mesh.position.y,
        radius: body.radius,
      });
    }
    return out;
  }

  /**
   * `cloudWater` is depth-equivalent meters; map to a soft 0..1 veil.
   * `phase` 2 (snow) cools the tint slightly.
   */
  setAtmosphere(cloudWater: number, phase: number = 0): void {
    const cover = Math.min(1, Math.max(0, cloudWater * 140));
    this.targetOpacity = cover * 0.55;
    const tint = phase >= 2 ? 0xe8eef4 : phase === 1 ? 0xc5ced8 : 0xd8dee6;
    for (const body of this.clouds) {
      (body.mesh.material as THREE.MeshBasicMaterial).color.setHex(tint);
    }
    if (cover > 0.02) this.group.visible = true;
  }

  /**
   * Drift gently with wind; soft-attract toward windward home (G4);
   * fade at wrap (G2).
   */
  update(dt: number, windUx: number, windUz: number): void {
    const fade = 1 - Math.exp(-2.4 * Math.max(0, dt));
    this.opacity += (this.targetOpacity - this.opacity) * fade;

    // Windward bias: clouds prefer the side the wind arrives from (delivery).
    const biasX = -windUx * this.worldSize * 0.28;
    const biasZ = -windUz * this.worldSize * 0.28;
    const attract = 1 - Math.exp(-1.1 * Math.max(0, dt));

    for (const body of this.clouds) {
      const mesh = body.mesh;
      const targetX = body.homeX + biasX;
      const targetZ = body.homeZ + biasZ;
      // Slow free drift — attract to windward home dominates (G4).
      mesh.position.x += windUx * 0.35 * dt;
      mesh.position.z += windUz * 0.35 * dt;
      mesh.position.x += (targetX - mesh.position.x) * attract * 0.65;
      mesh.position.z += (targetZ - mesh.position.z) * attract * 0.65;

      const half = this.wrapHalf;
      if (mesh.position.x > half) mesh.position.x -= this.worldSize * 1.1;
      if (mesh.position.x < -half) mesh.position.x += this.worldSize * 1.1;
      if (mesh.position.z > half) mesh.position.z -= this.worldSize * 1.1;
      if (mesh.position.z < -half) mesh.position.z += this.worldSize * 1.1;

      const edge = wrapEdgeFade(
        mesh.position.x,
        mesh.position.z,
        half,
        this.wrapPad,
      );
      // Windward bodies read denser when a spell is up (G4).
      const windMag2 = windUx * windUx + windUz * windUz;
      const windward =
        windMag2 > 1e-6
          ? 0.55 +
            0.55 *
              Math.max(
                0,
                Math.min(
                  1,
                  (-windUx * mesh.position.x - windUz * mesh.position.z) /
                    (this.worldSize * 0.28),
                ),
              )
          : 1;
      (mesh.material as THREE.MeshBasicMaterial).opacity =
        this.opacity * edge * Math.min(1.2, windward);
    }
    if (this.opacity < 0.015 && this.targetOpacity <= 0) {
      this.group.visible = false;
    }
    this.updateReleasingFlags();
  }

  /**
   * Picks the `releasingCount` densest bodies as this frame's releasing set
   * (G6) — reuses the windward-biased opacity ranking above rather than a
   * second targeting mechanism, and never marks a body that's too faint to
   * read as a cloud at all.
   */
  private updateReleasingFlags(): void {
    const ranked = this.clouds
      .map((body, idx) => ({
        idx,
        opacity: (body.mesh.material as THREE.MeshBasicMaterial).opacity,
      }))
      .sort((a, b) => b.opacity - a.opacity);
    const releasingIdx = new Set<number>();
    const n = Math.min(this.releasingCount, ranked.length);
    for (let k = 0; k < n; k++) {
      if (ranked[k]!.opacity > 0.05) releasingIdx.add(ranked[k]!.idx);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      this.clouds[i]!.releasing = releasingIdx.has(i);
    }
  }

  /** Total cloud bodies in the pool — sizes `releasingCloudCount` (G6). */
  get count(): number {
    return this.clouds.length;
  }

  /** Mean opacity of cloud materials — Tier-P / debug. */
  meanOpacity(): number {
    if (this.clouds.length === 0) return 0;
    let sum = 0;
    for (const body of this.clouds) {
      sum += (body.mesh.material as THREE.MeshBasicMaterial).opacity;
    }
    return sum / this.clouds.length;
  }

  /** Opacity-weighted centroid X — Tier-P windward delivery bias (G4). */
  weightedCentroidX(): number {
    let sum = 0;
    let w = 0;
    for (const body of this.clouds) {
      const o = (body.mesh.material as THREE.MeshBasicMaterial).opacity;
      sum += body.mesh.position.x * o;
      w += o;
    }
    return w > 1e-9 ? sum / w : 0;
  }

  dispose(): void {
    for (const body of this.clouds) {
      body.mesh.geometry.dispose();
      (body.mesh.material as THREE.Material).dispose();
    }
  }
}
