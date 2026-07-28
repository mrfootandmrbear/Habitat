import type { WorldState } from "../WorldState";
import type { TimescaleBand } from "../registry/types";

/** Process contract (SIMULATION_MODEL §5 / §11). */
export interface Process {
  readonly id: string;
  readonly band: TimescaleBand;
  readonly reads: readonly string[];
  readonly writes: readonly string[];
  /** Non-owner inbox writes (§11). */
  readonly contributes?: readonly string[];
  /** Reads taken from previous band commit — breaks cycles (§5). */
  readonly lagged?: readonly string[];
  step(world: WorldState, dt: number): void;
}
