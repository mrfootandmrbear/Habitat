/**
 * Branch-and-compare scaffold (C-005) — fork one world, run under different forces.
 * Extends P-005 capture/restore; force dials travel with the branch (T-001).
 * Comparison is for understanding, not scoring (N-002).
 */
import { Grid2D } from "./Grid2D";
import {
  applyForces,
  captureForcesFromWorld,
  type ForceSettings,
} from "./forceSettings";
import { seaLevelById } from "./climate/seaLevel";
import { tideById } from "./climate/tidalEnvelope";
import { windById } from "./climate/windRegime";
import {
  captureWorld,
  restoreWorld,
} from "./sessionPersist";
import type { SaveDocument } from "./save";
import { WorldState } from "./WorldState";
import { elevChangeEncodingStrength } from "./formMemory";

export type BranchDocument = {
  world: SaveDocument;
  forces: ForceSettings;
  islandIsolation: number;
  width: number;
  height: number;
};

export type BranchLane = "a" | "b";

/** Capture a restore point: registry + force dials (P-005 / C-005). */
export function captureBranch(
  world: WorldState,
  forces?: ForceSettings,
): BranchDocument {
  return {
    world: captureWorld(world),
    forces: forces ?? captureForcesFromWorld(world),
    islandIsolation: world.islandIsolation,
    width: world.width,
    height: world.height,
  };
}

/**
 * Materialize a new WorldState from a branch document.
 * Same seed+forces → identical trajectory (T-001); caller owns the instance.
 */
export function materializeBranch(doc: BranchDocument): WorldState {
  if (doc.width <= 0 || doc.height <= 0) {
    throw new Error("materializeBranch: invalid dimensions");
  }
  const sea = seaLevelById(doc.forces.sea).meters;
  const wind = windById(doc.forces.wind);
  const forked = new WorldState(new Grid2D(doc.width, doc.height), {
    seaLevel: sea,
    tidalAmplitude: tideById(doc.forces.tide).amplitudeMeters,
    windUx: wind.ux,
    windUz: wind.uz,
    islandIsolation: doc.islandIsolation,
  });
  restoreWorld(forked, doc.world);
  applyForces(forked, doc.forces);
  return forked;
}

/** Fork a live world into an independent copy (optional force override). */
export function forkWorld(
  source: WorldState,
  forces?: ForceSettings,
): WorldState {
  const doc = captureBranch(source, forces);
  if (forces) doc.forces = forces;
  return materializeBranch(doc);
}

/**
 * Two lanes from one castle. Both step together; only forces (and later edits
 * on the active lane) diverge them. Presentation compare is observer-only.
 */
export class BranchSession {
  readonly root: BranchDocument;
  readonly a: WorldState;
  readonly b: WorldState;
  active: BranchLane = "a";
  /** When true, mesh tint shows moisture delta active − other (no numbers). */
  compareMode = false;

  constructor(root: BranchDocument) {
    this.root = root;
    this.a = materializeBranch(root);
    this.b = materializeBranch(root);
  }

  static open(world: WorldState, forces?: ForceSettings): BranchSession {
    return new BranchSession(captureBranch(world, forces));
  }

  get activeWorld(): WorldState {
    return this.active === "a" ? this.a : this.b;
  }

  get otherWorld(): WorldState {
    return this.active === "a" ? this.b : this.a;
  }

  setActive(lane: BranchLane): void {
    this.active = lane;
  }

  applyForcesToActive(forces: ForceSettings): void {
    applyForces(this.activeWorld, forces);
  }

  forcesOn(lane: BranchLane): ForceSettings {
    return captureForcesFromWorld(lane === "a" ? this.a : this.b);
  }

  /** Advance both branches one event (fair temporal compare). */
  stepBoth(): void {
    this.a.stepEvent();
    this.b.stepEvent();
  }

  /**
   * Fill `out` with soil-moisture delta (active − other) for terrain tint.
   * Returns encoding max strength for Tier-P; does not write sim state (T-006).
   */
  fillMoistureCompareDelta(out: Float32Array): number {
    const active = this.activeWorld.soilMoisture.data;
    const other = this.otherWorld.soilMoisture.data;
    if (out.length !== active.length || other.length !== active.length) {
      throw new Error("fillMoistureCompareDelta: length mismatch");
    }
    let maxStrength = 0;
    for (let i = 0; i < active.length; i++) {
      const d = active[i]! - other[i]!;
      // Map moisture Δ into elev-tint scale (~0.15 frac → full).
      const asElev = d * (0.025 / 0.15);
      out[i] = asElev;
      maxStrength = Math.max(maxStrength, elevChangeEncodingStrength(asElev));
    }
    return maxStrength;
  }
}

/** Tier-P: paired moisture means must clear the perceptual floor after force split. */
export function branchMoistureEncodingDelta(
  meanA: number,
  meanB: number,
  fullScale = 0.15,
): number {
  return Math.min(1, Math.abs(meanA - meanB) / fullScale);
}
