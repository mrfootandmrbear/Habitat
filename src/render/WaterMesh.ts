import * as THREE from "three";
import { config } from "../config";
import type { WorldState } from "../sim/WorldState";
import {
  createFieldTexture,
  updateFieldTexture,
  FIELD_SAMPLE_GLSL,
} from "./fieldTexture";
import {
  SUN_COLOR,
  sunDirectionFromSky,
  type SkyLighting,
  type SkyLightingConsumer,
} from "./lightingRig";

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
varying vec3 vWorldPos;
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
  float dL = max(0.0, sampleFieldBilinear(uDepthTex, fUv - vec2(invSize.x, 0.0), uFieldSize));
  float dR = max(0.0, sampleFieldBilinear(uDepthTex, fUv + vec2(invSize.x, 0.0), uFieldSize));
  float dD = max(0.0, sampleFieldBilinear(uDepthTex, fUv - vec2(0.0, invSize.y), uFieldSize));
  float dU = max(0.0, sampleFieldBilinear(uDepthTex, fUv + vec2(0.0, invSize.y), uFieldSize));
  float hL = sampleFieldBilinear(uElevationTex, fUv - vec2(invSize.x, 0.0), uFieldSize) + dL;
  float hR = sampleFieldBilinear(uElevationTex, fUv + vec2(invSize.x, 0.0), uFieldSize) + dR;
  float hD = sampleFieldBilinear(uElevationTex, fUv - vec2(0.0, invSize.y), uFieldSize) + dD;
  float hU = sampleFieldBilinear(uElevationTex, fUv + vec2(0.0, invSize.y), uFieldSize) + dU;
  float dHdx = (hR - hL) / (2.0 * uTexelWorldSize);
  float dHdz = (hU - hD) / (2.0 * uTexelWorldSize);
  vec3 localNormal = normalize(vec3(-dHdx, 1.0, -dHdz));

  vec3 displaced = vec3(position.x, y, position.z);
  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * localNormal);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const waterFragment = /* glsl */ `
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying float vAlpha;
varying float vDepthT;
uniform vec3 uShallowColor;
uniform vec3 uDeepColor;
uniform float uTime;
uniform float uStormActive;

// Sun direction/color mirror Scene.ts's THREE.DirectionalLight (position
// (24,40,16), color 0xfff2dd) so the specular hot-spot lands where the
// scene's actual sun is, not a mismatched second light source. Sky
// zenith/horizon mirror Scene.ts's fog/background (0xb8c9d4) at the horizon
// so reflected sky blends into the real backdrop instead of reading as a
// foreign color (bar item 11: coherent palette). Uploaded as uniforms
// (rather than GLSL consts) computed once in TS — GLSL ES 1.00 forbids
// normalize() in a const initializer.
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * valueNoise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

// Two panning fbm layers = cheap animated ripple field, no texture assets.
float rippleHeight(vec2 p, float t) {
  vec2 p1 = p * 0.35 + vec2(t * 0.07, t * 0.045);
  vec2 p2 = p * 0.83 - vec2(t * 0.05, t * 0.09);
  return fbm(p1) * 0.65 + fbm(p2) * 0.35;
}

// Small-scale normal perturbation from the ripple field (central difference).
vec2 rippleTilt(vec2 p, float t) {
  float eps = 0.12;
  float hL = rippleHeight(p - vec2(eps, 0.0), t);
  float hR = rippleHeight(p + vec2(eps, 0.0), t);
  float hD = rippleHeight(p - vec2(0.0, eps), t);
  float hU = rippleHeight(p + vec2(0.0, eps), t);
  return vec2(hL - hR, hD - hU) / (2.0 * eps);
}

void main() {
  if (vAlpha < 0.01) discard;
  vec2 p = vWorldPos.xz;

  // Blend the fine ripple tilt into the analytic (large-scale slope) normal
  // rather than replacing it — river/sheet-flow tilt still reads, ripples
  // just add sparkle-scale detail on top.
  vec2 tilt = rippleTilt(p, uTime);
  vec3 n = normalize(vWorldNormal + vec3(tilt.x, 0.0, tilt.y) * 0.45);

  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 reflectDir = reflect(-viewDir, n);
  float skyT = smoothstep(0.0, 0.7, reflectDir.y * 0.5 + 0.5);
  vec3 skyColor = mix(uSkyHorizon, uSkyZenith, skyT);

  float ndv = clamp(dot(n, viewDir), 0.0, 1.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
  // Thin puddles must stay water-colored from god view — ripple normals
  // otherwise spike fresnel into the pale sky and read as white dusting
  // on every basin where runoff settles.
  float fresnelAmt = fresnel * 0.6 * smoothstep(0.06, 0.28, vDepthT);

  float ndl = 0.35 + 0.65 * max(dot(n, uSunDirection), 0.0);
  vec3 baseColor = mix(uShallowColor, uDeepColor, clamp(vDepthT, 0.0, 1.0)) * ndl;
  vec3 col = mix(baseColor, skyColor, fresnelAmt);

  // Sun specular sparkle: high-frequency noise breaks one big Phong blob
  // into many small glints, and the reinhard-style compress below keeps it
  // from ever hard-clipping to flat white (bar item 10).
  // Shallow inland puddles (low vDepthT) get almost no sparkle — at god-view
  // the sun hit on a flat microfilm otherwise reads as white patches where
  // water settles (2026-08 white-lag; beach foam stays on OceanMesh only).
  vec3 halfDir = normalize(viewDir + uSunDirection);
  float spec = pow(max(dot(n, halfDir), 0.0), 140.0);
  float sparkle = 0.5 + 0.9 * valueNoise(p * 9.0 + uTime * 0.6);
  spec *= sparkle * (0.3 + 0.7 * fresnel);
  spec *= smoothstep(0.08, 0.35, vDepthT);
  vec3 specCol = uSunColor * spec * 1.4;
  specCol = specCol / (1.0 + specCol);
  col += specCol;

  gl_FragColor = vec4(col, vAlpha);
}
`;

