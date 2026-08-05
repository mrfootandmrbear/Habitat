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
 *
 * Each guild renders through its own InstancedMesh so the silhouette differs
 * per guild (blade tuft, spreading mat, reeds, rounded canopy, flat crust —
 * presentation only, same six geometries shared by every cell of that guild).
 */

const GUILDS: readonly SwayGuild[] = [
  "herb",
  "strand",
  "binder",
  "marsh",
  "shrub",
  "crust",
];

/** Merge several transformed BufferGeometries into one indexed geometry (build-time only). */
function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vertCount = 0;
  let indexCount = 0;
  for (const g of parts) {
    vertCount += g.attributes.position!.count;
    indexCount += g.index ? g.index.count : g.attributes.position!.count;
  }
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const indices = new Uint16Array(indexCount);
  let vBase = 0;
  let iOffset = 0;
  for (const g of parts) {
    const pos = g.attributes.position!.array as Float32Array;
    const nrm = g.attributes.normal!.array as Float32Array;
    positions.set(pos, vBase * 3);
    normals.set(nrm, vBase * 3);
    const count = g.attributes.position!.count;
    const idx = g.index;
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices[iOffset++] = idx.getX(i) + vBase;
      }
    } else {
      for (let i = 0; i < count; i++) {
        indices[iOffset++] = i + vBase;
      }
    }
    vBase += count;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}

/** A single splayed blade/spike, base at origin, apex pointing +Y before transform. */
function blade(
  radius: number,
  height: number,
  segments: number,
  offsetX: number,
  offsetZ: number,
  tiltX: number,
  tiltZ: number,
  spinY: number,
): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(radius, height, segments);
  g.translate(0, height / 2, 0);
  g.rotateZ(tiltZ);
  g.rotateX(tiltX);
  g.rotateY(spinY);
  g.translate(offsetX, 0, offsetZ);
  return g;
}

/** A squat rounded lobe (icosahedron), used for shrub canopy volume. */
function lobe(
  radius: number,
  centerY: number,
  offsetX: number,
  offsetZ: number,
): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(radius, 0);
  g.translate(offsetX, centerY, offsetZ);
  return g;
}

/** herb — thin blade cluster: a few narrow splayed spikes. */
function buildHerbGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    blade(0.032, 0.5, 4, 0, 0, 0, 0.08, 0.0),
    blade(0.03, 0.44, 4, 0.045, 0.02, 0.16, 0, 2.1),
    blade(0.03, 0.47, 4, -0.03, -0.045, -0.14, 0.05, 4.3),
  ];
  return mergeParts(parts);
}

/** strand — low spreading mat: several squat nubs spread wide and flat. */
function buildStrandGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    blade(0.09, 0.14, 5, 0, 0, 0, 0, 0),
    blade(0.06, 0.1, 5, 0.16, 0.05, 0.3, 0, 0.9),
    blade(0.06, 0.1, 5, -0.14, 0.08, -0.28, 0, 2.4),
    blade(0.06, 0.09, 5, 0.04, -0.19, 0, 0.3, 3.6),
    blade(0.05, 0.08, 5, -0.09, -0.13, -0.22, -0.24, 5.2),
  ];
  return mergeParts(parts);
}

/** binder — tufted dome: a dense ring of short thick blades. */
function buildBinderGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const count = 6;
  const r = 0.055;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    parts.push(
      blade(
        0.045,
        0.3 + (i % 2) * 0.03,
        5,
        Math.cos(a) * r,
        Math.sin(a) * r,
        0.22,
        0,
        a,
      ),
    );
  }
  return mergeParts(parts);
}

/** marsh — reed-like verticals: tall thin near-vertical spikes. */
function buildMarshGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    blade(0.026, 0.68, 5, 0, 0, 0, 0, 0),
    blade(0.022, 0.6, 5, 0.035, 0.02, 0.05, 0, 1.4),
    blade(0.022, 0.63, 5, -0.03, -0.025, -0.04, 0.03, 3.8),
  ];
  return mergeParts(parts);
}

