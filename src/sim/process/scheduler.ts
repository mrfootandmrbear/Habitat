import type { WorldState } from "../WorldState";
import type { TimescaleBand } from "../registry/types";
import type { Process } from "./Process";

/**
 * Band runner with derived process order (SIMULATION_MODEL §5.1).
 * Edge producer→consumer wherever one writes/contributes a field another reads,
 * excluding fields the consumer declared `lagged`. Ties break by process id.
 */
export class SimScheduler {
  private readonly processes: Process[];
  private readonly orderByBand: Map<TimescaleBand, Process[]>;

  constructor(processes: Process[]) {
    this.processes = [...processes];
    this.orderByBand = new Map();
    for (const band of ["event", "daily", "seasonal", "annual", "decadal"] as const) {
      const inBand = this.processes.filter((p) => p.band === band);
      this.orderByBand.set(band, topoSortBand(inBand));
    }
  }

  /** Registration + derived order for tests (T-001 / §5.1). */
  orderedForBand(band: TimescaleBand): readonly Process[] {
    return this.orderByBand.get(band) ?? [];
  }

  runBand(band: TimescaleBand, world: WorldState, dt: number): void {
    for (const process of this.orderedForBand(band)) {
      process.step(world, dt);
    }
  }
}

function topoSortBand(processes: Process[]): Process[] {
  if (processes.length <= 1) return [...processes];

  const byId = new Map(processes.map((p) => [p.id, p]));
  const ids = [...byId.keys()].sort();
  /** Only authoritative writes establish producer→consumer order (§5.1 / §11).
   * Contributes are inbox side-effects onto another owner's field and must not
   * force the contributor before the owner (soilWater ↔ groundwater moisture). */
  const writers = new Map<string, string[]>();
  for (const p of processes) {
    for (const field of p.writes) {
      const list = writers.get(field) ?? [];
      list.push(p.id);
      writers.set(field, list);
    }
  }

  /** Edge A→B means A must run before B. */
  const preds = new Map<string, Set<string>>();
  const succs = new Map<string, Set<string>>();
  for (const id of ids) {
    preds.set(id, new Set());
    succs.set(id, new Set());
  }

  for (const consumer of processes) {
    const lagged = new Set(consumer.lagged ?? []);
    for (const field of consumer.reads) {
      if (lagged.has(field)) continue;
      for (const producerId of writers.get(field) ?? []) {
        if (producerId === consumer.id) continue;
        preds.get(consumer.id)!.add(producerId);
        succs.get(producerId)!.add(consumer.id);
      }
    }
  }

  const ready = ids.filter((id) => preds.get(id)!.size === 0);
  ready.sort();
  const ordered: Process[] = [];
  const remaining = new Set(ids);

  while (ready.length > 0) {
    const id = ready.shift()!;
    remaining.delete(id);
    ordered.push(byId.get(id)!);
    for (const succ of [...succs.get(id)!].sort()) {
      preds.get(succ)!.delete(id);
      if (preds.get(succ)!.size === 0 && remaining.has(succ)) {
        ready.push(succ);
        ready.sort();
      }
    }
  }

  if (remaining.size > 0) {
    const cycle = [...remaining].sort().join(", ");
    throw new Error(
      `SimScheduler: cyclic process dependency in band without lagged break: ${cycle}`,
    );
  }
  return ordered;
}
