import * as THREE from "three";
import { config, type InspectorLayer } from "../config";
import type { WorldState } from "../sim/WorldState";
import type { WaterStateView } from "../sim/types";
import { compareClassName } from "../sim/prediction/PredictionSession";
import { understoryLightRgb } from "../ui/lightEncoding";
import {
  defaultTerrainRgb,
  WET,
  VEG,
  SCAR,
  INTERTIDAL,
  SALT,
} from "../ui/terrainEncoding";
import { herbBiomassRgb, strandBiomassRgb, binderBiomassRgb, marshBiomassRgb, shrubBiomassRgb, crustBiomassRgb } from "../ui/occupantEncoding";
import { elevChangeEncodingStrength } from "../sim/formMemory";
import { substrateProps, SUBSTRATES } from "../sim/terrain/substrates";
import {
  createFieldTexture,
  updateFieldTexture,
  FIELD_SAMPLE_GLSL,
} from "./fieldTexture";

const BASE = new THREE.Color(0x8b7355);
const WET_OVERLAY = new THREE.Color(0x4a5c3a);
const VEG_OVERLAY = new THREE.Color(0x3a7a3a);
const ERODE = new THREE.Color(0xc45c3a);
const DEPOSIT = new THREE.Color(0xe8d5a8);
const PREDICT_PENDING = new THREE.Color(0x2ec4b6);
const PREDICT_HIT = new THREE.Color(0x3dcc6f);
const PREDICT_MISS = new THREE.Color(0xe85d4c);
const PREDICT_UNEXPECTED = new THREE.Color(0xe8b84c);

/** Uniform array size for the GPU path's material table — headroom past the
 * current 4 substrates so a future preserve can add rows without a shader
 * change. */
const MATERIAL_SLOTS = 8;

/**
 * Terrain palette — data the renderer accepts, not shader-baked constants.
 * Sourced by default from the same constants the CPU default-view path uses
 * (ui/terrainEncoding.ts, sim/terrain/substrates.ts) so both paths render
 * identically; a future preserve can supply a different palette via
 * TerrainMesh.setPalette without touching this file.
 */
export type TerrainPalette = {
  wet: THREE.ColorRepresentation;
  veg: THREE.ColorRepresentation;
  scar: THREE.ColorRepresentation;
  intertidal: THREE.ColorRepresentation;
  salt: THREE.ColorRepresentation;
  erode: THREE.ColorRepresentation;
  deposit: THREE.ColorRepresentation;
  /** Indexed by substrate material id (sim/terrain/substrates.ts). */
  materials: readonly { dryRgb: THREE.ColorRepresentation; porosity: number }[];
};

export function defaultTerrainPalette(): TerrainPalette {
  return {
    wet: new THREE.Color(...WET),
    veg: new THREE.Color(...VEG),
    scar: new THREE.Color(...SCAR),
    intertidal: new THREE.Color(...INTERTIDAL),
    salt: new THREE.Color(...SALT),
    erode: ERODE.clone(),
    deposit: DEPOSIT.clone(),
    materials: SUBSTRATES.map((s) => ({
      dryRgb: new THREE.Color(...s.dryRgb),
      porosity: s.porosity,
    })),
  };
}

const TERRAIN_VERTEX_HEADER = /* glsl */ `
uniform sampler2D uElevationTex;
uniform vec2 uFieldSize;
uniform float uTexelWorldSize;
varying float vFieldElev;
${FIELD_SAMPLE_GLSL}
`;

const TERRAIN_NORMAL_INJECT = /* glsl */ `
vec2 tFieldUv = fieldUv(uv);
objectNormal = fieldHeightNormal(uElevationTex, tFieldUv, uFieldSize, uTexelWorldSize);
`;

const TERRAIN_DISPLACE_INJECT = /* glsl */ `
vFieldElev = sampleFieldBilinear(uElevationTex, tFieldUv, uFieldSize);
transformed.y = vFieldElev;
`;

