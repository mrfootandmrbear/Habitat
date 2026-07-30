import * as THREE from "three";
import { config } from "../config";
import type { WaterStateView } from "../sim/types";

const waterVertex = /* glsl */ `
varying vec3 vWorldNormal;
varying float vAlpha;
varying float vDepthT;
attribute vec4 waterColor;

void main() {
  vAlpha = waterColor.a;
  vDepthT = waterColor.a > 0.0 ? waterColor.b : 0.0;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const waterFragment = /* glsl */ `
varying vec3 vWorldNormal;
varying float vAlpha;
varying float vDepthT;

void main() {
  if (vAlpha < 0.01) discard;
  vec3 n = normalize(vWorldNormal);
  vec3 lightDir = normalize(vec3(0.4, 1.0, 0.25));
  float ndl = 0.35 + 0.65 * max(dot(n, lightDir), 0.0);
  vec3 shallow = vec3(0.35, 0.62, 0.82);
  vec3 deep = vec3(0.12, 0.35, 0.62);
  vec3 col = mix(shallow, deep, clamp(vDepthT, 0.0, 1.0)) * ndl;
  gl_FragColor = vec4(col, vAlpha);
}
`;

export class WaterMesh {
  readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly width: number;
  private readonly height: number;
  private readonly worldSize: number;
  private readonly dryEpsilon: number;
  private readonly waterColor: THREE.BufferAttribute;
  /** Display depths — lerped toward sim; never written back (T-006). */
  private readonly displayDepth: Float32Array;
  private lastNormalKey = Number.NaN;

  constructor(width: number, height: number, worldSize: number) {
    this.width = width;
    this.height = height;
    this.worldSize = worldSize;
    this.dryEpsilon = config.dryEpsilon;
    this.displayDepth = new Float32Array(width * height);

    this.geometry = new THREE.PlaneGeometry(
      worldSize,
      worldSize,
      width - 1,
      height - 1,
    );
    this.geometry.rotateX(-Math.PI / 2);

    const count = this.geometry.attributes.position!.count;
    this.waterColor = new THREE.BufferAttribute(new Float32Array(count * 4), 4);
    this.geometry.setAttribute("waterColor", this.waterColor);

    // depthWrite + FrontSide: transparent DoubleSide + depthWrite:false was
    // re-sorting against terrain/cage every camera move (orbit flash).
    const material = new THREE.ShaderMaterial({
      vertexShader: waterVertex,
      fragmentShader: waterFragment,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.renderOrder = 1;
    this.mesh.name = "water";
  }

  /** Snap display buffer to sim (reset / load). */
  snapFrom(
    model: WaterStateView,
    oceanCells?: ReadonlySet<number>,
  ): void {
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const i = z * this.width + x;
        this.displayDepth[i] = oceanCells?.has(i)
          ? 0
          : Math.max(0, model.getWaterDepth(x, z));
      }
    }
    this.applyDisplay(model, oceanCells, true);
  }

  /**
   * Observer water surface. `wallDt` drives exponential catch-up so fast
   * event-step depth chatter (rain pulses, sheet flow, baseflow) reads as
   * continuous water rather than a strobe.
   */
  updateFrom(
    model: WaterStateView,
    oceanCells?: ReadonlySet<number>,
    wallDt = 1 / 60,
  ): void {
    const tau = Math.max(1e-3, config.waterDisplayTauSeconds);
    const alpha = 1 - Math.exp(-Math.max(0, wallDt) / tau);
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const i = z * this.width + x;
        if (oceanCells?.has(i)) {
          this.displayDepth[i] = 0;
          continue;
        }
        const target = Math.max(0, model.getWaterDepth(x, z));
        const cur = this.displayDepth[i]!;
        this.displayDepth[i] = cur + (target - cur) * alpha;
        // Snap dry to avoid everlasting microfilm.
        if (this.displayDepth[i]! < this.dryEpsilon * 0.25 && target < this.dryEpsilon) {
          this.displayDepth[i] = 0;
        }
      }
    }
    this.applyDisplay(model, oceanCells, false);
  }

  private applyDisplay(
    model: WaterStateView,
    oceanCells: ReadonlySet<number> | undefined,
    forceNormals: boolean,
  ): void {
    const pos = this.geometry.attributes.position as THREE.BufferAttribute;
    const cellW = this.worldSize / (this.width - 1);
    const cellH = this.worldSize / (this.height - 1);
    const ox = -this.worldSize / 2;
    const oz = -this.worldSize / 2;
    let i = 0;
    let wetSum = 0;
    let wetCount = 0;
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const cell = z * this.width + x;
        const h = model.getTerrainHeight(x, z);
        if (oceanCells?.has(cell)) {
          pos.setXYZ(i, ox + x * cellW, h - 1, oz + z * cellH);
          this.waterColor.setXYZW(i, 0, 0, 0, 0);
          i++;
          continue;
        }
        const w = this.displayDepth[cell]!;
        const wet = w > this.dryEpsilon;
        const y = (wet ? h + w : h) + 0.04;
        pos.setXYZ(i, ox + x * cellW, y, oz + z * cellH);

        const t = wet ? Math.min(1, w * 2) : 0;
        const a = wet ? 0.55 + 0.35 * t : 0;
        this.waterColor.setXYZW(i, 0, 0, t, a);
        if (wet) {
          wetSum += y;
          wetCount++;
        }
        i++;
      }
    }
    pos.needsUpdate = true;
    this.waterColor.needsUpdate = true;
    const key = wetCount > 0 ? wetSum / wetCount + wetCount * 1e-3 : 0;
    if (
      forceNormals ||
      !Number.isFinite(this.lastNormalKey) ||
      Math.abs(key - this.lastNormalKey) > 0.05
    ) {
      this.geometry.computeVertexNormals();
      this.lastNormalKey = key;
    }
  }
}
