import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { FieldRegistry } from "./registry/FieldRegistry";
import { SimScheduler } from "./process/scheduler";
import { surfaceWaterProcess } from "./process/surfaceWaterProcess";
import { soilWaterProcess } from "./process/soilWaterProcess";
import { fluxStep } from "./hydrology/fluxStep";
import {
  computeD8Accumulation,
  computeD8FlowDirection,
  computeWatershedLabels,
  type FlowDirection,
} from "./hydrology/flowRouting";
import type { HydrologyModel } from "./hydrology/HydrologyModel";
import { HeightfieldHydrology } from "./hydrology/HeightfieldHydrology";

/**
 * Owns authoritative world fields and the field registry.
 * Structural flow layers (Slice 3) and soil moisture (Slice 4) live here.
 */
export class WorldState {
  readonly width: number;
  readonly height: number;
  readonly terrain: Grid2D;
  readonly water: Grid2D;
  readonly soilMoisture: Grid2D;
  readonly registry: FieldRegistry;
  readonly scheduler: SimScheduler;

  /** Derived structural layers (SIMULATION_MODEL §3.9) — authoritative for watershed identity. */
  flowDirection: FlowDirection | null = null;
  flowAccumulation: Uint32Array | null = null;
  watershedLabel: Uint16Array | null = null;

  /** Cumulative ledgers (SIMULATION_MODEL §3.2, H-004). */
  precipitationLedger = 0;
  boundaryOutflowLedger = 0;
  infiltrationLedger = 0;

  private readonly delta: Float32Array;
  private readonly hydrology: HeightfieldHydrology;
  private readonly flowRate: number;
  private readonly maxOutflowFraction: number;
  private eventStepsSinceDaily = 0;

  constructor(
    terrain: Grid2D,
    options?: { flowRate?: number; maxOutflowFraction?: number },
  ) {
    this.width = terrain.width;
    this.height = terrain.height;
    this.terrain = terrain;
    this.water = new Grid2D(this.width, this.height);
    this.soilMoisture = new Grid2D(this.width, this.height);
    this.delta = new Float32Array(this.width * this.height);
    this.flowRate = options?.flowRate ?? config.flowRate;
    this.maxOutflowFraction =
      options?.maxOutflowFraction ?? config.maxOutflowFraction;

    this.registry = new FieldRegistry();
    this.registerFields();

    this.hydrology = new HeightfieldHydrology(this);
    this.scheduler = new SimScheduler([surfaceWaterProcess, soilWaterProcess]);

    this.recomputeFlowStructure();
  }

  get hydrologyModel(): HydrologyModel {
    return this.hydrology;
  }

  stepEvent(dt: number): void {
    this.scheduler.runBand("event", this, dt);

    this.eventStepsSinceDaily += 1;
    if (this.eventStepsSinceDaily >= config.dailyEventSteps) {
      this.eventStepsSinceDaily = 0;
      this.scheduler.runBand("daily", this, config.dailyEventSteps * dt);
    }
  }

  recomputeFlowStructure(): void {
    const elev = this.terrain.data;
    this.flowDirection = computeD8FlowDirection(this.width, this.height, elev);
    this.flowAccumulation = computeD8Accumulation(
      this.width,
      this.height,
      elev,
      this.flowDirection,
    );
    this.watershedLabel = computeWatershedLabels(
      this.width,
      this.height,
      this.flowDirection,
    );
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

  runSoilWaterStep(_dt: number): void {
    const w = this.water.data;
    const m = this.soilMoisture.data;
    const porosity = config.soilPorosity;
    const infilRate = config.infiltrationRate;
    const et = config.etRate;

    for (let i = 0; i < w.length; i++) {
      const surface = w[i]!;
      const room = Math.max(0, porosity - m[i]!);
      const infiltrate = Math.min(surface, infilRate, room);
      if (infiltrate > 0) {
        w[i]! -= infiltrate;
        m[i]! += infiltrate;
        this.infiltrationLedger += infiltrate;
      }
      if (m[i]! > 0) {
        const evap = Math.min(m[i]!, et);
        m[i]! -= evap;
      }
    }
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
    this.soilMoisture.fill(0);
    this.precipitationLedger = 0;
    this.boundaryOutflowLedger = 0;
    this.infiltrationLedger = 0;
    this.eventStepsSinceDaily = 0;
    this.syncLedgers();
  }

  getSoilMoisture(x: number, z: number): number {
    if (!this.soilMoisture.inBounds(x, z)) return 0;
    return this.soilMoisture.get(x, z);
  }

  stateHash(): string {
    return this.registry.hashState();
  }

  private registerFields(): void {
    const fields = [
      {
        id: "terrain.elevation",
        units: "m",
        shape: "cell" as const,
        owner: "geomorphology",
        band: "decadal" as const,
        legacy: true,
        data: this.terrain.data,
      },
      {
        id: "water.surfaceDepth",
        units: "m",
        shape: "cell" as const,
        owner: "surfaceWater",
        band: "event" as const,
        legacy: false,
        data: this.water.data,
      },
      {
        id: "soil.moisture",
        units: "m³/m³",
        shape: "cell" as const,
        owner: "soilWater",
        band: "daily" as const,
        legacy: false,
        data: this.soilMoisture.data,
      },
      {
        id: "ledger.precipitation",
        units: "m",
        shape: "scalar" as const,
        owner: "climate",
        band: "event" as const,
        legacy: true,
        data: 0,
      },
      {
        id: "ledger.boundaryOutflow",
        units: "m",
        shape: "scalar" as const,
        owner: "surfaceWater",
        band: "event" as const,
        legacy: true,
        data: 0,
      },
      {
        id: "ledger.infiltration",
        units: "m",
        shape: "scalar" as const,
        owner: "soilWater",
        band: "daily" as const,
        legacy: true,
        data: 0,
      },
    ];
    for (const f of fields) this.registry.register(f);
  }

  private syncLedgers(): void {
    (this.registry.get("ledger.precipitation") as { data: number }).data =
      this.precipitationLedger;
    (this.registry.get("ledger.boundaryOutflow") as { data: number }).data =
      this.boundaryOutflowLedger;
    (this.registry.get("ledger.infiltration") as { data: number }).data =
      this.infiltrationLedger;
  }
}