const TERRAIN_FRAGMENT_HEADER = /* glsl */ `
uniform sampler2D uSoilMoistureTex;
uniform sampler2D uVegCoverTex;
uniform sampler2D uFireScarTex;
uniform sampler2D uSalinityTex;
uniform sampler2D uMaterialTex;
uniform sampler2D uErosionPulseTex;
uniform sampler2D uElevationTex;
uniform vec2 uFieldSize;
uniform float uTexelWorldSize;
uniform float uSeaLevel;
uniform float uMeanHighWater;
uniform float uHasSea;
uniform vec3 uWetColor;
uniform vec3 uVegColor;
uniform vec3 uScarColor;
uniform vec3 uIntertidalColor;
uniform vec3 uSaltColor;
uniform vec3 uErodeColor;
uniform vec3 uDepositColor;
uniform vec3 uMaterialDryRgb[${MATERIAL_SLOTS}];
uniform float uMaterialPorosity[${MATERIAL_SLOTS}];
varying float vFieldElev;
${FIELD_SAMPLE_GLSL}

vec3 materialDryRgb(int idx) {
  vec3 result = uMaterialDryRgb[0];
  for (int i = 0; i < ${MATERIAL_SLOTS}; i++) {
    if (i == idx) result = uMaterialDryRgb[i];
  }
  return result;
}

float materialPorosity(int idx) {
  float result = uMaterialPorosity[0];
  for (int i = 0; i < ${MATERIAL_SLOTS}; i++) {
    if (i == idx) result = uMaterialPorosity[i];
  }
  return result;
}

// --- Procedural surface detail (no texture assets — hand-authored GLSL
// noise). Feeds three independent shading passes below: micro-normal
// perturbation, per-substrate roughness, and a curvature-based AO
// approximation. Kept separate from the color-per-cell logic above, which
// must not change.
float terrainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float terrainValueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = terrainHash(i);
  float b = terrainHash(i + vec2(1.0, 0.0));
  float c = terrainHash(i + vec2(0.0, 1.0));
  float d = terrainHash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float terrainFbm(vec2 p) {
  float sum = terrainValueNoise(p) * 0.62;
  sum += terrainValueNoise(p * 2.31 + 19.19) * 0.26;
  sum += terrainValueNoise(p * 4.87 - 7.4) * 0.12;
  return sum;
}

/** Field-grid-space world XZ (meters-ish) — a stable, seamless coordinate
 * for procedural detail regardless of mesh transform or upsample factor. */
vec2 terrainWorldXZ(vec2 planeUv) {
  return planeUv * uFieldSize * uTexelWorldSize;
}

/** Per-substrate procedural bump height: sand reads as soft low-frequency
 * ripple, rock as sharp fine grain, loam/clay in between. Substrate ids
 * match sim/terrain/substrates.ts (0 loam, 1 sand, 2 clay, 3 rock). */
float terrainBumpHeight(vec2 worldXZ, int matId) {
  float coarseFreq = matId == 1 ? 0.55 : (matId == 3 ? 1.1 : 0.8);
  float fineFreq = matId == 1 ? 2.6 : (matId == 3 ? 6.5 : 4.2);
  float coarseAmt = matId == 1 ? 0.7 : (matId == 3 ? 0.35 : 0.55);
  return terrainFbm(worldXZ * coarseFreq) * coarseAmt
    + terrainFbm(worldXZ * fineFreq + 41.7) * (1.0 - coarseAmt);
}

vec2 terrainBumpGradient(vec2 worldXZ, int matId) {
  vec2 dx = dFdx(worldXZ);
  vec2 dy = dFdy(worldXZ);
  float h0 = terrainBumpHeight(worldXZ, matId);
  float hx = terrainBumpHeight(worldXZ + dx, matId);
  float hy = terrainBumpHeight(worldXZ + dy, matId);
  return vec2(hx - h0, hy - h0);
}

/** Perturb a shading normal by a screen-space height differential without a
 * precomputed tangent basis (Mikkelsen's surface-gradient method — the same
 * math as three.js's own bumpMap chunk, applied to a procedural height
 * instead of a texture since this repo has no asset pipeline). */
vec3 terrainPerturbNormal(vec3 surfPos, vec3 surfNormal, vec2 dHdxy, float faceDir) {
  vec3 vSigmaX = normalize(dFdx(surfPos));
  vec3 vSigmaY = normalize(dFdy(surfPos));
  vec3 r1 = cross(vSigmaY, surfNormal);
  vec3 r2 = cross(surfNormal, vSigmaX);
  float det = dot(vSigmaX, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surfNormal - grad);
}

/** Cheap curvature-based ambient occlusion: darkens concave creases/hollows
 * (channel cuts, footings) using the elevation field's discrete Laplacian —
 * reuses the same elevation texture the normal/displacement already sample,
 * no separate AO bake. Ridges/convex crusts are left untouched. */
float terrainCurvatureAO(vec2 fUv) {
  vec2 invSize = 1.0 / uFieldSize;
  float h = sampleFieldBilinear(uElevationTex, fUv, uFieldSize);
  float hL = sampleFieldBilinear(uElevationTex, fUv - vec2(invSize.x, 0.0), uFieldSize);
  float hR = sampleFieldBilinear(uElevationTex, fUv + vec2(invSize.x, 0.0), uFieldSize);
  float hD = sampleFieldBilinear(uElevationTex, fUv - vec2(0.0, invSize.y), uFieldSize);
  float hU = sampleFieldBilinear(uElevationTex, fUv + vec2(0.0, invSize.y), uFieldSize);
  vec2 invSize2 = invSize * 2.0;
  float hL2 = sampleFieldBilinear(uElevationTex, fUv - vec2(invSize2.x, 0.0), uFieldSize);
  float hR2 = sampleFieldBilinear(uElevationTex, fUv + vec2(invSize2.x, 0.0), uFieldSize);
  float hD2 = sampleFieldBilinear(uElevationTex, fUv - vec2(0.0, invSize2.y), uFieldSize);
  float hU2 = sampleFieldBilinear(uElevationTex, fUv + vec2(0.0, invSize2.y), uFieldSize);

  float lap = (hL + hR + hD + hU - 4.0 * h) + (hL2 + hR2 + hD2 + hU2 - 4.0 * h) * 0.5;
  float dx = max(uTexelWorldSize, 1e-4);
  float curvature = lap / (dx * dx);
  // Negative curvature = concave (channel/hollow/crease) -> darken;
  // positive curvature (ridges) is left alone.
  float occlusion = clamp(-curvature * 0.6, 0.0, 0.6);
  return 1.0 - occlusion;
}
`;

