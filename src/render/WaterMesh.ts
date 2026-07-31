import * as THREE from "three";
import { config } from "../config";
import type { WorldState } from "../sim/WorldState";
import {
  createFieldTexture,
  updateFieldTexture,
  FIELD_SAMPLE_GLSL,
} from "./fieldTexture";

/**
 * Water palette — data the renderer accepts, not shader-baked constants.
 * See TerrainMesh.ts's TerrainPalette for the same reasoning; a future
 * preserve (e.g. a reef/underwater biome) supplies a different shallow/deep
 * pair via WaterMesh.setPalette.
 */
export type WaterPalette = {
  shallow: THREE.ColorRepresentation;
  deep: THREE.ColorRepresentation;
};

export function defaultWaterPalette(): WaterPalette {
  return {
    shallow: new THREE.Color(0.35, 0.62, 0.82),
    deep: new THREE.Color(0.12, 0.35, 0.62),
  };
}

const waterVertex = /* glsl */ `
uniform sampler2D uDepthTex;
uniform sampler2D uElevationTex;
uniform sampler2D uOceanMaskTex;
uniform vec2 uFieldSize;
uniform float uTexelWorldSize;
uniform float uShowEps;
uniform float uStormActive;
varying vec3 vWorldNormal;
varying float vAlpha;
varying float vDepthT;
${FIELD_SAMPLE_GLSL}

void main() {
  vec2 fUv = fieldUv(uv);
  float elev = sampleFieldBilinear(uElevationTex, fUv, uFieldSize);
  float depth = max(0.0, sampleFieldBilinear(uDepthTex, fUv, uFieldSize));
  bool isOcean = sampleFieldBilinear(uOceanMaskTex, fUv, uFieldSize) > 0.5;
  bool wet = !isOcean && depth > uShowEps;

  float y = isOcean ? (elev - 1.0) : ((wet ? elev + depth : elev) + 0.04);

  float t = wet ? min(1.0, depth * 2.0) : 0.0;
  float a = wet ? (0.55 + 0.35 * t) : 0.0;
  if (uStormActive > 0.5 && wet && depth < 0.04) {
    a *= 0.35;
  }
  if (isOcean) {
    a = 0.0;
    t = 0.0;
  }
  vAlpha = a;
  vDepthT = t;

  // Analytic normal via central difference on the combined (elev + depth)
  // surface — replaces the CPU geometry.computeVertexNormals() pass.
  vec2 invSize = 1.0 / uFieldSize;
  float hL = sampleFieldBilinear(uElevationTex, fUv - vec2(invSize.x, 0.0), uFieldSize)
    + max(0.0, sampleFieldBilinear(uDepthTex, fUv - vec2(invSize.x, 0.0), uFieldSize));
  float hR = sampleFieldBilinear(uElevationTex, fUv + vec2(invSize.x, 0.0), uFieldSize)
    + max(0.0, sampleFieldBilinear(uDepthTex, fUv + vec2(invSize.x, 0.0), uFieldSize));
  float hD = sampleFieldBilinear(uElevationTex, fUv - vec2(0.0, invSize.y), uFieldSize)
    + max(0.0, sampleFieldBilinear(uDepthTex, fUv - vec2(0.0, invSize.y), uFieldSize));
  float hU = sampleFieldBilinear(uElevationTex, fUv + vec2(0.0, invSize.y), uFieldSize)
    + max(0.0, sampleFieldBilinear(uDepthTex, fUv + vec2(0.0, invSize.y), uFieldSize));
  float dHdx = (hR - hL) / (2.0 * uTexelWorldSize);
  float dHdz = (hU - hD) / (2.0 * uTexelWorldSize);
  vec3 localNormal = normalize(vec3(-dHdx, 1.0, -dHdz));

  vec3 displaced = vec3(position.x, y, position.z);
  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * localNormal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const waterFragment = /* glsl */ `
varying vec3 vWorldNormal;
varying float vAlpha;
varying float vDepthT;
uniform vec3 uShallowColor;
uniform vec3 uDeepColor;

