import * as THREE from "three";
import { config, type InspectorLayer } from "../config";
import type { WorldState } from "../sim/WorldState";
import type { WaterStateView } from "../sim/types";
import { compareClassName } from "../sim/prediction/PredictionSession";

const BASE = new THREE.Color(0x8b7355);
const WET = new THREE.Color(0x4a5c3a);
const VEG = new THREE.Color(0x3a7a3a);
const PREDICT_PENDING = new THREE.Color(0x2ec4b6);
const PREDICT_HIT = new THREE.Color(0x3dcc6f);
const PREDICT_MISS = new THREE.Color(0xe85d4c);
const PREDICT_UNEXPECTED = new THREE.Color(0xe8b84c);

/** Terrain mesh tinted by soil moisture; supports T-005 inspector overlays. */
export class TerrainMesh {
  readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly width: number;
  private readonly height: number;
  private readonly worldSize: number;
  private readonly colors: THREE.BufferAttribute;

  constructor(width: number, height: number, worldSize: number) {
    this.width = width;
    this.height = height;
    this.worldSize = worldSize;

    this.geometry = new THREE.PlaneGeometry(
      worldSize,
      worldSize,
      width - 1,
      height - 1,
    );
    this.geometry.rotateX(-Math.PI / 2);

    const count = this.geometry.attributes.position!.count;
    this.colors = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
    this.geometry.setAttribute("color", this.colors);

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true,
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.name = "terrain";
  }

  updateFrom(
    model: WaterStateView,
    world?: WorldState,
    overlay: InspectorLayer = "none",
    predictionClassify: Uint8Array | null = null,
  ): void {
    const pos = this.geometry.attributes.position as THREE.BufferAttribute;
    const cellW = this.worldSize / (this.width - 1);
    const cellH = this.worldSize / (this.height - 1);
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
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        pos.setXYZ(i, ox + x * cellW, model.getTerrainHeight(x, z), oz + z * cellH);

        const col = new THREE.Color();
        if (world && overlay !== "none") {
          this.applyOverlay(col, world, x, z, overlay, maxAcc);
        } else if (world) {
          const soilT = Math.min(
            1,
            world.getSoilMoisture(x, z) / config.soilPorosity,
          );
          const cover = world.getVegCover(x, z);
          col.copy(BASE).lerp(WET, soilT).lerp(VEG, cover);
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
    this.geometry.computeVertexNormals();
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
        col.copy(BASE).lerp(WET, t);
        break;
      }
      case "vegetation": {
        const t = world.getVegCover(x, z);
        col.copy(BASE).lerp(VEG, t);
        break;
      }
      default:
        col.copy(BASE);
    }
  }
}