// GLSL port of ui/terrainEncoding.ts defaultTerrainRgb, plus the always-on
// ambient erosion pulse (TerrainMesh.md §2b) layered on top. Keep in sync
// with defaultTerrainRgb's lerp shape if that function changes.
const TERRAIN_COLOR_INJECT = /* glsl */ `
{
  vec2 fUv = fieldUv(vUv);
  float moisture = sampleFieldBilinear(uSoilMoistureTex, fUv, uFieldSize);
  float cover = clamp(sampleFieldBilinear(uVegCoverTex, fUv, uFieldSize), 0.0, 1.0);
  float scar = clamp(sampleFieldBilinear(uFireScarTex, fUv, uFieldSize), 0.0, 1.0);
  float salinity = clamp(sampleFieldBilinear(uSalinityTex, fUv, uFieldSize), 0.0, 1.0);
  int materialId = int(sampleFieldNearest(uMaterialTex, fUv, uFieldSize) + 0.5);
  float porosity = max(materialPorosity(materialId), 1e-6);
  vec3 base = materialDryRgb(materialId);

  float soilT = clamp(moisture / porosity, 0.0, 1.0);
  vec3 wetBase = mix(base, uWetColor, soilT);
  float vegAmount = clamp(cover * (0.28 + 0.62 * soilT) * (1.0 - salinity * 0.9), 0.0, 1.0);
  vec3 col = mix(wetBase, uVegColor, vegAmount);

  // Categorical overlays blend proportionally to their own weight instead of
  // layering sequentially, so a later one (salt) can't wash an earlier one
  // (scar) out almost entirely when both are true at once. A single active
  // overlay reproduces the old sequential mix exactly (BUILD_GUIDE §4.52).
  bool isForeshore = uHasSea > 0.5 && vFieldElev >= uSeaLevel && vFieldElev < uMeanHighWater;
  float scarW = scar > 0.0 ? min(0.85, scar * 0.9) : 0.0;
  float intertidalW = isForeshore ? 0.62 : 0.0;
  float saltW = salinity > 0.0 ? min(0.78, salinity * 0.7) : 0.0;
  float overlaySum = scarW + intertidalW + saltW;
  if (overlaySum > 0.0) {
    vec3 overlayColor = (scarW * uScarColor + intertidalW * uIntertidalColor + saltW * uSaltColor) / overlaySum;
    col = mix(col, overlayColor, min(1.0, overlaySum));
  }

  float pulse = sampleFieldBilinear(uErosionPulseTex, fUv, uFieldSize);
  float pulseStrength = min(1.0, abs(pulse) / 0.025);
  if (pulseStrength > 0.0) {
    col = mix(col, pulse < 0.0 ? uErodeColor : uDepositColor, pulseStrength * 0.9);
  }

  diffuseColor.rgb = col;
}
`;

// Per-substrate roughness (porosity-driven wetness reuses the same soilT
// shape as TERRAIN_COLOR_INJECT, so a puddled low-porosity rock face reads
// "wet" at the same threshold it reads visually darker/wet-colored) plus a
// fine noise jitter so a substrate doesn't read as one flat painted value.
const TERRAIN_ROUGHNESS_INJECT = /* glsl */ `
{
  vec2 rFieldUv = fieldUv(vUv);
  int rMatId = int(sampleFieldNearest(uMaterialTex, rFieldUv, uFieldSize) + 0.5);
  float rMoisture = sampleFieldBilinear(uSoilMoistureTex, rFieldUv, uFieldSize);
  float rPorosity = max(materialPorosity(rMatId), 1e-6);
  float rSoilT = clamp(rMoisture / rPorosity, 0.0, 1.0);

  // Dry baseline: sand matte/rough, rock less porous & harder (smoother),
  // clay/loam in between. Wet: everything glosses up, mud/clay most of all;
  // rock stays a touch rougher than mud even wet (fracture, not slick).
  float dryRough = rMatId == 1 ? 0.96 : (rMatId == 2 ? 0.84 : (rMatId == 3 ? 0.66 : 0.9));
  float wetRough = rMatId == 3 ? 0.3 : (rMatId == 1 ? 0.72 : 0.32);
  float substrateRough = mix(dryRough, wetRough, rSoilT);

  float jitter = (terrainValueNoise(terrainWorldXZ(vUv) * 5.2) - 0.5) * 0.07;
  // Clamped off both ends of [0,1]: never fully mirror-smooth (clipped
  // highlight) and never fully matte-flat (crushed, lifeless black).
  roughnessFactor = clamp(substrateRough + jitter, 0.18, 0.97);
}
`;

