import type { WorldState } from "../WorldState";
import type { TimescaleBand } from "../registry/types";
import type { Process } from "./Process";

/** Minimal band scheduler — Slice 2 runs the event band only (SIMULATION_MODEL §6). */
/**
 * Band runner. Process order is **registration order** (not alphabetical).
 * `lagged` / `contributes` stay declarative until a fourth process forces topo sort.
 * Slice 8b requires soilWater before groundwater so baseflow survives into the
 * next event band (C-001).
 */
export class SimScheduler {
  private readonly processes: Process[];

  constructor(processes: Process[]) {
    this.processes = [...processes];
  }

  runBand(band: TimescaleBand, world: WorldState, dt: number): void {
    for (const process of this.processes) {
      if (process.band === band) {
        process.step(world, dt);
      }
    }
  }
}
