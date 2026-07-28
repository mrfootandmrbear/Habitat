import { config } from "../../config";

/**
 * P-006 prediction observer — reads water for compare; never writes WorldState.
 * Declared contract mirrors SIMULATION_MODEL § observers (reads only).
 */
export const predictionObserver = {
  id: "prediction",
  reads: ["water.depth"] as const,
  writes: [] as const,
};

export type PredictionPhase = "idle" | "marking" | "committed" | "compared";

/** Per-cell compare class for overlay (expected vs actual wetness). */
export type CompareClass = "none" | "pending" | "hit" | "miss" | "unexpected";

export type CompareResult = {
  hits: number;
  misses: number;
  unexpected: number;
  /** Packed classify[idx] — 0 none, 1 pending, 2 hit, 3 miss, 4 unexpected */
  classify: Uint8Array;
};

const CLASS_NONE = 0;
const CLASS_PENDING = 1;
const CLASS_HIT = 2;
const CLASS_MISS = 3;
const CLASS_UNEXPECTED = 4;

export function compareClassName(code: number): CompareClass {
  switch (code) {
    case CLASS_PENDING:
      return "pending";
    case CLASS_HIT:
      return "hit";
    case CLASS_MISS:
      return "miss";
    case CLASS_UNEXPECTED:
      return "unexpected";
    default:
      return "none";
  }
}

/**
 * Readonly water sample for P-006 compare — no mutators.
 * Callers pass a snapshot or live read function; the session never holds WorldState.
 */
export type WaterDepthReader = {
  width: number;
  height: number;
  getWaterDepth(x: number, z: number): number;
};

/**
 * Explicit commit-and-compare prediction (P-006).
 * Marks live only in this object — never in sim field buffers.
 */
export class PredictionSession {
  readonly width: number;
  readonly height: number;
  /** Marked expected-wet cells (1 = marked). */
  readonly marks: Uint8Array;
  phase: PredictionPhase = "idle";
  commitStep: number | null = null;
  lastCompare: CompareResult | null = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.marks = new Uint8Array(width * height);
  }

  get markCount(): number {
    let n = 0;
    for (let i = 0; i < this.marks.length; i++) {
      if (this.marks[i]) n++;
    }
    return n;
  }

  idx(x: number, z: number): number {
    return z * this.width + x;
  }

  inBounds(x: number, z: number): boolean {
    return x >= 0 && z >= 0 && x < this.width && z < this.height;
  }

  /** Toggle a cell while marking (before commit). */
  toggleMark(x: number, z: number): boolean {
    if (!this.inBounds(x, z)) return false;
    if (this.phase === "committed" || this.phase === "compared") return false;
    const i = this.idx(x, z);
    this.marks[i] = this.marks[i] ? 0 : 1;
    this.phase = this.markCount > 0 ? "marking" : "idle";
    this.lastCompare = null;
    return true;
  }

  /** Lock marks for compare — does not touch simulation. */
  commit(step: number): boolean {
    if (this.markCount === 0) return false;
    if (this.phase !== "marking" && this.phase !== "idle") return false;
    this.phase = "committed";
    this.commitStep = step;
    this.lastCompare = null;
    return true;
  }

  /**
   * Compare marks to actual wet cells. Read-only — never writes water/terrain.
   */
  compare(water: WaterDepthReader, wetThreshold = config.predictionWetThreshold): CompareResult {
    if (this.phase !== "committed" && this.phase !== "compared") {
      throw new Error("Commit a prediction before comparing");
    }
    if (water.width !== this.width || water.height !== this.height) {
      throw new Error("Water reader size mismatch");
    }

    const classify = new Uint8Array(this.width * this.height);
    let hits = 0;
    let misses = 0;
    let unexpected = 0;

    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const i = this.idx(x, z);
        const marked = this.marks[i] === 1;
        const wet = water.getWaterDepth(x, z) > wetThreshold;
        if (marked && wet) {
          classify[i] = CLASS_HIT;
          hits++;
        } else if (marked && !wet) {
          classify[i] = CLASS_MISS;
          misses++;
        } else if (!marked && wet) {
          classify[i] = CLASS_UNEXPECTED;
          unexpected++;
        } else {
          classify[i] = CLASS_NONE;
        }
      }
    }

    const result: CompareResult = { hits, misses, unexpected, classify };
    this.lastCompare = result;
    this.phase = "compared";
    return result;
  }

  /** Overlay codes while waiting for compare: pending on marks only. */
  pendingClassify(): Uint8Array {
    const classify = new Uint8Array(this.width * this.height);
    for (let i = 0; i < this.marks.length; i++) {
      if (this.marks[i]) classify[i] = CLASS_PENDING;
    }
    return classify;
  }

  /** Active overlay for rendering, or null if idle with no marks. */
  overlayClassify(): Uint8Array | null {
    if (this.lastCompare) return this.lastCompare.classify;
    if (this.phase === "marking" || this.phase === "committed") {
      return this.pendingClassify();
    }
    return null;
  }

  clear(): void {
    this.marks.fill(0);
    this.phase = "idle";
    this.commitStep = null;
    this.lastCompare = null;
  }

  /** Steps since commit, or null if not committed. */
  stepsSinceCommit(currentStep: number): number | null {
    if (this.commitStep === null) return null;
    return currentStep - this.commitStep;
  }

  shouldAutoCompare(currentStep: number): boolean {
    if (this.phase !== "committed" || this.commitStep === null) return false;
    return currentStep - this.commitStep >= config.predictionHorizonSteps;
  }
}

/** Snapshot reader — compare uses a frozen copy so the session cannot alias live buffers. */
export function snapshotWaterReader(
  width: number,
  height: number,
  depths: Float32Array,
): WaterDepthReader {
  const copy = depths.slice();
  return {
    width,
    height,
    getWaterDepth(x: number, z: number): number {
      return copy[z * width + x] ?? 0;
    },
  };
}
