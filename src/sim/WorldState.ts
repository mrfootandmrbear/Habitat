import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { FieldRegistry } from "./registry/FieldRegistry";
import { SimScheduler } from "./process/scheduler";
import { surfaceWaterProcess } from "./process/surfaceWaterProcess";
import { soilWaterProcess } from "./process/soilWaterProcess";
import { vegetationProcess } from "./process/vegetationProcess";
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
 * Structural flow (3), soil (4), vegetation cover (5) live here.
 */
export class WorldState {
  readonly width: number;
  readonly height: number;
  readonly terrain: Grid2D;
  readonly water: Grid2D;
  readonly soilMoisture: Grid2D;
  /** Fractional cover [0,1] — Slice 5; unit bound, not ecological K (ES-006). */
  readonly vegCover: Grid2D;
  /** Manning-like n — owned by vegetation (Slice 6 / E-005). */
  readonly surfaceRoughness: Grid2D;
  /** Infiltration capacity — owned by soilWater; veg contributes (Slice 6). */
  readonly infiltrationCapacity: Grid2D;
  /** Veg inbox contribution toward infiltration capacity. */
  readonly vegInfiltrationContribution: Grid2D;
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
  /** Evapotranspiration sink (SIMULATION_MODEL §8.2 / ledger.et). */
  etLedger = 0;

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
    this.vegCover = new Grid2D(this.width, this.height);
    this.surfaceRoughness = new Grid2D(
      this.width,
      this.height,
      config.baseRoughness,
    );
    this.infiltrationCapacity = new Grid2D(
      this.width,
      this.height,
      config.infiltrationRate,
    );
    this.vegInfiltrationContribution = new Grid2D(this.width, this.height);
    this.delta = new Float32Array(this.width * this.height);
    this.flowRate = options?.flowRate ?? config.flowRate;
    this.maxOutflowFraction =
      options?.maxOutflowFraction ?? config.maxOutflowFraction;

    this.registry = new FieldRegistry();
    this.registerFields();

