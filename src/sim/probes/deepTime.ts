/**
 * Deep-time horizon helpers (BUILD_GUIDE §4.1, SIMULATION_MODEL §7 f32 stall,
 * P-005 save criterion).
 *
 * Prototype compression: each decadal band fires every `decadalDailySteps` days
 * and is treated as 10 sim-years of geomorphology (SIMULATION_MODEL §6 table).
 */
import { config } from "../../config";
import { generateMountain } from "../terrain/generateMountain";
import { WorldState } from "../WorldState";
import { applySave, serializeRegistry } from "../save";

/** Sim-years represented by one compressed decadal band commit. */
export const YEARS_PER_DECADAL_BAND = 10;

export const DEEP_TIME_GRID = 24;
export const DEEP_TIME_SEED = 42;
/** Horizon for the probe and P-005 criterion. */
export const DEEP_TIME_SIM_YEARS = 100;

export function eventsPerDecadalBand(): number {
  return config.dailyEventSteps * config.decadalDailySteps;
}

export function decadalBandsForYears(simYears: number): number {
  return Math.round(simYears / YEARS_PER_DECADAL_BAND);
}

export function meanField(data: Float32Array): number {
  let s = 0;
  for (let i = 0; i < data.length; i++) s += data[i]!;
  return s / data.length;
}

export function makeDeepTimeWorld(): WorldState {
  return new WorldState(
    generateMountain(DEEP_TIME_GRID, DEEP_TIME_GRID, 8, DEEP_TIME_SEED),
  );
}

/**
 * Advance `decadalBands` compressed decadal commits with a fixed rain schedule.
 * Rain on the first quarter of each day keeps soil/veg alive without drowning the grid.
 */
export function advanceDecadalBands(
  world: WorldState,
  decadalBands: number,
): { wallMs: number; eventSteps: number } {
  const events = decadalBands * eventsPerDecadalBand();
  const rainyPerDay = Math.floor(config.dailyEventSteps / 4);
  const t0 = performance.now();
  for (let i = 0; i < events; i++) {
    const stepInDay = i % config.dailyEventSteps;
    if (stepInDay < rainyPerDay) {
      world.addRain(config.rainDepthPerEvent);
    }
    world.stepEvent();
  }
  return { wallMs: performance.now() - t0, eventSteps: events };
}

export type HorizonSample = {
  simYears: number;
  meanElev: number;
  meanSoilDepth: number;
  meanCover: number;
  massResidual: number;
  stepMsMean: number;
};

/** Sample state after each `sampleEveryBands` block across `totalBands`. */
export function sampleHorizon(
  world: WorldState,
  totalBands: number,
  sampleEveryBands: number,
): HorizonSample[] {
  const samples: HorizonSample[] = [
    {
      simYears: 0,
      meanElev: meanField(world.terrain.data),
      meanSoilDepth: meanField(world.soilDepth.data),
      meanCover: meanField(world.vegCover.data),
      massResidual: world.waterBalanceResidual(),
      stepMsMean: 0,
    },
  ];

  let bandsDone = 0;
  while (bandsDone < totalBands) {
    const chunk = Math.min(sampleEveryBands, totalBands - bandsDone);
    const { wallMs, eventSteps } = advanceDecadalBands(world, chunk);
    bandsDone += chunk;
    samples.push({
      simYears: bandsDone * YEARS_PER_DECADAL_BAND,
      meanElev: meanField(world.terrain.data),
      meanSoilDepth: meanField(world.soilDepth.data),
      meanCover: meanField(world.vegCover.data),
      massResidual: world.waterBalanceResidual(),
      stepMsMean: wallMs / Math.max(eventSteps, 1),
    });
  }
  return samples;
}

/**
 * P-005: save → advance 100 sim-years → reload save → advance again → identical hash.
 */
export function p005SaveAdvanceReloadHash(): {
  hashFirst: string;
  hashSecond: string;
  match: boolean;
} {
  const world = makeDeepTimeWorld();
  const doc = serializeRegistry(world.registry);
  const bands = decadalBandsForYears(DEEP_TIME_SIM_YEARS);

  advanceDecadalBands(world, bands);
  const hashFirst = world.stateHash();

  applySave(world.registry, doc);
  world.markStructureDirty();
  world.ensureStructureFresh();

  advanceDecadalBands(world, bands);
  const hashSecond = world.stateHash();

  return {
    hashFirst,
    hashSecond,
    match: hashFirst === hashSecond,
  };
}

/**
 * Legacy half of P-005: thin soil.depth from a save still drives faster production
 * over decades than a deep-soil save (effect manifests on the decadal band).
 */
export function p005LegacyDepthEffect(): {
  thinFinalDepth: number;
  deepFinalDepth: number;
  thinGainedMore: boolean;
} {
  const bands = 5; // 50 compressed sim-years
  const thin = makeDeepTimeWorld();
  thin.soilDepth.fill(0.1);
  const thinDoc = serializeRegistry(thin.registry);

  const deep = makeDeepTimeWorld();
  deep.soilDepth.fill(2.0);
  const deepDoc = serializeRegistry(deep.registry);

  const thinRun = makeDeepTimeWorld();
  applySave(thinRun.registry, thinDoc);
  thinRun.markStructureDirty();
  thinRun.ensureStructureFresh();
  const thin0 = meanField(thinRun.soilDepth.data);
  advanceDecadalBands(thinRun, bands);
  const thin1 = meanField(thinRun.soilDepth.data);

  const deepRun = makeDeepTimeWorld();
  applySave(deepRun.registry, deepDoc);
  deepRun.markStructureDirty();
  deepRun.ensureStructureFresh();
  const deep0 = meanField(deepRun.soilDepth.data);
  advanceDecadalBands(deepRun, bands);
  const deep1 = meanField(deepRun.soilDepth.data);

  const thinGain = thin1 - thin0;
  const deepGain = deep1 - deep0;
  return {
    thinFinalDepth: thin1,
    deepFinalDepth: deep1,
    thinGainedMore: thinGain > deepGain,
  };
}