// Fragment-rate micro-normal perturbation — the vertex-stage analytic normal
// (fieldHeightNormal) is smooth across the upsampled mesh; this adds
// per-pixel grain so the surface reads as hand-crafted rather than a flat
// low-poly shell, independent of geometry/upsample resolution.
const TERRAIN_NORMAL_DETAIL_INJECT = /* glsl */ `
{
  vec2 nFieldUv = fieldUv(vUv);
  int nMatId = int(sampleFieldNearest(uMaterialTex, nFieldUv, uFieldSize) + 0.5);
  vec2 nWorldXZ = terrainWorldXZ(vUv);
  vec2 dHdxy = terrainBumpGradient(nWorldXZ, nMatId) * 0.14;
  normal = terrainPerturbNormal(-vViewPosition, normal, dHdxy, faceDirection);
}
`;

// Curvature AO darkens only the indirect (ambient/env) light contribution —
// direct sun stays untouched — so creases/channel cuts read as shadowed
// without double-darkening what the directional light already models.
const TERRAIN_AO_INJECT = /* glsl */ `
{
  float terrainAo = terrainCurvatureAO(fieldUv(vUv));
  reflectedLight.indirectDiffuse *= terrainAo;
  reflectedLight.indirectSpecular *= terrainAo;
}
`;

/** Ambient erosion pulse decay per sync (TerrainMesh.md §2b) — ~0.85-0.9. */
const EROSION_PULSE_DECAY = 0.88;

/**
 * Inject GLSL right after a three.js shader chunk `#include`. Throws instead
 * of silently no-op'ing if the chunk marker isn't present, so a three.js
 * upgrade that renames/removes a chunk fails loudly at material compile time
 * rather than shipping flat, uncolored terrain with no error.
 */
function injectAfterInclude(source: string, marker: string, injected: string): string {
  if (!source.includes(marker)) {
    throw new Error(
      `TerrainMesh: shader chunk "${marker}" not found — three.js internals changed; update the injection point.`,
    );
  }
  return source.replace(marker, `${marker}\n${injected}`);
}

/**
 * Terrain mesh: a Group wrapping two sub-meshes.
 * - gpuMesh: default view — GPU-displaced/colored, smooth, upsampled past
 *   the sim grid. Fast path: field textures updated via native memcpy, no
 *   per-cell CPU loop.
 * - cpuMesh: inspector overlays / prediction marks / "remembered form" tint
 *   — unchanged CPU per-cell rebuild (Tier-P color logic, ~20 overlay modes)
 *   at native sim-grid resolution.
 * Exactly one is a child of `mesh` at a time, so raycasting (siting/cutaway)
 * only ever hits the currently-visible surface.
 */
export class TerrainMesh {
  readonly mesh: THREE.Group;
  private readonly width: number;
  private readonly height: number;
  private readonly worldSize: number;

  // CPU fallback path (overlay / prediction / elevDelta) — unchanged from
  // the pre-GPU implementation.
  private readonly cpuMesh: THREE.Mesh;
  private readonly cpuGeometry: THREE.PlaneGeometry;
  private readonly colors: THREE.BufferAttribute;
  private readonly scratchColor = new THREE.Color();
  /** Elevation as of the last normals rebuild, for the per-cell dirty check below. */
  private readonly lastNormalElevGrid: Float32Array;
  private readonly pendingElevGrid: Float32Array;

  // GPU default path.
  private readonly gpuMesh: THREE.Mesh;
  private readonly gpuMaterial: THREE.MeshStandardMaterial;
  private readonly elevationTex: THREE.DataTexture;
  private readonly soilMoistureTex: THREE.DataTexture;
  private readonly vegCoverTex: THREE.DataTexture;
  private readonly fireScarTex: THREE.DataTexture;
  private readonly salinityTex: THREE.DataTexture;
  private readonly materialTex: THREE.DataTexture;
  private readonly erosionPulseTex: THREE.DataTexture;
  private readonly gpuUniforms: Record<string, THREE.IUniform>;
  private readonly prevElevField: Float32Array;
  private readonly erosionPulseField: Float32Array;
  private erosionPulseInitialized = false;

  private activeChild: "gpu" | "cpu" = "gpu";
  private palette: TerrainPalette;