    this.hydrology = new HeightfieldHydrology(this);
    this.scheduler = new SimScheduler([
      surfaceWaterProcess,
      soilWaterProcess,
      vegetationProcess,
    ]);

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
      undefined,
      this.surfaceRoughness.data,
      config.baseRoughness,
    );
    this.boundaryOutflowLedger += result.boundaryOutflow;
    this.syncLedgers();
  }

  runSoilWaterStep(_dt: number): void {
    const w = this.water.data;
    const m = this.soilMoisture.data;
    const cap = this.infiltrationCapacity.data;
    const contrib = this.vegInfiltrationContribution.data;
    const porosity = config.soilPorosity;
    const et = config.etRate;

    // Owner integrates vegetation contribution (lagged vs this band's veg step).
    for (let i = 0; i < cap.length; i++) {
      cap[i] = config.infiltrationRate + contrib[i]!;
    }

    for (let i = 0; i < w.length; i++) {
      const surface = w[i]!;
      const room = Math.max(0, porosity - m[i]!);
      const infiltrate = Math.min(surface, cap[i]!, room);
      if (infiltrate > 0) {
        w[i]! -= infiltrate;
        m[i]! += infiltrate;
        this.infiltrationLedger += infiltrate;
      }
      if (m[i]! > 0) {
        const evap = Math.min(m[i]!, et);
        m[i]! -= evap;
        this.etLedger += evap;
      }
    }
    this.syncLedgers();
  }

  /**
   * Grow / decay cover from soil moisture; write roughness + infil contribution.
   * Does not write water.surfaceDepth. No fixed carrying capacity K (ES-006).
   */
  runVegetationStep(_dt: number): void {
    const m = this.soilMoisture.data;
    const c = this.vegCover.data;
    const rough = this.surfaceRoughness.data;
    const infilContrib = this.vegInfiltrationContribution.data;
    const growth = config.vegGrowthRate;
    const decay = config.vegDecayRate;
    const thresh = config.vegMoistureThreshold;

    for (let i = 0; i < c.length; i++) {
      const moisture = m[i]!;
      let cover = c[i]!;
      if (moisture > thresh) {
        cover += growth * moisture * (1 - cover);
      } else {
        cover -= decay * (1 - moisture / Math.max(thresh, 1e-6));
      }
      cover = Math.min(1, Math.max(0, cover));
      c[i] = cover;
      rough[i] = config.baseRoughness + cover * config.vegRoughnessBonus;
      infilContrib[i] = cover * config.vegInfiltrationBonus;
    }
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
    this.etLedger = 0;
    this.eventStepsSinceDaily = 0;
    this.syncLedgers();
  }

  /**
   * Closed-basin mass check in current depth units (H-004 / §8.2 simplified).
   * From empty start: precip = surface + soil + et + boundaryOutflow.
   * (No Δx² / soil.depth until the metric pass; same relative accounting.)
   */
  waterBalanceResidual(): number {
    let surface = 0;
    let soil = 0;
    for (let i = 0; i < this.water.data.length; i++) {
      surface += this.water.data[i]!;
      soil += this.soilMoisture.data[i]!;
    }
    const accounted =
      surface + soil + this.etLedger + this.boundaryOutflowLedger;
    return this.precipitationLedger - accounted;
  }

  getSoilMoisture(x: number, z: number): number {
    if (!this.soilMoisture.inBounds(x, z)) return 0;
    return this.soilMoisture.get(x, z);
  }

  getVegCover(x: number, z: number): number {
    if (!this.vegCover.inBounds(x, z)) return 0;
    return this.vegCover.get(x, z);
  }

  /**
   * Raise a berm at a cell (A-005). Edits terrain.elevation owned by WorldState,
   * then invalidates / recomputes flow structure. Not a wetland stamp.
   */
  raiseBerm(cx: number, cz: number, amount: number = config.bermRaise): void {
    this.applyTerrainBrush(cx, cz, amount);
  }

  /**
   * Dig a channel at a cell (A-005). Lowers terrain.elevation — a cause that
   * redirects flow; does not place a finished water feature.
   */
  digChannel(cx: number, cz: number, amount: number = config.digLower): void {
    this.applyTerrainBrush(cx, cz, -amount);
  }

  private applyTerrainBrush(cx: number, cz: number, delta: number): void {
    const r = config.sitingBrushRadius;
    for (let z = cz - r; z <= cz + r; z++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (!this.terrain.inBounds(x, z)) continue;
        const dist = Math.hypot(x - cx, z - cz);
        if (dist > r + 0.01) continue;
        const falloff = 1 - dist / (r + 1);
        const next = this.terrain.get(x, z) + delta * falloff;
        this.terrain.set(x, z, Math.max(0, next));
      }
    }
    this.recomputeFlowStructure();
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
        id: "veg.cover",
        units: "fraction",
        shape: "cell" as const,
        owner: "vegetation",
        band: "daily" as const,
        legacy: false,
        data: this.vegCover.data,
      },
      {
        id: "surface.roughness",
        units: "Manning n",
        shape: "cell" as const,
        owner: "vegetation",
        band: "daily" as const,
        legacy: false,
        data: this.surfaceRoughness.data,
      },
      {
        id: "veg.infiltrationContribution",
        units: "m/step",
        shape: "cell" as const,
        owner: "vegetation",
        band: "daily" as const,
        legacy: false,
        data: this.vegInfiltrationContribution.data,
      },
      {
        id: "soil.infiltrationCapacity",
        units: "m/step",
        shape: "cell" as const,
        owner: "soilWater",
        band: "daily" as const,
        legacy: true,
        data: this.infiltrationCapacity.data,
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
      {
        id: "ledger.et",
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
    (this.registry.get("ledger.et") as { data: number }).data = this.etLedger;
  }
}
