import type { WorldState } from "../WorldState";
import type { TimescaleBand } from "../registry/types";

/** Process contract (SIMULATION_MODEL §5). */
export interface Process {
  readonly id: string;
  readonly band: TimescaleBand;
  readonly reads: readonly string[];
  readonly writes: readonly string[];
  step(world: WorldState, dt: number): void;
}