/** shrub — fuller rounded/branchier form: stem plus overlapping canopy lobes. */
function buildShrubGeometry(): THREE.BufferGeometry {
  const stem = new THREE.CylinderGeometry(0.04, 0.055, 0.22, 6);
  stem.translate(0, 0.11, 0);
  const parts: THREE.BufferGeometry[] = [
    stem,
    lobe(0.19, 0.32, 0, 0),
    lobe(0.15, 0.36, 0.11, 0.06),
    lobe(0.14, 0.3, -0.1, 0.08),
    lobe(0.13, 0.34, 0.02, -0.12),
  ];
  return mergeParts(parts);
}

/** crust — flat low mat: a squat wide disc hugging the ground. */
function buildCrustGeometry(): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(0.26, 0.06, 7);
  g.translate(0, 0.03, 0);
  return mergeParts([g]);
}

function buildGeometry(guild: SwayGuild): THREE.BufferGeometry {
  switch (guild) {
    case "strand":
      return buildStrandGeometry();
    case "binder":
      return buildBinderGeometry();
    case "marsh":
      return buildMarshGeometry();
    case "shrub":
      return buildShrubGeometry();
    case "crust":
      return buildCrustGeometry();
    default:
      return buildHerbGeometry();
  }
}

/** Deterministic pseudo-random unit value from a cell index, stable per cell (no Math.random — no stamped-grid look, but reproducible). */
function hash01(x: number, z: number, salt: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * §4.61 per-cell clustering — 2 to 4 sub-instances per occupied cell instead
 * of exactly one, so groundcover reads as a stand rather than isolated
 * lattice points (bar v2 point 10). Bounds the instance-count ceiling at
 * exactly this factor (BUILD_GUIDE §4.61: "≤4× the current ≤9,216-per-guild
 * ceiling").
 */
const MAX_SUB_INSTANCES = 4;

/** Deterministic 2-4 sub-instance count for a cell — same hash family as yaw/jitter, no new RNG. */
function subInstanceCount(x: number, z: number): number {
  return 2 + Math.floor(hash01(x, z, 9) * 3);
}

export class OccupantMesh {
  /** Group of one InstancedMesh per guild — presentation only, same public shape as a single Object3D. */
  readonly object: THREE.Group;
  private readonly width: number;
  private readonly height: number;
  private readonly worldSize: number;
  private readonly maxInstances: number;
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly leanAxis = new THREE.Vector3();
  private readonly meshes: Record<SwayGuild, THREE.InstancedMesh>;
  private readonly counts: Record<SwayGuild, number>;
  private readonly upAxis = new THREE.Vector3(0, 1, 0);
  private readonly yawQuat = new THREE.Quaternion();
  private readonly leanQuat = new THREE.Quaternion();
  private readonly restQuat = new THREE.Quaternion();
  private readonly restEuler = new THREE.Euler();
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
    this.maxInstances = width * height * MAX_SUB_INSTANCES;

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });

    this.object = new THREE.Group();
    this.object.name = "occupantShoots";

    this.meshes = {} as Record<SwayGuild, THREE.InstancedMesh>;
    this.counts = {} as Record<SwayGuild, number>;
    for (const guild of GUILDS) {
      const geo = buildGeometry(guild);
      const mesh = new THREE.InstancedMesh(geo, mat, this.maxInstances);
      mesh.name = `occupantShoots_${guild}`;
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(this.maxInstances * 3),
        3,
      );
      this.meshes[guild] = mesh;
      this.counts[guild] = 0;
      this.object.add(mesh);
    }
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
    for (const guild of GUILDS) this.counts[guild] = 0;

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
        // Cell HSI proxies living tissue — standing excess under L3 barely leans.
        const vitality = livingVitality(
          tintBiomass,
          tintMax,
          world.getHabitatSuitability(x, z),
        );
        const amp = swayAmplitude(windMag, guildFlex(guild), vitality);
        const tilt = swayTilt(amp, swayPhase(x, z), timeSec);
        const cellCx = ox + x * cellW;
        const cellCz = oz + z * cellW;
        const mesh = this.meshes[guild];
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

        // §4.61 clustering: 2-4 sub-instances per occupied cell instead of
        // exactly one, each offset within the cell footprint and reduced in
        // scale, so groundcover reads as a stand rather than isolated
        // lattice points (bar v2 point 10). Every value below derives from
        // the same deterministic (x, z, salt) hash family as the existing
        // yaw/jitter — no per-frame RNG, so a given seed/tick renders
        // identically every time (T-001).
        const subCount = subInstanceCount(x, z);
        for (let s = 0; s < subCount; s++) {
          const base = 10 * (s + 1);
          // Reduced per-sub scale so 2-4 instances read as a clump sharing
          // one cell's worth of biomass, not four full-size plants stacked.
          const subScale = 0.55 + hash01(x, z, base + 8) * 0.25;
          const jitterXZ1 = (0.82 + hash01(x, z, base + 1) * 0.36) * subScale;
          const jitterXZ2 = (0.82 + hash01(x, z, base + 2) * 0.36) * subScale;
          const jitterY = (0.88 + hash01(x, z, base + 3) * 0.24) * subScale;
          const restLeanX = (hash01(x, z, base + 4) - 0.5) * 0.14;
          const restLeanZ = (hash01(x, z, base + 5) - 0.5) * 0.14;
          // Offset within the cell footprint, bounded to ±0.4 cellW so
          // sub-instances stay attributable to their own cell.
          const offX = (hash01(x, z, base + 6) - 0.5) * 0.8 * cellW;
          const offZ = (hash01(x, z, base + 7) - 0.5) * 0.8 * cellW;
          const yawSub = hash01(x, z, base + 9) * Math.PI * 2;

          this.dummy.position.set(cellCx + offX, y, cellCz + offZ);
          this.dummy.scale.set(
            scaleXZ * jitterXZ1,
            scaleY * jitterY,
            scaleXZ * jitterXZ2,
          );
          // Composition order matters, and getting it wrong was the bug this
          // replaced. The wind lean below must stay on a fixed *world* axis so
          // every instance leans the same way; Object3D.rotateOnAxis and Euler
          // composition both rotate in local (post-yaw) space, which silently
          // re-rotated the lean axis by each instance's own random yaw and made
          // every cone lean a different direction instead of uniformly downwind.
          // So the quaternions are composed explicitly, innermost first:
          //   rest tilt (local, per-instance random - variety, yaw-relative is
          //   fine because it is random anyway)
          //   -> yaw (spins the cone's own facets)
          //   -> wind lean (world axis, outermost, identical for every instance).
          this.restEuler.set(restLeanX, 0, restLeanZ);
          this.restQuat.setFromEuler(this.restEuler);
          this.yawQuat.setFromAxisAngle(this.upAxis, yawSub);
          if (tilt !== 0 && windMag > 0) {
            // Lean downwind: axis = up × windDir in XZ, fixed in world space.
            // Per-instance variety rides the lean's *magnitude*, never its axis.
            // Applying the random rest tilt here instead (as a local rotation
            // composed under the lean) would tilt each instance's axis and
            // scatter the lean direction by several degrees — the same class of
            // bug this fix exists to remove, just smaller.
            const tiltVaried = tilt * (0.86 + hash01(x, z, base + 4) * 0.28);
            this.leanAxis.set(-windUz / windMag, 0, windUx / windMag);
            this.leanQuat.setFromAxisAngle(this.leanAxis, tiltVaried);
            this.dummy.quaternion.multiplyQuaternions(
              this.leanQuat,
              this.yawQuat,
            );
          } else {
            // Calm: no wind direction to stay coherent with, so the random rest
            // tilt is free to apply — it is what keeps a still field from
            // reading as a grid of perfectly vertical cones.
            this.dummy.quaternion.multiplyQuaternions(
              this.yawQuat,
              this.restQuat,
            );
          }
          this.dummy.updateMatrix();
          const idx = this.counts[guild]++;
          mesh.setMatrixAt(idx, this.dummy.matrix);
          mesh.setColorAt(idx, this.color);
        }
      }
    }
    for (const guild of GUILDS) {
      const mesh = this.meshes[guild];
      mesh.count = this.counts[guild];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }
}
