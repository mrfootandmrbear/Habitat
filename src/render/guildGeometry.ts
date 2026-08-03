import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { SwayGuild } from "../ui/occupantSway";

/**
 * Distinct low-poly silhouette per guild — presentation only (T-006 / ART-001
 * scientific impressionism; C-029). Built once per guild and shared by every
 * instance of that guild's InstancedMesh (OccupantMesh); per-cell variation
 * stays scale / color / sway only, same as before this shipped (C-029 leading
 * direction: no per-instance growth morphing). Every shape's base sits at
 * y=0 so the existing per-cell scaleXZ/scaleY continues to apply the way it
 * did to the single shared cone.
 */

/** A single blade: a thin cone, base at y=0, apex at y=height. */
function blade(
  radius: number,
  height: number,
  radialSegments = 4,
): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(radius, height, radialSegments);
  geo.translate(0, height / 2, 0);
  return geo;
}

/**
 * Bend a blade from its root (pivot is the blade's base, already at the
 * geometry origin) and carry that lean direction to an angular position —
 * the mechanism a fan of blades uses to read as splayed rather than parallel.
 */
function leanOut(
  geo: THREE.BufferGeometry,
  tilt: number,
  yaw: number,
): THREE.BufferGeometry {
  const g = geo.clone();
  g.rotateZ(tilt);
  g.rotateY(yaw);
  return g;
}

function fan(
  count: number,
  radius: number,
  height: number,
  tilt: number,
  radialSegments = 4,
): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const yaw = (i / count) * Math.PI * 2;
    parts.push(leanOut(blade(radius, height, radialSegments), tilt, yaw));
  }
  return parts;
}

/** Herb — a sparse three-blade tuft; the plainest guild, closest to the original single cone. */
function buildHerb(): THREE.BufferGeometry {
  return mergeGeometries(fan(3, 0.035, 0.5, 0.18));
}

/**
 * Strand — a low, rounded splash mat; no vertical blades, reads apart from
 * every upright guild. Mounded rather than flat so it doesn't collapse
 * toward crust's silhouette — a splash-zone hummock, not a soil skin.
 */
function buildStrand(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(
    0.18,
    8,
    4,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  geo.scale(1, 0.75, 1);
  return geo;
}

/** Binder — a tighter, more splayed tussock than herb (sand-binder marram-grass habit). */
function buildBinder(): THREE.BufferGeometry {
  return mergeGeometries(fan(5, 0.04, 0.42, 0.32));
}

/** Marsh — a reed pair, taller and thinner than herb, almost no splay. */
function buildMarsh(): THREE.BufferGeometry {
  return mergeGeometries(fan(2, 0.026, 0.68, 0.06, 6));
}

/** Shrub — a woody trunk with three angled canopy clusters; the only branching form. */
function buildShrub(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.045, 0.055, 0.32, 6);
  trunk.translate(0, 0.16, 0);
  const parts: THREE.BufferGeometry[] = [trunk];
  const canopyCount = 3;
  for (let i = 0; i < canopyCount; i++) {
    const yaw = (i / canopyCount) * Math.PI * 2 + 0.4;
    const canopy = new THREE.ConeGeometry(0.13, 0.22, 5);
    canopy.translate(0, 0.11, 0);
    canopy.rotateZ(0.5);
    canopy.rotateY(yaw);
    canopy.translate(0, 0.3, 0);
    parts.push(canopy);
  }
  return mergeGeometries(parts);
}

/** Crust — a flat, ground-hugging patch; a biological crust is a texture, not a plant habit. */
function buildCrust(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.26, 0.28, 0.05, 8);
  geo.translate(0, 0.025, 0);
  return geo;
}

/**
 * Leaning a blade around its base pivot can dip its outer root edge a hair
 * below y=0. Never let a shape embed below the terrain plane — lift the
 * whole geometry so its lowest point sits exactly at y=0.
 */
function groundAtOrigin(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  geo.computeBoundingBox();
  const minY = geo.boundingBox!.min.y;
  if (minY < 0) geo.translate(0, -minY, 0);
  return geo;
}

const BUILDERS: Record<SwayGuild, () => THREE.BufferGeometry> = {
  herb: buildHerb,
  strand: buildStrand,
  binder: buildBinder,
  marsh: buildMarsh,
  shrub: buildShrub,
  crust: buildCrust,
};

/** Stable guild iteration order — not otherwise meaningful. */
export const OCCUPANT_GUILDS: readonly SwayGuild[] = [
  "herb",
  "strand",
  "binder",
  "marsh",
  "shrub",
  "crust",
];

/** Build the shared, unscaled silhouette geometry for one guild. */
export function buildGuildGeometry(guild: SwayGuild): THREE.BufferGeometry {
  return groundAtOrigin(BUILDERS[guild]());
}
