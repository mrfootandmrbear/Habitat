import * as THREE from "three";
import { config } from "../config";
import type { WorldState } from "../sim/WorldState";
import type { WaterStateView } from "../sim/types";
import {
  binderBiomassRgb,
  crustBiomassRgb,
  herbBiomassRgb,
  marshBiomassRgb,
  shootVisibility,
  shrubBiomassRgb,
  strandBiomassRgb,
} from "../ui/occupantEncoding";
import {
  guildFlex,
  livingVitality,
  swayAmplitude,
  swayPhase,
  swayTilt,
  type SwayGuild,
} from "../ui/occupantSway";

/**
 * First-occupant shoots — presentation only (T-006).
 * Reads herb + strand + binder + marsh + shrub + crust biomass; does not create population state.
 * Dominant guild tints the cell (herb / strand olive / binder khaki / marsh teal / shrub forest / crust sage).
 * L4: per-instance wind sway (forcing readout — calm is still; standing dead barely leans).
 */
export class OccupantMesh {
  readonly object: THREE.InstancedMesh;
  private readonly width: number;
  private readonly height: number;
  private readonly worldSize: number;
  private readonly maxInstances: number;
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly leanAxis = new THREE.Vector3();
  /** Wall-clock seconds for the sway sine (observer time — T-006). */
  private swayTimeSec = 0;

