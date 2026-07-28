import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { FieldRegistry } from "./registry/FieldRegistry";
import { SimScheduler } from "./process/scheduler";
import { surfaceWaterProcess } from "./process/surfaceWaterProcess";
import { fluxStep } from "./hydrology/fluxStep";
import type { HydrologyModel } from "./hydrology/HydrologyModel";
import { HeightfieldHydrology } from "./hydrology/HeightfieldHydrology";

/**
 * Owns authoritative world fields and the Slice 2 field registry.
 * Terrain is never cloned into hydrology (SIMULATION_MODEL §4, E-005).
 */
export class WorldState {
  readonly width: number;
  readonly height: number;
  readonly terrain: Grid2D;
  readonly water: Grid2D;
  readonly registry: FieldRegistry;
  readonly scheduler: SimScheduler;

  /** Cumulative ledgers (SIMULATION_MODEL §3.2, H-004). */
  precipitationLedger = 0;
  boundaryOutflowLedger = 0;

  private readonly delta: Float32Array;
  private readonly hydrology: HeightfieldHydrology;
  private readonly flowRate: number;
  private readonly maxOutflowFraction: number;

  constructor(
    terrain: Grid2D,
    options?: { flowRate?: number; maxOutflowFraction?: number },
  ) {
    this.width = terrain.width;
    this.height = terrain.height;
    this.terrain = terrain;
    this.water = new Grid2D(this.width, this.height);
    this.delta = new Float32Array(this.width * this.height);
    this.flowRate = options?.flowRate ?? config.flowRate;
    this.maxOutflowFraction =
      options?.maxOutflowFraction ?? config.maxOutflowFraction;

    this.registry = new FieldRegistry();
    this.registry.register({
      id: "terrain.elevation",
      units: "m",
      shape: "cell",
      owner: "geomorphology",
      band: "decadal",
      legacy: true,
      data: this.terrain.data,
    });
    this.registry.register({
      id: "water.surfaceDepth",
      units: "m",
      shape: "cell",
      owner: "surfaceWater",
      band: "event",
      legacy: false,
      data: this.water.data,
    });
    this.registry.register({
      id: "ledger.precipitation",
      units: "m",
      shape: "scalar",
      owner: "climate",
      band: "event",
      legacy: true,
      data: 0,
    });
    this.registry.register({
      id: "ledger.boundaryOutflow",
      units: "m",
      shape: "scalar",
      owner: "surfaceWater",
      band: "event",
      legacy: true,
      data: 0,
    });

    this.hydrology = new HeightfieldHydrology(this);
    this.scheduler = new SimScheduler([surfaceWaterProcess]);
  }

  get hydrologyModel(): HydrologyModel {
    return this.hydrology;
  }

  stepEvent(dt: number): void {
    this.scheduler.runBand("event", this, dt);
  }

  runSurfaceWaterStep(dt: number): void {
    const result = fluxStep(
      this.width,
      this.height,
      this.terrain.data,
      this.water.data,
      this.delta,
      dt,
      this.flowRate,
      this.maxOutflowFraction,
    );
    this.boundaryOutflowLedger += result.boundaryOutflow;
    this.syncLedgers();
  }

  addRain(amountPerCell: number): void {
    if (amountPerCell === 0) return;
    const data = this.water.data;
    let added = 0;
    for (let i = 0; i < data.length; i++) {
      data[i]! += amountPerCell;
      added += amountPerCell;
    }
    this.precipitationLedger += added;
    this.syncLedgers();
  }

  resetWater(): void {
    this.water.fill(0);
    this.precipitationLedger = 0;
    this.boundaryOutflowLedger = 0;
    this.syncLedgers();
  }

  stateHash(): string {
    return this.registry.hashState();
  }

  private syncLedgers(): void {
    (this.registry.get("ledger.precipitation") as { data: number }).data =
      this.precipitationLedger;
    (this.registry.get("ledger.boundaryOutflow") as { data: number }).data =
      this.boundaryOutflowLedger;
  }
}
