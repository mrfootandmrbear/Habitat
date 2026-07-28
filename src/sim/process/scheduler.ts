import type { WorldState } from "../WorldState";
import type { TimescaleBand } from "../registry/types";
import type { Process } from "./Process";

/** Minimal band scheduler — Slice 2 runs the event band only (SIMULATION_MODEL §6). */
/**
 * Band runner. Process order is fixed registration order for now.
 * `lagged` / `contributes` stay declarative until a fourth process forces topo sort.
 */
export class SimScheduler {
  private readonly processes: Process[];

  constructor(processes: Process[]) {
    this.processes = [...processes].sort((a, b) => a.id.localeCompare(b.id));
  }

  runBand(band: TimescaleBand, world: WorldState, dt: number): void {
    for (const process of this.processes) {
      if (process.band === band) {
        process.step(world, dt);
      }
    }
  }
}