  constructor(
    width: number,
    height: number,
    worldSize: number,
    options?: { upsample?: number; palette?: TerrainPalette },
  ) {
    this.width = width;
    this.height = height;
    this.worldSize = worldSize;
    this.lastNormalElevGrid = new Float32Array(width * height).fill(Number.NaN);
    this.pendingElevGrid = new Float32Array(width * height);
    this.palette = options?.palette ?? defaultTerrainPalette();
    const upsample = Math.max(1, Math.round(options?.upsample ?? 2));

    // --- CPU fallback mesh (native sim-grid resolution, unchanged logic) ---
    this.cpuGeometry = new THREE.PlaneGeometry(
      worldSize,
      worldSize,
      width - 1,
      height - 1,
    );
    this.cpuGeometry.rotateX(-Math.PI / 2);
    const cpuCount = this.cpuGeometry.attributes.position!.count;
    this.colors = new THREE.BufferAttribute(new Float32Array(cpuCount * 3), 3);
    this.cpuGeometry.setAttribute("color", this.colors);
    const cpuMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true,
    });
    this.cpuMesh = new THREE.Mesh(this.cpuGeometry, cpuMaterial);
    this.cpuMesh.name = "terrain-cpu-fallback";
    // Ground plane: receives cast shadows (occupants, terrain self-shadow
    // once a shadow-casting light is configured) and casts onto itself
    // across ridges/berms. No-op today (no shadow-casting light is set up
    // yet) but correct so terrain participates the moment one is added.
    this.cpuMesh.receiveShadow = true;
    this.cpuMesh.castShadow = true;

    // --- GPU default mesh (upsampled, shader-driven) ---
    const gpuGeometry = new THREE.PlaneGeometry(
      worldSize,
      worldSize,
      (width - 1) * upsample,
      (height - 1) * upsample,
    );
    gpuGeometry.rotateX(-Math.PI / 2);

    this.elevationTex = createFieldTexture(width, height);
    this.soilMoistureTex = createFieldTexture(width, height);
    this.vegCoverTex = createFieldTexture(width, height);
    this.fireScarTex = createFieldTexture(width, height);
    this.salinityTex = createFieldTexture(width, height);
    this.materialTex = createFieldTexture(width, height);
    this.erosionPulseTex = createFieldTexture(width, height);
    this.prevElevField = new Float32Array(width * height);
    this.erosionPulseField = new Float32Array(width * height);

    this.gpuUniforms = {
      uElevationTex: { value: this.elevationTex },
      uSoilMoistureTex: { value: this.soilMoistureTex },
      uVegCoverTex: { value: this.vegCoverTex },
      uFireScarTex: { value: this.fireScarTex },
      uSalinityTex: { value: this.salinityTex },
      uMaterialTex: { value: this.materialTex },
      uErosionPulseTex: { value: this.erosionPulseTex },
      uFieldSize: { value: new THREE.Vector2(width, height) },
      uTexelWorldSize: { value: worldSize / (width - 1) },
      uSeaLevel: { value: 0 },
      uMeanHighWater: { value: 0 },
      uHasSea: { value: 0 },
      uWetColor: { value: new THREE.Color() },
      uVegColor: { value: new THREE.Color() },
      uScarColor: { value: new THREE.Color() },
      uIntertidalColor: { value: new THREE.Color() },
      uSaltColor: { value: new THREE.Color() },
      uErodeColor: { value: new THREE.Color() },
      uDepositColor: { value: new THREE.Color() },
      uMaterialDryRgb: { value: [] as THREE.Color[] },
      uMaterialPorosity: { value: [] as number[] },
    };
    this.applyPaletteToUniforms();

    this.gpuMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.92,
      metalness: 0.05,
    });
    this.gpuMaterial.defines = { USE_UV: "" };
    this.gpuMaterial.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.gpuUniforms);
      let vertexShader = injectAfterInclude(
        shader.vertexShader,
        "#include <beginnormal_vertex>",
        TERRAIN_NORMAL_INJECT,
      );
      vertexShader = injectAfterInclude(
        vertexShader,
        "#include <begin_vertex>",
        TERRAIN_DISPLACE_INJECT,
      );
      shader.vertexShader = `${TERRAIN_VERTEX_HEADER}\n${vertexShader}`;

      let fragmentShader = injectAfterInclude(
        shader.fragmentShader,
        "#include <color_fragment>",
        TERRAIN_COLOR_INJECT,
      );
      fragmentShader = injectAfterInclude(
        fragmentShader,
        "#include <roughnessmap_fragment>",
        TERRAIN_ROUGHNESS_INJECT,
      );
      fragmentShader = injectAfterInclude(
        fragmentShader,
        "#include <normal_fragment_maps>",
        TERRAIN_NORMAL_DETAIL_INJECT,
      );
      fragmentShader = injectAfterInclude(
        fragmentShader,
        "#include <aomap_fragment>",
        TERRAIN_AO_INJECT,
      );
      shader.fragmentShader = `${TERRAIN_FRAGMENT_HEADER}\n${fragmentShader}`;
    };

    this.gpuMesh = new THREE.Mesh(gpuGeometry, this.gpuMaterial);
    this.gpuMesh.name = "terrain-gpu";
    this.gpuMesh.receiveShadow = true;
    this.gpuMesh.castShadow = true;

    this.mesh = new THREE.Group();
    this.mesh.name = "terrain";
    this.mesh.add(this.gpuMesh);
    this.activeChild = "gpu";
  }

  /** Swap the terrain palette (preserve data — see TerrainPalette). */
  setPalette(palette: TerrainPalette): void {
    this.palette = palette;
    this.applyPaletteToUniforms();
  }

  private applyPaletteToUniforms(): void {
    const p = this.palette;
    (this.gpuUniforms.uWetColor!.value as THREE.Color).set(p.wet);
    (this.gpuUniforms.uVegColor!.value as THREE.Color).set(p.veg);
    (this.gpuUniforms.uScarColor!.value as THREE.Color).set(p.scar);
    (this.gpuUniforms.uIntertidalColor!.value as THREE.Color).set(p.intertidal);
    (this.gpuUniforms.uSaltColor!.value as THREE.Color).set(p.salt);
    (this.gpuUniforms.uErodeColor!.value as THREE.Color).set(p.erode);
    (this.gpuUniforms.uDepositColor!.value as THREE.Color).set(p.deposit);
    const dryRgb: THREE.Color[] = [];
    const porosity: number[] = [];
    for (let i = 0; i < MATERIAL_SLOTS; i++) {
      const m = p.materials[i] ?? p.materials[0];
      dryRgb.push(new THREE.Color(m?.dryRgb ?? 0x8b7355));
      porosity.push(m?.porosity ?? 0.45);
    }
    this.gpuUniforms.uMaterialDryRgb!.value = dryRgb;
    this.gpuUniforms.uMaterialPorosity!.value = porosity;
  }

  private setActiveChild(mode: "gpu" | "cpu"): void {
    if (this.activeChild === mode) return;
    this.mesh.remove(this.activeChild === "gpu" ? this.gpuMesh : this.cpuMesh);
    this.mesh.add(mode === "gpu" ? this.gpuMesh : this.cpuMesh);
    this.activeChild = mode;
  }

  updateFrom(
    model: WaterStateView,
    world?: WorldState,
    overlay: InspectorLayer = "none",
    predictionClassify: Uint8Array | null = null,
    /** Per-cell elev delta (now − then) for return-visit encoding; null = off. */
    elevDelta: Float32Array | null = null,
  ): void {
    const useCpuFallback =
      overlay !== "none" || predictionClassify !== null || elevDelta !== null;

    if (useCpuFallback) {
      this.setActiveChild("cpu");
      this.updateCpuFallback(model, world, overlay, predictionClassify, elevDelta);
      return;
    }

    this.setActiveChild("gpu");
    if (world) {
      this.updateGpuDefault(world);
    }
  }

  private updateGpuDefault(world: WorldState): void {
    updateFieldTexture(this.elevationTex, world.terrain.data);
    updateFieldTexture(this.soilMoistureTex, world.soilMoisture.data);
    updateFieldTexture(this.vegCoverTex, world.vegCover.data);
    updateFieldTexture(this.fireScarTex, world.fireScar.data);
    updateFieldTexture(this.salinityTex, world.soilSalinity.data);
    updateFieldTexture(this.materialTex, world.soilMaterial.data);

    // Ambient erosion pulse (TerrainMesh.md §2b) — decaying signed impulse
    // tracker off real geomorphology activity, independent of "Remember form".
    const elevNow = world.terrain.data;
    if (!this.erosionPulseInitialized) {
      this.prevElevField.set(elevNow);
      this.erosionPulseInitialized = true;
    } else {
      for (let i = 0; i < this.erosionPulseField.length; i++) {
        const delta = elevNow[i]! - this.prevElevField[i]!;
        this.erosionPulseField[i] = this.erosionPulseField[i]! * EROSION_PULSE_DECAY + delta;
      }
      this.prevElevField.set(elevNow);
    }
    updateFieldTexture(this.erosionPulseTex, this.erosionPulseField);

    const hasSea = world.seaLevel !== undefined && world.tidalAmplitude > 0;
    this.gpuUniforms.uHasSea!.value = hasSea ? 1 : 0;
    this.gpuUniforms.uSeaLevel!.value = world.seaLevel ?? 0;
    this.gpuUniforms.uMeanHighWater!.value = world.meanHighWater ?? 0;
  }

  private updateCpuFallback(
    model: WaterStateView,
    world: WorldState | undefined,
    overlay: InspectorLayer,
    predictionClassify: Uint8Array | null,
    elevDelta: Float32Array | null,
  ): void {
    const pos = this.cpuGeometry.attributes.position as THREE.BufferAttribute;
    const cellW = this.worldSize / (this.width - 1);
    const ox = -this.worldSize / 2;
    const oz = -this.worldSize / 2;

    let maxAcc = 1;
    if (world?.flowAccumulation) {
      for (let i = 0; i < world.flowAccumulation.length; i++) {
        if (world.flowAccumulation[i]! > maxAcc) {
          maxAcc = world.flowAccumulation[i]!;
        }
      }
    }

    let i = 0;
    let maxElevDelta = 0;
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const elev = model.getTerrainHeight(x, z);
        this.pendingElevGrid[i] = elev;
        const prevElev = this.lastNormalElevGrid[i]!;
        if (Number.isFinite(prevElev)) {
          const d = Math.abs(elev - prevElev);
          if (d > maxElevDelta) maxElevDelta = d;
        } else {
          maxElevDelta = Infinity;
        }
        pos.setXYZ(i, ox + x * cellW, elev, oz + z * cellW);

        const col = this.scratchColor;
        if (world && overlay !== "none") {
          this.applyOverlay(col, world, x, z, overlay, maxAcc);
        } else if (world) {
          const material = world.getSoilMaterial(x, z);
          const porosity = substrateProps(material).porosity;
          const [r, g, b] = defaultTerrainRgb(
            world.getSoilMoisture(x, z),
            porosity,
            world.getVegCover(x, z),
            world.getFireScar(x, z),
            world.isForeshore(x, z),
            world.getSoilSalinity(x, z),
            material,
          );
          col.setRGB(r, g, b);
          if (elevDelta) {
            const d = elevDelta[i] ?? 0;
            const strength = elevChangeEncodingStrength(d);
            if (strength > 0) {
              col.lerp(d < 0 ? ERODE : DEPOSIT, Math.min(0.9, strength * 0.95));
            }
          }
        } else {
          col.copy(BASE);
        }

        if (predictionClassify) {
          this.applyPrediction(col, predictionClassify[i] ?? 0);
        }

        this.colors.setXYZ(i, col.r, col.g, col.b);
        i++;
      }
    }
    pos.needsUpdate = true;
    this.colors.needsUpdate = true;
    // Recomputing normals every event at 16× makes flat-shaded lighting strobe
    // as coastal elev ticks — only rebuild when some cell moved meaningfully.
    // Gated on the largest single-cell delta, not the grid-wide sum: mass-
    // conserving changes (erosion moving soil from one cell to another) sum
    // to ~0 while still reshaping the surface enough to need new normals.
    if (maxElevDelta > 0.02) {
      this.cpuGeometry.computeVertexNormals();
      this.lastNormalElevGrid.set(this.pendingElevGrid);
    }
  }

  private applyPrediction(col: THREE.Color, code: number): void {
    const kind = compareClassName(code);
    if (kind === "none") return;
    const tint =
      kind === "pending"
        ? PREDICT_PENDING
        : kind === "hit"
          ? PREDICT_HIT
          : kind === "miss"
            ? PREDICT_MISS
            : PREDICT_UNEXPECTED;
    col.lerp(tint, 0.72);
  }

  private applyOverlay(
    col: THREE.Color,
    world: WorldState,
    x: number,
    z: number,
    overlay: InspectorLayer,
    maxAcc: number,
  ): void {
    const idx = z * this.width + x;
    switch (overlay) {
      case "water": {
        const w = world.water.get(x, z);
        const t = Math.min(1, w * 4);
        col.setRGB(0.15, 0.35 + 0.4 * t, 0.65 + 0.2 * t);
        break;
      }
      case "accumulation": {
        const acc = world.flowAccumulation?.[idx] ?? 1;
        const t = Math.log(acc) / Math.log(maxAcc);
        col.setRGB(0.2 + 0.6 * t, 0.25, 0.55 - 0.3 * t);
        break;
      }
      case "watershed": {
        const label = world.watershedLabel?.[idx] ?? 0;
        const hue = (label * 0.618) % 1;
        col.setHSL(hue, 0.55, 0.45);
        break;
      }
      case "soilMoisture": {
        const t = Math.min(1, world.getSoilMoisture(x, z) / config.soilPorosity);
        col.copy(BASE).lerp(WET_OVERLAY, t);
        break;
      }
      case "soilDepth": {
        const t = Math.min(1, world.getSoilDepth(x, z) / 5);
        col.setRGB(0.45 + 0.2 * t, 0.32 + 0.15 * t, 0.22 + 0.1 * t);
        break;
      }
      case "vegetation": {
        const t = world.getVegCover(x, z);
        col.copy(BASE).lerp(VEG_OVERLAY, t);
        break;
      }
      case "depression": {
        const depth = world.depressionDepth.data[idx] ?? 0;
        const t = Math.min(1, depth / 4);
        col.setRGB(0.15 + 0.2 * t, 0.35 + 0.25 * t, 0.55 + 0.35 * t);
        break;
      }
      case "groundwater": {
        const t = Math.min(1, world.getGroundwater(x, z) / 0.5);
        col.setRGB(0.12 + 0.15 * t, 0.28 + 0.35 * t, 0.4 + 0.45 * t);
        break;
      }
      case "limitingFactor": {
        // 0 moisture · 1 depth · 2 GW · 3 salinity · 4 temperature · 5 spray · 6 inundation · 7 light
        const id = Math.round(world.getLimitingFactor(x, z));
        if (id === 0) col.setRGB(0.2, 0.45, 0.85);
        else if (id === 1) col.setRGB(0.65, 0.4, 0.2);
        else if (id === 2) col.setRGB(0.15, 0.55, 0.5);
        else if (id === 3) col.setRGB(0.75, 0.7, 0.35);
        else if (id === 4) col.setRGB(0.85, 0.35, 0.2);
        else if (id === 5) col.setRGB(0.55, 0.75, 0.85);
        else if (id === 6) col.setRGB(0.25, 0.45, 0.65);
        else if (id === 7) col.setRGB(0.95, 0.85, 0.35);
        else col.setRGB(0.4, 0.4, 0.4);
        break;
      }
      case "suitability": {
        const t = world.getHabitatSuitability(x, z);
        col.setRGB(0.55 - 0.35 * t, 0.25 + 0.5 * t, 0.2 + 0.15 * t);
        break;
      }
      case "understoryLight": {
        const [r, g, b] = understoryLightRgb(world.getUnderstoryLight(x, z));
        col.setRGB(r, g, b);
        break;
      }
      case "fuelLoad": {
        const t = Math.min(
          1,
          world.fuelLoad.get(x, z) / Math.max(config.fuelLoadMax, 1e-6),
        );
        col.setRGB(0.35 + 0.4 * t, 0.25 + 0.1 * t, 0.15);
        break;
      }
      case "potentialEt": {
        const t = Math.min(
          1,
          world.getPotentialEt(x, z) / Math.max(config.etRate, 1e-6),
        );
        col.setRGB(0.55 + 0.35 * t, 0.45 - 0.2 * t, 0.2);
        break;
      }
      case "actualEt": {
        const t = Math.min(
          1,
          world.getActualEt(x, z) / Math.max(config.etRate, 1e-6),
        );
        col.setRGB(0.25 + 0.2 * t, 0.35 + 0.4 * t, 0.55 + 0.2 * t);
        break;
      }
      case "herbBiomass": {
        const [r, g, b] = herbBiomassRgb(
          world.getHerbBiomass(x, z),
          config.herbBiomassMax,
        );
        col.setRGB(r, g, b);
        break;
      }
      case "strandBiomass": {
        const [r, g, b] = strandBiomassRgb(
          world.getStrandBiomass(x, z),
          config.strandBiomassMax,
        );
        col.setRGB(r, g, b);
        break;
      }
      case "binderBiomass": {
        const [r, g, b] = binderBiomassRgb(
          world.getBinderBiomass(x, z),
          config.binderBiomassMax,
        );
        col.setRGB(r, g, b);
        break;
      }
      case "marshBiomass": {
        const [r, g, b] = marshBiomassRgb(
          world.getMarshBiomass(x, z),
          config.marshBiomassMax,
        );
        col.setRGB(r, g, b);
        break;
      }
      case "shrubBiomass": {
        const [r, g, b] = shrubBiomassRgb(
          world.getShrubBiomass(x, z),
          config.shrubBiomassMax,
        );
        col.setRGB(r, g, b);
        break;
      }
      case "crustBiomass": {
        const [r, g, b] = crustBiomassRgb(
          world.getCrustBiomass(x, z),
          config.crustBiomassMax,
        );
        col.setRGB(r, g, b);
        break;
      }
      case "intertidal": {
        const t = world.intertidal.data[idx] ?? 0;
        if (t > 0) col.setRGB(0.72, 0.58, 0.38);
        else if (world.oceanCells.has(idx)) col.setRGB(0.1, 0.29, 0.43);
        else col.setRGB(0.35, 0.4, 0.32);
        break;
      }
      case "shoreExposure": {
        const t = world.shoreExposure.data[idx] ?? 0;
        col.setRGB(0.25 + 0.55 * t, 0.35 - 0.15 * t, 0.55 - 0.35 * t);
        break;
      }
      case "shoreLongshore": {
        // Signed tendency: magenta = +Q, cyan = −Q, neutral mid-gray.
        const q = world.shoreLongshore.data[idx] ?? 0;
        const a = Math.min(1, Math.abs(q));
        if (q >= 0) col.setRGB(0.35 + 0.45 * a, 0.3, 0.4 + 0.35 * a);
        else col.setRGB(0.25, 0.4 + 0.35 * a, 0.45 + 0.3 * a);
        break;
      }
      case "salinity": {
        const t = world.soilSalinity.data[idx] ?? 0;
        // Fresh green-gray → salty pale crust.
        col.setRGB(0.35 + 0.45 * t, 0.42 - 0.12 * t, 0.28 + 0.25 * t);
        break;
      }
      case "seedBank": {
        const t = Math.min(
          1,
          world.getHerbSeedBank(x, z) /
            Math.max(config.seedSourceStrength, 1e-6),
        );
        col.setRGB(0.45 + 0.2 * t, 0.35 + 0.45 * t, 0.15 + 0.1 * t);
        break;
      }
      default:
        col.copy(BASE);
    }
  }
}