  constructor(
    width: number = config.gridSize,
    height: number = config.gridSize,
    worldSize: number = config.worldSize,
  ) {
    this.width = width;
    this.height = height;
    this.worldSize = worldSize;
    this.maxInstances = width * height;
    const geo = new THREE.ConeGeometry(0.12, 0.55, 4);
    geo.translate(0, 0.275, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });
    this.object = new THREE.InstancedMesh(geo, mat, this.maxInstances);
    this.object.name = "occupantShoots";
    this.object.frustumCulled = false;
    this.object.count = 0;
    this.object.castShadow = false;
    this.object.receiveShadow = false;
    this.object.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(this.maxInstances * 3),
      3,
    );
  }

  /** Advance the sway clock (wall seconds). */
  setSwayTime(timeSec: number): void {
    this.swayTimeSec = Number.isFinite(timeSec) ? timeSec : 0;
  }

  updateFrom(model: WaterStateView, world: WorldState): void {
    const cellW = this.worldSize / (this.width - 1);
    const ox = -this.worldSize / 2;
    const oz = -this.worldSize / 2;
    const herbMax = config.herbBiomassMax;
    const strandMax = config.strandBiomassMax;
    const binderMax = config.binderBiomassMax;
    const marshMax = config.marshBiomassMax;
    const shrubMax = config.shrubBiomassMax;
    const crustMax = config.crustBiomassMax;
    const { ux: windUx, uz: windUz } = world.wind;
    const windMag = Math.hypot(windUx, windUz);
    const timeSec = this.swayTimeSec;
    let n = 0;

    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const herb = world.getHerbBiomass(x, z);
        const strand = world.getStrandBiomass(x, z);
        const binder = world.getBinderBiomass(x, z);
        const marsh = world.getMarshBiomass(x, z);
        const shrub = world.getShrubBiomass(x, z);
        const crust = world.getCrustBiomass(x, z);
        const herbVis = shootVisibility(herb, herbMax);
        const strandVis = shootVisibility(strand, strandMax);
        const binderVis = shootVisibility(binder, binderMax);
        const marshVis = shootVisibility(marsh, marshMax);
        const shrubVis = shootVisibility(shrub, shrubMax);
        const crustVis = shootVisibility(crust, crustMax);
        const vis = Math.max(
          herbVis,
          strandVis,
          binderVis,
          marshVis,
          shrubVis,
          crustVis,
        );
        if (vis <= 0) continue;
        let guild: SwayGuild = "herb";
        let tintBiomass = herb;
        let tintMax: number = herbMax;
        if (
          shrubVis >= herbVis &&
          shrubVis >= strandVis &&
          shrubVis >= binderVis &&
          shrubVis >= marshVis &&
          shrubVis >= crustVis &&
          shrubVis > 0
        ) {
          guild = "shrub";
          tintBiomass = shrub;
          tintMax = shrubMax;
        } else if (
          marshVis >= herbVis &&
          marshVis >= strandVis &&
          marshVis >= binderVis &&
          marshVis >= shrubVis &&
          marshVis >= crustVis &&
          marshVis > 0
        ) {
          guild = "marsh";
          tintBiomass = marsh;
          tintMax = marshMax;
        } else if (
          strandVis >= herbVis &&
          strandVis >= binderVis &&
          strandVis >= marshVis &&
          strandVis >= shrubVis &&
          strandVis >= crustVis &&
          strandVis > 0
        ) {
          guild = "strand";
          tintBiomass = strand;
          tintMax = strandMax;
        } else if (
          binderVis >= herbVis &&
          binderVis >= strandVis &&
          binderVis >= marshVis &&
          binderVis >= shrubVis &&
          binderVis >= crustVis &&
          binderVis > 0
        ) {
          guild = "binder";
          tintBiomass = binder;
          tintMax = binderMax;
        } else if (
          crustVis >= herbVis &&
          crustVis >= strandVis &&
          crustVis >= binderVis &&
          crustVis >= marshVis &&
          crustVis >= shrubVis &&
          crustVis > 0
        ) {
          guild = "crust";
          tintBiomass = crust;
          tintMax = crustMax;
        }
        const y = model.getTerrainHeight(x, z);
        // Woody reads taller; crust stays low mat (presentation only — T-006).
        const heightBoost =
          guild === "shrub" ? 1.35 : guild === "crust" ? 0.45 : 1;
        const scaleY = (0.35 + vis * 1.4) * heightBoost;
        const scaleXZ = 0.45 + vis * 0.9;
        const yaw = ((x * 17 + z * 31) % 360) * (Math.PI / 180);
        // Cell HSI proxies living tissue — standing excess under L3 barely leans.
        const vitality = livingVitality(
          tintBiomass,
          tintMax,
          world.getHabitatSuitability(x, z),
        );
        const amp = swayAmplitude(windMag, guildFlex(guild), vitality);
        const tilt = swayTilt(amp, swayPhase(x, z), timeSec);

        this.dummy.position.set(ox + x * cellW, y, oz + z * cellW);
        this.dummy.scale.set(scaleXZ, scaleY, scaleXZ);
        this.dummy.rotation.set(0, yaw, 0);
        if (tilt !== 0 && windMag > 0) {
          // Lean downwind: axis = up × windDir in XZ.
          this.leanAxis.set(-windUz / windMag, 0, windUx / windMag);
          this.dummy.rotateOnAxis(this.leanAxis, tilt);
        }
        this.dummy.updateMatrix();
        this.object.setMatrixAt(n, this.dummy.matrix);
        const [r, g, b] =
          guild === "shrub"
            ? shrubBiomassRgb(tintBiomass, tintMax)
            : guild === "marsh"
              ? marshBiomassRgb(tintBiomass, tintMax)
              : guild === "strand"
                ? strandBiomassRgb(tintBiomass, tintMax)
                : guild === "binder"
                  ? binderBiomassRgb(tintBiomass, tintMax)
                  : guild === "crust"
                    ? crustBiomassRgb(tintBiomass, tintMax)
                    : herbBiomassRgb(tintBiomass, tintMax);
        this.color.setRGB(r, g, b);
        this.object.setColorAt(n, this.color);
        n++;
      }
    }
    this.object.count = n;
    this.object.instanceMatrix.needsUpdate = true;
    if (this.object.instanceColor) {
      this.object.instanceColor.needsUpdate = true;
    }
  }
}
