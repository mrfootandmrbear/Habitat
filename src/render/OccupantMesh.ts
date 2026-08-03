import * as THREE from "three";
import { config } from "../config";
import type { WorldState } from "../sim/WorldState";
import type { WaterStateView } from "../sim/types";
import { buildGuildGeometry, OCCUPANT_GUILDS } from "./guildGeometry";
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
 * Dominant guild picks both the cell's silhouette (C-029: distinct geometry per guild — herb
 * tuft / strand mat / binder tussock / marsh reeds / shrub branching form / crust flat patch,
 * one InstancedMesh per guild under `object`) and its tint (herb / strand olive / binder khaki /
 * marsh teal / shrub forest / crust sage).
 * L4: per-instance wind sway (forcing readout — calm is still; standing dead barely leans).
 */
export class OccupantMesh {
  /** One InstancedMesh per guild (C-029) — an Object3D, so callers add it exactly like before. */
  readonly object: THREE.Group;
  private readonly meshes: Record<SwayGuild, THREE.InstancedMesh>;
  private readonly counts: Record<SwayGuild, number>;
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
    this.object = new THREE.Group();
    this.object.name = "occupantShoots";
    // Shared across guild meshes — color comes from per-instance instanceColor.
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });
    const meshes = {} as Record<SwayGuild, THREE.InstancedMesh>;
    const counts = {} as Record<SwayGuild, number>;
    for (const guild of OCCUPANT_GUILDS) {
      const geo = buildGuildGeometry(guild);
      const mesh = new THREE.InstancedMesh(geo, mat, this.maxInstances);
      mesh.name = `occupantShoots.${guild}`;
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(this.maxInstances * 3),
        3,
      );
      meshes[guild] = mesh;
      counts[guild] = 0;
      this.object.add(mesh);
    }
    this.meshes = meshes;
    this.counts = counts;
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
    for (const guild of OCCUPANT_GUILDS) this.counts[guild] = 0;

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
        // §4.48: each guild's own HSI (not herb's) proxies its living tissue
        // for vitality — herb's own daily habitat.suitability is correct for
        // herb and stays the default; other guilds override below.
        let hsi = world.getHabitatSuitability(x, z);
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
          hsi = world.getShrubHsi(x, z);
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
          hsi = world.getMarshHsi(x, z);
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
          hsi = world.getStrandHsi(x, z);
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
          hsi = world.getBinderHsi(x, z);
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
          hsi = world.getCrustHsi(x, z);
        }
        const y = model.getTerrainHeight(x, z);
        // C-029: each guild's own geometry now carries its height/bushiness
        // signal (marsh tall and thin, crust flat, shrub branching) — no
        // per-guild heightBoost multiplier on top of that anymore.
        const scaleY = 0.35 + vis * 1.4;
        const scaleXZ = 0.45 + vis * 0.9;
        const yaw = ((x * 17 + z * 31) % 360) * (Math.PI / 180);
        // Cell HSI proxies living tissue — standing excess under L3 barely leans.
        const vitality = livingVitality(tintBiomass, tintMax, hsi);
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

        const mesh = this.meshes[guild];
        const idx = this.counts[guild]++;
        mesh.setMatrixAt(idx, this.dummy.matrix);
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
        mesh.setColorAt(idx, this.color);
      }
    }
    for (const guild of OCCUPANT_GUILDS) {
      const mesh = this.meshes[guild];
      mesh.count = this.counts[guild];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
}