void main() {
  if (vAlpha < 0.01) discard;
  vec3 n = normalize(vWorldNormal);
  vec3 lightDir = normalize(vec3(0.4, 1.0, 0.25));
  float ndl = 0.35 + 0.65 * max(dot(n, lightDir), 0.0);
  vec3 col = mix(uShallowColor, uDeepColor, clamp(vDepthT, 0.0, 1.0)) * ndl;
  gl_FragColor = vec4(col, vAlpha);
}
`;

export class WaterMesh {
  readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly dryEpsilon: number;
  /** Display depths — lerped toward sim; never written back (T-006). */
  private readonly displayDepth: Float32Array;

  private readonly depthTex: THREE.DataTexture;
  private readonly elevationTex: THREE.DataTexture;
  private readonly oceanMaskTex: THREE.DataTexture;
  private readonly oceanMaskField: Float32Array;
  private lastOceanCells: ReadonlySet<number> | undefined = undefined;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private palette: WaterPalette;

  constructor(
    width: number,
    height: number,
    worldSize: number,
    options?: { upsample?: number; palette?: WaterPalette },
  ) {
    this.dryEpsilon = config.dryEpsilon;
    this.displayDepth = new Float32Array(width * height);
    this.palette = options?.palette ?? defaultWaterPalette();
    const upsample = Math.max(1, Math.round(options?.upsample ?? 2));

    this.geometry = new THREE.PlaneGeometry(
      worldSize,
      worldSize,
      (width - 1) * upsample,
      (height - 1) * upsample,
    );
    this.geometry.rotateX(-Math.PI / 2);

    this.depthTex = createFieldTexture(width, height);
    this.elevationTex = createFieldTexture(width, height);
    this.oceanMaskTex = createFieldTexture(width, height);
    this.oceanMaskField = new Float32Array(width * height);

    this.uniforms = {
      uDepthTex: { value: this.depthTex },
      uElevationTex: { value: this.elevationTex },
      uOceanMaskTex: { value: this.oceanMaskTex },
      uFieldSize: { value: new THREE.Vector2(width, height) },
      uTexelWorldSize: { value: worldSize / (width - 1) },
      uShowEps: { value: this.dryEpsilon },
      uStormActive: { value: 0 },
      uShallowColor: { value: new THREE.Color() },
      uDeepColor: { value: new THREE.Color() },
    };
    this.applyPaletteToUniforms();

    // depthWrite + FrontSide: transparent DoubleSide + depthWrite:false was
    // re-sorting against terrain/cage every camera move (orbit flash).
    const material = new THREE.ShaderMaterial({
      vertexShader: waterVertex,
      fragmentShader: waterFragment,
      uniforms: this.uniforms,
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

  /** Swap the water palette (preserve data — see WaterPalette). */
  setPalette(palette: WaterPalette): void {
    this.palette = palette;
    this.applyPaletteToUniforms();
  }

  private applyPaletteToUniforms(): void {
    (this.uniforms.uShallowColor!.value as THREE.Color).set(this.palette.shallow);
    (this.uniforms.uDeepColor!.value as THREE.Color).set(this.palette.deep);
  }

  /** Snap display buffer to sim (reset / load). */
  snapFrom(world: WorldState): void {
    const waterData = world.water.data;
    for (let i = 0; i < this.displayDepth.length; i++) {
      this.displayDepth[i] = world.oceanCells.has(i) ? 0 : Math.max(0, waterData[i]!);
    }
    this.applyDisplay(world, false);
  }

  /**
   * Observer water surface. `wallDt` drives exponential catch-up so fast
   * event-step depth chatter (rain pulses, sheet flow, baseflow) reads as
   * continuous water rather than a strobe.
   * `stormActive`: during a precip event, shallow sheets stay more transparent
   * so rain reads as weather (streaks/veil) rather than a blue mass (T-006).
   */
  updateFrom(world: WorldState, wallDt = 1 / 60, stormActive = false): void {
    const tau = Math.max(1e-3, config.waterDisplayTauSeconds);
    const alpha = 1 - Math.exp(-Math.max(0, wallDt) / tau);
    const waterData = world.water.data;
    for (let i = 0; i < this.displayDepth.length; i++) {
      if (world.oceanCells.has(i)) {
        this.displayDepth[i] = 0;
        continue;
      }
      const target = Math.max(0, waterData[i]!);
      const cur = this.displayDepth[i]!;
      let next = cur + (target - cur) * alpha;
      // Snap dry to avoid everlasting microfilm.
      if (next < this.dryEpsilon * 0.25 && target < this.dryEpsilon) {
        next = 0;
      }
      this.displayDepth[i] = next;
    }
    this.applyDisplay(world, stormActive);
  }

  private applyDisplay(world: WorldState, stormActive: boolean): void {
    updateFieldTexture(this.depthTex, this.displayDepth);
    updateFieldTexture(this.elevationTex, world.terrain.data);
    if (world.oceanCells !== this.lastOceanCells) {
      this.oceanMaskField.fill(0);
      for (const idx of world.oceanCells) {
        this.oceanMaskField[idx] = 1;
      }
      updateFieldTexture(this.oceanMaskTex, this.oceanMaskField);
      this.lastOceanCells = world.oceanCells;
    }
    const showEps = stormActive ? Math.max(this.dryEpsilon, 0.012) : this.dryEpsilon;
    this.uniforms.uShowEps!.value = showEps;
    this.uniforms.uStormActive!.value = stormActive ? 1 : 0;
  }
}
