import * as THREE from "three";
import { snowCoverTarget } from "../ui/stormCue";

/**
 * Sprite generation needs a real `document` (canvas 2D context) — absent
 * under the sim's headless/Node test environment (T-006: sim and render are
 * tested separately; RainCueMesh's physics is still Node-testable, its
 * sprites are not). Falls back to an untextured point in that case —
 * presentation-only, never affects the motion/opacity logic under test.
 */
function hasDom(): boolean {
  return typeof document !== "undefined";
}

/**
 * Soft radial-gradient sprite so falling points read as flakes/drops instead
 * of hard-edged squares (the default THREE.PointsMaterial dot).
 */
function radialSprite(
  size: number,
  stops: [number, string][],
): THREE.CanvasTexture | null {
  if (!hasDom()) return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  for (const [offset, color] of stops) grad.addColorStop(offset, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Elongated vertical streak sprite (billboarded, so it reads as a falling
 * drop-trail rather than a snowflake) — distinct silhouette from
 * {@link radialSprite} even before color/size/motion differ.
 */
function streakSprite(): THREE.CanvasTexture | null {
  if (!hasDom()) return null;
  const w = 16;
  const h = 64;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.9)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(w * 0.3, 0, w * 0.4, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

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
  /** Per-particle lateral-drift frequency/phase — snow wanders, rain doesn't (G3). */
  private readonly swayFreq: Float32Array;
  private readonly swayPhase: Float32Array;
  private readonly swayAmp: Float32Array;
  private elapsed = 0;
  private phase = 0;
  private readonly rainTex: THREE.CanvasTexture | null;
  private readonly snowTex: THREE.CanvasTexture | null;
  private targetOpacity = 0;
  private streakOpacity = 0;
  private veilOpacity = 0;
  private targetGround = 0;
  private groundOpacity = 0;
  private readonly worldSize: number;

  constructor(worldSize: number, count = 1400) {
    this.worldSize = worldSize;
    this.group = new THREE.Group();
    this.group.name = "rainCue";

    const half = worldSize * 0.5;
    this.velocities = new Float32Array(count);
    this.swayFreq = new Float32Array(count);
    this.swayPhase = new Float32Array(count);
    this.swayAmp = new Float32Array(count);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * half;
      positions[i * 3 + 1] = Math.random() * 20 + 3;
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * half;
      this.velocities[i] = 10 + Math.random() * 14;
      this.swayFreq[i] = 0.5 + Math.random() * 1.1;
      this.swayPhase[i] = Math.random() * Math.PI * 2;
      this.swayAmp[i] = 0.6 + Math.random() * 1.1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.rainTex = streakSprite();
    this.snowTex = radialSprite(32, [
      [0, "rgba(255,255,255,1)"],
      [0.4, "rgba(255,255,255,0.95)"],
      [1, "rgba(255,255,255,0)"],
    ]);
    const mat = new THREE.PointsMaterial({
      color: 0xb8c8d4,
      size: 0.16,
      map: this.rainTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    // Fixed draw order (ocean=0/water=1/flowCue=2/cloud=4 elsewhere): these
    // three layers share depthWrite:false, so without an explicit order
    // Three.js re-sorts them by camera distance every frame, flipping blend
    // order as the camera orbits and reading as a flash. Ground overlay first
    // (nearest the terrain it sits on), then the sky veil, then the falling
    // streaks last so they always read in front.
    this.points.renderOrder = 6;
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
    this.veil.renderOrder = 5;
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
    this.groundCover.renderOrder = 3;
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
      // Snow: soft round flake sprite, bigger and slower-reading than rain
      // (see update()'s fall-speed scale-down and lateral sway).
      streakMat.color.setHex(0xeef2f6);
      streakMat.size = 0.34;
      streakMat.map = this.snowTex;
      veilMat.color.setHex(0xb8c4d0);
    } else if (phase >= 1) {
      streakMat.color.setHex(0xc0d0dc);
      streakMat.size = 0.2;
      streakMat.map = this.rainTex;
      veilMat.color.setHex(0x7a8a98);
    } else {
      streakMat.color.setHex(0xb8c8d4);
      streakMat.size = 0.16;
      streakMat.map = this.rainTex;
      veilMat.color.setHex(0x6a7a88);
    }
    streakMat.needsUpdate = true;
    if (active || this.groundOpacity > 0.02) this.group.visible = true;
  }

  /** Current ground-cover opacity — Tier-P proxy for snow hold (G3). */
  getGroundCoverOpacity(): number {
    return this.groundOpacity;
  }

  /** Mean particle height — Tier-P proxy for descent rate (snow falls slower than rain). */
  meanHeight(): number {
    const pos = this.points.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    let sum = 0;
    for (let i = 0; i < pos.count; i++) sum += pos.getY(i);
    return sum / pos.count;
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

    const pos = this.points.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const half = this.worldSize * 0.5;
    const driftX = windUx * 5 * dt;
    const driftZ = windUz * 5 * dt;
    const speed = 0.55 + this.targetOpacity * 0.9;
    // Snow falls slower and wanders side to side; rain falls straight and fast —
    // the motion difference reads as "snow" even before color/size/sprite do.
    const snow = this.phase >= 2;
    const fallScale = snow ? 0.22 : 1;
    this.elapsed += dt;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i) + driftX;
      let y = pos.getY(i) - this.velocities[i]! * fallScale * dt * speed;
      let z = pos.getZ(i) + driftZ;
      if (snow) {
        const sway =
          Math.sin(this.elapsed * this.swayFreq[i]! + this.swayPhase[i]!) *
          this.swayAmp[i]!;
        x += sway * dt;
      }
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
    this.rainTex?.dispose();
    this.snowTex?.dispose();
    this.veil.geometry.dispose();
    (this.veil.material as THREE.Material).dispose();
    this.groundCover.geometry.dispose();
    (this.groundCover.material as THREE.Material).dispose();
  }
}
