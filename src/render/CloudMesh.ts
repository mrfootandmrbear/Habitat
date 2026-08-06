import * as THREE from "three";
import { wrapEdgeFade } from "../ui/stormCue";

type Puff = {
  sprite: THREE.Sprite;
  /** 0 (base, shadowed/cool) .. 1 (crown, lit/warm) — baked at creation. */
  lift: number;
  /** Per-puff density variance so a cluster doesn't read as one flat opacity. */
  density: number;
  /** Slow independent spin so the mass reads as alive, not a wallpaper decal. */
  spin: number;
};

type CloudBody = {
  /** Container carrying the puff cluster — same position role the old single mesh had. */
  group: THREE.Group;
  puffs: Puff[];
  homeX: number;
  homeZ: number;
  homeY: number;
  /** Last composite opacity applied (edge/windward-weighted) — Tier-P read. */
  currentOpacity: number;
  /**
   * Approximate horizontal footprint radius. These clouds are puff groups
   * rather than single spheres, so this is the puff spread rather than a
   * sphere radius × scale — same contract for `getReleasingFootprints`.
   */
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

// --- Procedural puff texture -------------------------------------------
// No external texture assets: a handful of overlapping soft radial blobs
// baked to a canvas once, cached, and reused (with per-instance tint/scale/
// rotation) across every cloud puff. Gives an irregular, soft-edged mass
// instead of a single hard-edged disc.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paintPuffTexture(seed: number): HTMLCanvasElement {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const rand = mulberry32(seed);
  const cx = size / 2;
  const cy = size / 2;

  // Several overlapping soft-edged blobs, lightened together, form an
  // irregular fluffy silhouette rather than a perfect circle.
  const blobCount = 6 + Math.floor(rand() * 3);
  ctx.globalCompositeOperation = "lighten";
  for (let i = 0; i < blobCount; i++) {
    const ang = rand() * Math.PI * 2;
    const dist = rand() * size * 0.2;
    const bx = cx + Math.cos(ang) * dist;
    const by = cy + Math.sin(ang) * dist * 0.62;
    const r = size * (0.24 + rand() * 0.24);
    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    grad.addColorStop(0, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.55)");
    grad.addColorStop(0.8, "rgba(255,255,255,0.14)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // One soft overall falloff pass so the cluster still reads as a single
  // rounded mass at a distance, not a bag of separate blobs.
  ctx.globalCompositeOperation = "destination-in";
  const veil = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
  veil.addColorStop(0, "rgba(255,255,255,1)");
  veil.addColorStop(0.7, "rgba(255,255,255,0.9)");
  veil.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, size, size);

  return canvas;
}

const PUFF_TEXTURE_SEEDS = [1337, 51117, 90210, 4242];
let puffTextureCache: THREE.CanvasTexture[] | null = null;

/** Lazily built + cached; guarded so this stays import-safe under Node (tests). */
function getPuffTextures(): THREE.CanvasTexture[] {
  if (puffTextureCache) return puffTextureCache;
  if (typeof document === "undefined") {
    puffTextureCache = [];
    return puffTextureCache;
  }
  puffTextureCache = PUFF_TEXTURE_SEEDS.map((seed) => {
    const tex = new THREE.CanvasTexture(paintPuffTexture(seed));
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
  return puffTextureCache;
}

// Pseudo-volumetric shading: crowns catch warm sun, bases sit in cool
// reflected-sky shadow — cheap but reads convincingly as lit volume.
const HILIGHT_TINT = new THREE.Color(0xfff6e6);
const SHADOW_TINT = new THREE.Color(0x8fa0b6);

/**
 * Observer-only cloud bodies (full C-020 / T-006).
 * Opacity tracks atmospheric cloud water — never writes WorldState.
 * G2: soft edge fade before wrap. G4: bias toward windward / delivery side.
 *
 * Each body is a small billboard-sprite cluster (procedural soft-edge
 * puffs) instead of a single flat-shaded sphere, so it reads as a soft
 * volumetric mass with a lit crown / shaded base.
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

    const textures = getPuffTextures();
    const half = worldSize * 0.42;

    for (let i = 0; i < count; i++) {
      const rand = mulberry32(0x9e3779b9 ^ (i * 2654435761));
      const cloudGroup = new THREE.Group();
      // Fixed draw order (matches ocean=0/water=1/flowCue=2 elsewhere): without
      // this, per-frame camera-distance transparency sort flips against the
      // rain veil/groundCover as the camera orbits, reading as a flash. Set on
      // the puff group rather than a single mesh — the sprites inherit it.
      cloudGroup.renderOrder = 4;

      const ang = (i / count) * Math.PI * 2;
      const r = half * (0.35 + (i % 4) * 0.12);
      const homeX = Math.cos(ang) * r;
      const homeZ = Math.sin(ang) * r * 0.85;
      const homeY = 11 + (i % 3) * 1.4;
      cloudGroup.position.set(homeX, homeY, homeZ);

      const baseR = 2.6 + (i % 3) * 0.8;
      const footprintX = baseR * (1.7 + (i % 2) * 0.4);
      const footprintZ = baseR * (1.15 + (i % 3) * 0.3);
      const footprintY = baseR * 0.5;

      const puffCount = 4 + Math.floor(rand() * 3);
      const puffs: Puff[] = [];
      for (let p = 0; p < puffCount; p++) {
        const lx = (rand() * 2 - 1) * footprintX;
        const ly = (rand() * 2 - 1) * footprintY;
        const lz = (rand() * 2 - 1) * footprintZ;
        const puffR = baseR * (0.62 + rand() * 0.5);

        const map = textures.length > 0 ? textures[Math.floor(rand() * textures.length)] : null;
        const materialParams: THREE.SpriteMaterialParameters = {
          transparent: true,
          opacity: 0,
          depthWrite: false,
          fog: true,
          color: 0xd8dee6,
        };
        if (map) materialParams.map = map;
        const material = new THREE.SpriteMaterial(materialParams);
        const sprite = new THREE.Sprite(material);
        sprite.position.set(lx, ly, lz);
        sprite.scale.set(puffR * 2, puffR * 1.7, 1);
        sprite.material.rotation = rand() * Math.PI * 2;
        cloudGroup.add(sprite);

        // Higher-set puffs read as the sunlit crown; low ones sit shaded.
        const lift = Math.min(1, Math.max(0, ly / footprintY * 0.5 + 0.5));
        puffs.push({
          sprite,
          lift,
          density: 0.75 + rand() * 0.35,
          spin: (rand() * 2 - 1) * 0.05,
        });
      }

      this.group.add(cloudGroup);
      // Footprint spans the puff spread, not one sphere — precip spawned under
      // a releasing cloud has to cover what the player actually sees overhead.
      this.clouds.push({
        group: cloudGroup,
        puffs,
        homeX,
        homeZ,
        homeY,
        currentOpacity: 0,
        radius: Math.max(footprintX, footprintZ) + baseR,
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
        x: body.group.position.x,
        z: body.group.position.z,
        y: body.group.position.y,
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
      for (const puff of body.puffs) {
        const c = new THREE.Color(tint);
        c.lerp(SHADOW_TINT, 0.45 * (1 - puff.lift));
        c.lerp(HILIGHT_TINT, 0.38 * puff.lift);
        puff.sprite.material.color.copy(c);
      }
    }
    if (cover > 0.02) this.group.visible = true;
  }

  /**
   * Drift gently with wind; soft-attract toward windward home (G4);
   * fade at wrap (G2). `animate === false` updates opacity only (LOD).
   */
  update(
    dt: number,
    windUx: number,
    windUz: number,
    options?: { animate?: boolean },
  ): void {
    const fade = 1 - Math.exp(-2.4 * Math.max(0, dt));
    this.opacity += (this.targetOpacity - this.opacity) * fade;

    if (options?.animate === false) {
      for (const body of this.clouds) {
        const edge = wrapEdgeFade(
          body.group.position.x,
          body.group.position.z,
          this.wrapHalf,
          this.wrapPad,
        );
        const composite = this.opacity * edge;
        body.currentOpacity = composite;
        for (const puff of body.puffs) {
          puff.sprite.material.opacity = Math.min(1, composite * puff.density);
        }
      }
      if (this.opacity < 0.015 && this.targetOpacity <= 0) {
        this.group.visible = false;
      }
      this.updateReleasingFlags();
      return;
    }

    // Windward bias: clouds prefer the side the wind arrives from (delivery).
    const biasX = -windUx * this.worldSize * 0.28;
    const biasZ = -windUz * this.worldSize * 0.28;
    const attract = 1 - Math.exp(-1.1 * Math.max(0, dt));

    for (const body of this.clouds) {
      const grp = body.group;
      const targetX = body.homeX + biasX;
      const targetZ = body.homeZ + biasZ;
      // Slow free drift — attract to windward home dominates (G4).
      grp.position.x += windUx * 0.35 * dt;
      grp.position.z += windUz * 0.35 * dt;
      grp.position.x += (targetX - grp.position.x) * attract * 0.65;
      grp.position.z += (targetZ - grp.position.z) * attract * 0.65;

      const half = this.wrapHalf;
      if (grp.position.x > half) grp.position.x -= this.worldSize * 1.1;
      if (grp.position.x < -half) grp.position.x += this.worldSize * 1.1;
      if (grp.position.z > half) grp.position.z -= this.worldSize * 1.1;
      if (grp.position.z < -half) grp.position.z += this.worldSize * 1.1;

      const edge = wrapEdgeFade(grp.position.x, grp.position.z, half, this.wrapPad);
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
                  (-windUx * grp.position.x - windUz * grp.position.z) /
                    (this.worldSize * 0.28),
                ),
              )
          : 1;
      const composite = this.opacity * edge * Math.min(1.2, windward);
      body.currentOpacity = composite;
      for (const puff of body.puffs) {
        puff.sprite.material.opacity = Math.min(1, composite * puff.density);
        puff.sprite.material.rotation += puff.spin * dt;
      }
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
        // Puff groups have no single material to read, and each body already
        // records the composite opacity it was last given — same ranking, one
        // less place for the two to drift apart.
        opacity: body.currentOpacity,
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

  /** Mean opacity of cloud bodies — Tier-P / debug. */
  meanOpacity(): number {
    if (this.clouds.length === 0) return 0;
    let sum = 0;
    for (const body of this.clouds) {
      sum += body.currentOpacity;
    }
    return sum / this.clouds.length;
  }

  /** Opacity-weighted centroid X — Tier-P windward delivery bias (G4). */
  weightedCentroidX(): number {
    let sum = 0;
    let w = 0;
    for (const body of this.clouds) {
      const o = body.currentOpacity;
      sum += body.group.position.x * o;
      w += o;
    }
    return w > 1e-9 ? sum / w : 0;
  }

  dispose(): void {
    for (const body of this.clouds) {
      for (const puff of body.puffs) {
        puff.sprite.material.dispose();
      }
    }
    // Puff textures are a shared, cached pool reused across CloudMesh
    // instances — intentionally not disposed here.
  }
}
