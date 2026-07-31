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
uniform vec2 uFieldSize;
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
  int materialId = int(sampleFieldBilinear(uMaterialTex, fUv, uFieldSize) + 0.5);
  float porosity = max(materialPorosity(materialId), 1e-6);
  vec3 base = materialDryRgb(materialId);

  float soilT = clamp(moisture / porosity, 0.0, 1.0);
  vec3 wetBase = mix(base, uWetColor, soilT);
  float vegAmount = clamp(cover * (0.28 + 0.62 * soilT) * (1.0 - salinity * 0.9), 0.0, 1.0);
  vec3 col = mix(wetBase, uVegColor, vegAmount);
  if (scar > 0.0) {
    col = mix(col, uScarColor, min(0.85, scar * 0.9));
  }
  bool isForeshore = uHasSea > 0.5 && vFieldElev >= uSeaLevel && vFieldElev < uMeanHighWater;
  if (isForeshore) {
    col = mix(col, uIntertidalColor, 0.62);
  }
  if (salinity > 0.0) {
    col = mix(col, uSaltColor, min(0.78, salinity * 0.7));
  }

  float pulse = sampleFieldBilinear(uErosionPulseTex, fUv, uFieldSize);
  float pulseStrength = min(1.0, abs(pulse) / 0.025);
  if (pulseStrength > 0.0) {
    col = mix(col, pulse < 0.0 ? uErodeColor : uDepositColor, pulseStrength * 0.9);
  }

  diffuseColor.rgb = col;
}
`;

/** Ambient erosion pulse decay per sync (TerrainMesh.md §2b) — ~0.85-0.9. */
const EROSION_PULSE_DECAY = 0.88;

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
  private lastNormalElevSum = Number.NaN;

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
      shader.vertexShader = `${TERRAIN_VERTEX_HEADER}\n${shader.vertexShader
        .replace(
          "#include <beginnormal_vertex>",
          `#include <beginnormal_vertex>\n${TERRAIN_NORMAL_INJECT}`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>\n${TERRAIN_DISPLACE_INJECT}`,
        )}`;
      shader.fragmentShader = `${TERRAIN_FRAGMENT_HEADER}\n${shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>\n${TERRAIN_COLOR_INJECT}`,
      )}`;
    };

    this.gpuMesh = new THREE.Mesh(gpuGeometry, this.gpuMaterial);
    this.gpuMesh.name = "terrain-gpu";

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
    let elevSum = 0;
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const elev = model.getTerrainHeight(x, z);
        elevSum += elev;
        pos.setXYZ(i, ox + x * cellW, elev, oz + z * cellW);

        const col = new THREE.Color();
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
    // as coastal elev ticks — only rebuild when the field moved meaningfully.
    if (
      !Number.isFinite(this.lastNormalElevSum) ||
      Math.abs(elevSum - this.lastNormalElevSum) > 0.05
    ) {
      this.cpuGeometry.computeVertexNormals();
      this.lastNormalElevSum = elevSum;
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