export class WaterMesh implements SkyLightingConsumer {
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
  /** Wall-clock accumulator driving ripple/sparkle animation; wrapped to
   *  keep float precision sane across long play sessions. */
  private elapsedSeconds = 0;

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
      uTime: { value: 0 },
      // Reflection and specular have to land where the rest of the scene
      // expects them (bar items 4, 11). Seeded from the shared rig, then
      // overwritten by `setSkyLighting` with tones probed off the real sky —
      // never hand-matched literals, which is how these last went stale.
      uSunDirection: { value: sunDirectionFromSky() },
      uSunColor: { value: new THREE.Color(SUN_COLOR) },
      uSkyZenith: { value: new THREE.Color(0.53, 0.7, 0.86) },
      uSkyHorizon: { value: new THREE.Color(0xcdd9e2) },
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

  /** Adopt the scene's measured sun/sky so reflections match the real sky. */
  setSkyLighting(lighting: SkyLighting): void {
    (this.uniforms.uSunDirection!.value as THREE.Vector3).copy(lighting.sunDirection);
    (this.uniforms.uSunColor!.value as THREE.Color).copy(lighting.sunColor);
    (this.uniforms.uSkyZenith!.value as THREE.Color).copy(lighting.skyZenith);
    (this.uniforms.uSkyHorizon!.value as THREE.Color).copy(lighting.skyHorizon);
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
    // Wrapped so ripple/sparkle noise phase never loses float precision
    // across a long-running session; the wrap point is well past any
    // period used by rippleHeight/valueNoise so it's visually seamless.
    this.elapsedSeconds = (this.elapsedSeconds + Math.max(0, wallDt)) % 10000;
    this.uniforms.uTime!.value = this.elapsedSeconds;
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
