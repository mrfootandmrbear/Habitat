/**
 * Form memory — "then" elevation for the return visit (Slice 8c).
 * Presentation / compare only; does not write authoritative sim state (T-006).
 */
export class FormMemory {
  private thenElev: Float32Array | null = null;
  private width = 0;

  capture(elev: Float32Array, width: number, height: number): void {
    if (elev.length !== width * height) {
      throw new Error("FormMemory.capture: elev length mismatch");
    }
    this.width = width;
    this.thenElev = Float32Array.from(elev);
  }

  clear(): void {
    this.thenElev = null;
    this.width = 0;
  }

  get hasThen(): boolean {
    return this.thenElev !== null;
  }

  /** Δelev = now − then at cell, or 0 if no memory. */
  deltaAt(now: Float32Array, x: number, z: number): number {
    if (!this.thenElev) return 0;
    const i = z * this.width + x;
    return now[i]! - this.thenElev[i]!;
  }

  /** Mean |Δelev| over cells (Tier-P / probe helper). */
  meanAbsDelta(now: Float32Array): number {
    if (!this.thenElev) return 0;
    let sum = 0;
    for (let i = 0; i < this.thenElev.length; i++) {
      sum += Math.abs(now[i]! - this.thenElev[i]!);
    }
    return sum / this.thenElev.length;
  }
}

/**
 * Tier-P encoding strength for elevation change (Slice 8c).
 * Maps |Δh| through the visual scale the renderer uses (~2.5 cm → full)
 * so decadal berm response clears the perceptual floor without inspector.
 */
export function elevChangeEncodingStrength(
  deltaMeters: number,
  fullScaleMeters = 0.025,
): number {
  return Math.min(1, Math.abs(deltaMeters) / fullScaleMeters);
}
