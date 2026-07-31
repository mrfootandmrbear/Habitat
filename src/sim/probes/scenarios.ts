import { config } from "../../config";
import { Grid2D } from "../Grid2D";
import { WorldState } from "../WorldState";
import { computeShorelineCells, totalWaterVolume } from "../hydrology/fluxStep";
import { generateMountain } from "../terrain/generateMountain";
import {
  rainDepthForRegime,
  rainRegimeById,
  regimeRainsThisEvent,
  type RainRegimeId,
} from "../climate/rainRegime";
import { heatById } from "../climate/atmosphere";
import { fillOrographicRainDepths } from "../climate/orographicPrecip";
import { windById, type WindId } from "../climate/windRegime";
import { meanExposure } from "../climate/shoreExposure";
import {
  LIMITING_DEPTH,
  LIMITING_MOISTURE,
  LIMITING_SALINITY,
  LIMITING_TEMPERATURE,
} from "../habitat/hsiComposition";
import {
  DEEP_TIME_SIM_YEARS,
  decadalBandsForYears,
  makeDeepTimeWorld,
  p005LegacyDepthEffect,
  p005SaveAdvanceReloadHash,
  sampleHorizon,
} from "./deepTime";
import {
  SUBSTRATE_CLAY,
  SUBSTRATE_ROCK,
  SUBSTRATE_SAND,
  substrateProps,
} from "../terrain/substrates";
import {
  generateIsland,
  DEFAULT_SEA_LEVEL_METERS,
} from "../terrain/generateIsland";
import { shorelineEncodingDelta } from "../climate/seaLevel";
import {
  foreshoreEncodingFrac,
  tideById,
} from "../climate/tidalEnvelope";
import {
  ScenarioSession,
  criterionReaderFromWorld,
  livingHollowObjective,
} from "../scenario/ScenarioSession";
import { soilEncodingDelta } from "../../ui/cutaway";
import { intertidalEncodingDelta } from "../../ui/terrainEncoding";
import { seedPressureAt } from "../habitat/arrivalComposition";

export type ProbeRecord = Record<string, number | string>;

export type ProbeResult = {
  scenario: string;
  records: ProbeRecord[];
};

export function probePairedStorm(): ProbeResult {
  // Match veg-water paired flux: roughness blunts downslope delivery.
  const w = 16;
  const h = 8;
  const ramp = new Grid2D(w, h);
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      ramp.set(x, z, (w - 1 - x) * 0.4);
    }
  }
  const bare = new WorldState(ramp.clone(), { closedBoundary: true });
  const veg = new WorldState(ramp.clone(), { closedBoundary: true });
  bare.vegCover.fill(0);
  veg.vegCover.fill(1);
  bare.runVegetationStep(1);
  veg.runVegetationStep(1);
  bare.runSoilWaterStep(1);
  veg.runSoilWaterStep(1);

  const runFlux = (world: WorldState): ProbeRecord => {
    world.water.fill(0);
    for (let z = 0; z < h; z++) {
      world.water.set(0, z, 0.5);
    }
    for (let i = 0; i < 40; i++) {
      world.runSurfaceWaterStep(config.eventFluxDt);
    }
    const downslope = world.water.get(w - 1, (h / 2) | 0);
    return {
      cover: world.vegCover.get(0, 0),
      downslope,
      roughness: world.surfaceRoughness.get(0, 0),
    };
  };

  const bareFlux = runFlux(bare);
  const vegFlux = runFlux(veg);

  // Separate infil soak on flat (cover raises infiltration capacity).
  const flat = new Grid2D(12, 12, 1);
  const bareSoil = new WorldState(flat.clone());
  const vegSoil = new WorldState(flat.clone());
  bareSoil.vegCover.fill(0);
  vegSoil.vegCover.fill(1);
  bareSoil.runVegetationStep(1);
  vegSoil.runVegetationStep(1);
  bareSoil.runSoilWaterStep(1);
  vegSoil.runSoilWaterStep(1);
  bareSoil.water.fill(0.4);
  vegSoil.water.fill(0.4);
  bareSoil.infiltrationLedger = 0;
  vegSoil.infiltrationLedger = 0;
  bareSoil.runSoilWaterStep(1);
  vegSoil.runSoilWaterStep(1);

  const bareDown = Number(bareFlux.downslope);
  const vegDown = Number(vegFlux.downslope);
  if (!(bareDown > vegDown)) {
    throw new Error(
      `paired-storm: expected bare downslope (${bareDown}) > vegetated (${vegDown})`,
    );
  }
  const bareInfil = bareSoil.infiltrationLedger;
  const vegInfil = vegSoil.infiltrationLedger;
  if (!(vegInfil > bareInfil)) {
    throw new Error("paired-storm: expected vegetated infil > bare");
  }
  const records: ProbeRecord[] = [
    {
      label: "bare",
      ...bareFlux,
      infiltrated: bareInfil,
    },
    {
      label: "vegetated",
      ...vegFlux,
      infiltrated: vegInfil,
    },
  ];
  return { scenario: "paired-storm", records };
}

export function probeBermReroute(): ProbeResult {
  // Ramp so a mid-slope berm clearly redirects accumulation (A-005 / Tier-M).
  const w = 24;
  const h = 24;
  const terrain = new Grid2D(w, h);
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      terrain.set(x, z, x * 0.4);
    }
  }
  const world = new WorldState(terrain);
  world.ensureStructureFresh();
  const before = world.flowAccumulation!.slice();
  world.raiseBerm(12, 12, 3);
  world.ensureStructureFresh();
  const after = world.flowAccumulation!;
  let changed = 0;
  let maxDelta = 0;
  for (let i = 0; i < before.length; i++) {
    const d = Math.abs((after[i] ?? 0) - (before[i] ?? 0));
    if (d > 0) changed++;
    maxDelta = Math.max(maxDelta, d);
  }
  const records = [
    {
      cellsChanged: changed,
      maxAccumulationDelta: maxDelta,
      bermCellAccBefore: before[12 * w + 12] ?? 0,
      bermCellAccAfter: after[12 * w + 12] ?? 0,
    },
  ];
  if (changed === 0) {
    throw new Error("berm-reroute: expected flow accumulation to change");
  }
  return { scenario: "berm-reroute", records };
}

export function probeBasinFill(): ProbeResult {
  const w = 16;
  const h = 16;
  const terrain = new Grid2D(w, h, 4);
  for (let z = 4; z < 12; z++) {
    for (let x = 4; x < 12; x++) {
      terrain.set(x, z, 1);
    }
  }
  terrain.set(8, 8, 0);
  const world = new WorldState(terrain);
  world.ensureStructureFresh();
  const pit = 8 * w + 8;
  const depth = world.depressionDepth.data[pit]!;
  const filled = world.filledElevation![pit]!;

  world.water.fill(0);
  world.water.set(8, 8, depth);
  const initial = totalWaterVolume(world.water.data);
  for (let i = 0; i < 40; i++) world.runSurfaceWaterStep(config.eventFluxDt);
  const residual = Math.abs(totalWaterVolume(world.water.data) - initial);

  const records = [
    {
      pitRawElev: 0,
      spillFilledElev: filled,
      depressionDepth: depth,
      volumeResidual: residual,
    },
  ];
  return { scenario: "basin-fill", records };
}

/**
 * Decadal horizon + P-005 save criterion (BUILD_GUIDE §4.1).
 * Asserts slow fields still move late (f32-stall tripwire) and save/reload
 * trajectories hash-equal over 100 compressed sim-years.
 */
export function probeDeepTime(): ProbeResult {
  const totalBands = decadalBandsForYears(DEEP_TIME_SIM_YEARS);
  const sampleEvery = 2; // every 20 compressed sim-years
  const world = makeDeepTimeWorld();
  const samples = sampleHorizon(world, totalBands, sampleEvery);

  if (samples.length < 3) {
    throw new Error("deep-time: expected at least t0 + two interval samples");
  }
  const prev = samples[samples.length - 2]!;
  const last = samples[samples.length - 1]!;
  const lateSoilDelta = last.meanSoilDepth - prev.meanSoilDepth;
  const lateElevDelta = last.meanElev - prev.meanElev;
  const lateCoverDelta = last.meanCover - prev.meanCover;
  const lateMoved =
    Math.abs(lateSoilDelta) > 1e-8 ||
    Math.abs(lateElevDelta) > 1e-8 ||
    Math.abs(lateCoverDelta) > 1e-8;
  if (!lateMoved) {
    throw new Error(
      `deep-time: f32-stall suspected — no late change in soil/elev/cover between ${prev.simYears}y and ${last.simYears}y (deltas ${lateSoilDelta}, ${lateElevDelta}, ${lateCoverDelta})`,
    );
  }

  const p005 = p005SaveAdvanceReloadHash();
  if (!p005.match) {
    throw new Error(
      `deep-time P-005: hash mismatch after save/advance/reload/advance (${p005.hashFirst} vs ${p005.hashSecond})`,
    );
  }
  const legacy = p005LegacyDepthEffect();
  if (!legacy.thinGainedMore) {
    throw new Error(
      `deep-time P-005 legacy: thin soil from save did not out-produce deep soil over decades (thin=${legacy.thinFinalDepth}, deep=${legacy.deepFinalDepth})`,
    );
  }

  const records: ProbeRecord[] = samples.map((s) => ({
    label: `y${s.simYears}`,
    meanElev: s.meanElev,
    meanSoilDepth: s.meanSoilDepth,
    meanCover: s.meanCover,
    massResidual: s.massResidual,
    stepMsMean: s.stepMsMean,
  }));
  records.push({
    label: "lateDelta",
    soilDepthDelta: lateSoilDelta,
    elevDelta: lateElevDelta,
    coverDelta: lateCoverDelta,
    stillMoving: lateMoved ? 1 : 0,
  });
  records.push({
    label: "p005",
    hashMatch: p005.match ? 1 : 0,
    simYears: DEEP_TIME_SIM_YEARS,
    legacyThinGainedMore: legacy.thinGainedMore ? 1 : 0,
    // Encode hashes as numeric fingerprints for baseline (first 8 hex → int)
    hashFirstN: Number.parseInt(p005.hashFirst.slice(0, 8), 16),
    hashSecondN: Number.parseInt(p005.hashSecond.slice(0, 8), 16),
  });

  return { scenario: "deep-time", records };
}

/**
 * Slice 8b / C-001: after wet→dry, channel cells stay wetter with GW than without.
 * Linear-reservoir baseflow — not Richards (EXTERNAL_REFERENCES ban).
 *
 * Ponded storm water is drained to the boundary ledger before the dry spell so
 * the comparison isolates storage-fed seepage (H-004 still closes).
 */
export function probeBaseflowPersist(): ProbeResult {
  const makeWorld = (groundwaterEnabled: boolean): WorldState =>
    new WorldState(generateMountain(24, 24, 6, 3), { groundwaterEnabled });

  const channelWetness = (world: WorldState): number => {
    world.ensureStructureFresh();
    const acc = world.flowAccumulation!;
    const sorted = Array.from(acc).sort((a, b) => a - b);
    const threshold = sorted[Math.floor(sorted.length * 0.75)]!;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < acc.length; i++) {
      if (acc[i]! >= threshold) {
        sum += world.water.data[i]!;
        n++;
      }
    }
    return n > 0 ? sum / n : 0;
  };

  const runSchedule = (groundwaterEnabled: boolean) => {
    const world = makeWorld(groundwaterEnabled);
    const wetDays = 5;
    const dryDays = 6;
    for (let d = 0; d < wetDays; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.addRain(config.rainDepthPerEvent * 2.5);
        world.stepEvent();
      }
    }
    // Storm pulse leaves the preserve — counted as boundary outflow (H-004).
    let removed = 0;
    for (let i = 0; i < world.water.data.length; i++) {
      removed += world.water.data[i]!;
      world.water.data[i] = 0;
    }
    world.boundaryOutflowLedger += removed;

    for (let d = 0; d < dryDays; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.stepEvent();
      }
    }
    return {
      channelWet: channelWetness(world),
      gwSum: world.groundwaterStorageSum(),
      massResidual: world.waterBalanceResidual(),
      precip: world.precipitationLedger,
    };
  };

  const withGw = runSchedule(true);
  const withoutGw = runSchedule(false);

  if (!(withGw.channelWet > withoutGw.channelWet)) {
    throw new Error(
      `baseflow-persist: expected with-GW channel wetness (${withGw.channelWet}) > without (${withoutGw.channelWet})`,
    );
  }
  if (!(withGw.gwSum > 0)) {
    throw new Error(
      "baseflow-persist: expected positive GW storage after wet→dry",
    );
  }
  const relResidual =
    Math.abs(withGw.massResidual) / Math.max(1, withGw.precip);
  if (relResidual >= 1e-4) {
    throw new Error(
      `baseflow-persist: H-004 residual too large (${withGw.massResidual}, rel=${relResidual})`,
    );
  }

  return {
    scenario: "baseflow-persist",
    records: [
      {
        label: "withGw",
        channelWet: withGw.channelWet,
        gwSum: withGw.gwSum,
        massResidual: withGw.massResidual,
      },
      {
        label: "withoutGw",
        channelWet: withoutGw.channelWet,
        gwSum: withoutGw.gwSum,
        massResidual: withoutGw.massResidual,
      },
      {
        label: "delta",
        channelWetDelta: withGw.channelWet - withoutGw.channelWet,
        ratio:
          withoutGw.channelWet > 1e-12
            ? withGw.channelWet / withoutGw.channelWet
            : withGw.channelWet > 0
              ? 1e6
              : 0,
      },
    ],
  };
}

/**
 * Slice 8c / C-004: same seed + same regime → identical hash;
 * different authored regime → divergent outcome. Force dial is global
 * (no cell targeting — THESIS §9).
 */
export function probeRegimeDivergence(): ProbeResult {
  const seed = 11;
  const days = 6;

  const run = (regimeId: RainRegimeId) => {
    const world = new WorldState(generateMountain(24, 24, 6, seed));
    const regime = rainRegimeById(regimeId);
    const depth = rainDepthForRegime(
      regime,
      config.rainDepthPerEvent,
      config.dailyEventSteps,
    );
    for (let d = 0; d < days; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        if (
          depth > 0 &&
          regimeRainsThisEvent(regime, i, config.dailyEventSteps, d)
        ) {
          world.addRain(depth);
        }
        world.stepEvent();
      }
    }
    let soil = 0;
    let cover = 0;
    for (let i = 0; i < world.soilMoisture.data.length; i++) {
      soil += world.soilStorageDepth(i);
      cover += world.vegCover.data[i]!;
    }
    const n = world.vegCover.data.length;
    return {
      hash: world.stateHash(),
      precip: world.precipitationLedger,
      soilSum: soil,
      meanCover: cover / n,
      hashN: Number.parseInt(world.stateHash().slice(0, 8), 16),
    };
  };

  const lightA = run("light");
  const lightB = run("light");
  const heavy = run("heavy");

  if (lightA.hash !== lightB.hash) {
    throw new Error(
      `regime-divergence: same regime must match (T-001) ${lightA.hash} vs ${lightB.hash}`,
    );
  }
  if (lightA.hash === heavy.hash) {
    throw new Error(
      "regime-divergence: light and heavy regimes produced identical hashes",
    );
  }
  if (!(heavy.precip > lightA.precip)) {
    throw new Error(
      `regime-divergence: expected heavy precip (${heavy.precip}) > light (${lightA.precip})`,
    );
  }

  return {
    scenario: "regime-divergence",
    records: [
      {
        label: "light",
        hashN: lightA.hashN,
        precip: lightA.precip,
        soilSum: lightA.soilSum,
        meanCover: lightA.meanCover,
        replayMatch: lightA.hash === lightB.hash ? 1 : 0,
      },
      {
        label: "heavy",
        hashN: heavy.hashN,
        precip: heavy.precip,
        soilSum: heavy.soilSum,
        meanCover: heavy.meanCover,
      },
      {
        label: "delta",
        precipDelta: heavy.precip - lightA.precip,
        soilDelta: heavy.soilSum - lightA.soilSum,
        hashDiverged: lightA.hash !== heavy.hash ? 1 : 0,
      },
    ],
  };
}

/**
 * Slice 9: a patch whose limiting factor identity flips across wet→dry
 * (Liebig argmin — NATURAL_PROCESS_MATH §3.3 / docs/slices/9-composition.md).
 */
export function probeLimitingShift(): ProbeResult {
  const world = new WorldState(new Grid2D(12, 12, 2));
  const cx = 6;
  const cz = 6;
  // Thin soil, wet moisture, ample GW → depth limits.
  world.soilDepth.fill(1.2);
  world.soilDepth.set(cx, cz, 0.12);
  world.soilMoisture.fill(config.soilPorosity * 0.9);
  world.groundwaterStorage.fill(0.4);
  world.runHabitatStep(1);
  const wetLim = world.getLimitingFactor(cx, cz);
  const wetHsi = world.getHabitatSuitability(cx, cz);
  if (wetLim !== LIMITING_DEPTH) {
    throw new Error(
      `limiting-shift: expected depth-limited when wet (got ${wetLim})`,
    );
  }

  // Drought the patch: collapse moisture below GW suitability → moisture limits.
  world.soilMoisture.set(cx, cz, 0.02);
  world.groundwaterStorage.set(cx, cz, 0.05);
  world.runHabitatStep(1);
  const dryLim = world.getLimitingFactor(cx, cz);
  const dryHsi = world.getHabitatSuitability(cx, cz);
  if (dryLim !== LIMITING_MOISTURE) {
    throw new Error(
      `limiting-shift: expected moisture-limited when dry (got ${dryLim})`,
    );
  }
  if (!(dryHsi < wetHsi)) {
    throw new Error(
      `limiting-shift: expected dry HSI (${dryHsi}) < wet HSI (${wetHsi})`,
    );
  }

  return {
    scenario: "limiting-shift",
    records: [
      {
        label: "wet",
        limiting: wetLim,
        hsi: wetHsi,
        depthLimited: wetLim === LIMITING_DEPTH ? 1 : 0,
      },
      {
        label: "dry",
        limiting: dryLim,
        hsi: dryHsi,
        moistureLimited: dryLim === LIMITING_MOISTURE ? 1 : 0,
      },
      {
        label: "shift",
        identityChanged: 1,
        hsiDrop: wetHsi - dryHsi,
      },
    ],
  };
}

/**
 * Slice 10: post-fire recovery trajectory differs by pre-fire moisture.
 * Wet patch recovers veg.cover faster after identical burn (ES-002, NATURAL_PROCESS_MATH §3.5).
 * Also asserts determinism (T-001) and fuel accounting conservation.
 */
export function probeBurnRecover(): ProbeResult {
  const w = 16;
  const h = 16;
  const world = new WorldState(new Grid2D(w, h, 3));
  world.vegCover.fill(0.7);
  world.soilMoisture.fill(0.15);

  // Accumulate fuel (several decadal steps)
  for (let i = 0; i < 8; i++) world.runFuelAccumulationStep(1);

  const fuelBefore = sumGrid(world.fuelLoad.data);

  // Set up moisture zones: left half wet, right half dry
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      world.soilMoisture.data[i] = x < w / 2 ? 0.08 : 0.03;
    }
  }

  // Ignite center — only right-half (dry) should burn fully
  world.igniteCell(w / 2, h / 2);

  // Run second identical world for determinism check
  const world2 = new WorldState(new Grid2D(w, h, 3));
  world2.vegCover.fill(0.7);
  world2.soilMoisture.fill(0.15);
  for (let i = 0; i < 8; i++) world2.runFuelAccumulationStep(1);
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      world2.soilMoisture.data[i] = x < w / 2 ? 0.08 : 0.03;
    }
  }
  world2.igniteCell(w / 2, h / 2);

  // Fire spread
  world.runFireStep(1);
  world2.runFireStep(1);

  const hashAfter1 = world.stateHash();
  const hashAfter2 = world2.stateHash();

  if (hashAfter1 !== hashAfter2) {
    throw new Error(
      `burn-recover: determinism failed (T-001) — ${hashAfter1} vs ${hashAfter2}`,
    );
  }

  const fuelAfter = sumGrid(world.fuelLoad.data);
  const consumed = world.fuelConsumedLedger;
  const accountingError = Math.abs((fuelBefore - fuelAfter) - consumed);
  if (accountingError > 0.01) {
    throw new Error(
      `burn-recover: fuel accounting error=${accountingError} (consumed=${consumed}, delta=${fuelBefore - fuelAfter})`,
    );
  }

  // Count burned cells (fuel was consumed)
  let burnedCells = 0;
  for (let i = 0; i < world.fuelLoad.data.length; i++) {
    if (world.fireIntensity.data[i]! > 0) burnedCells++;
  }

  // Record cover after burn
  const wetCoverAfterBurn = sectorMean(world.vegCover.data, w, 0, w / 2, 0, h);
  const dryCoverAfterBurn = sectorMean(world.vegCover.data, w, w / 2, w, 0, h);

  // Now set moisture for recovery and run vegetation growth
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      world.soilMoisture.data[i] = x < w / 2 ? 0.30 : 0.04;
    }
  }

  for (let i = 0; i < 50; i++) world.runVegetationStep(1);

  const wetCoverRecovered = sectorMean(world.vegCover.data, w, 0, w / 2, 0, h);
  const dryCoverRecovered = sectorMean(world.vegCover.data, w, w / 2, w, 0, h);

  if (!(wetCoverRecovered > dryCoverRecovered)) {
    throw new Error(
      `burn-recover: expected wet recovery (${wetCoverRecovered}) > dry (${dryCoverRecovered})`,
    );
  }

  return {
    scenario: "burn-recover",
    records: [
      {
        label: "fire",
        burnedCells,
        fuelBefore,
        fuelAfter,
        consumed,
        accountingError,
        determinismMatch: 1,
        hashN: Number.parseInt(hashAfter1.slice(0, 8), 16),
      },
      {
        label: "wetSector",
        coverAfterBurn: wetCoverAfterBurn,
        coverRecovered: wetCoverRecovered,
      },
      {
        label: "drySector",
        coverAfterBurn: dryCoverAfterBurn,
        coverRecovered: dryCoverRecovered,
      },
      {
        label: "delta",
        recoveryGap: wetCoverRecovered - dryCoverRecovered,
        wetVsDry: wetCoverRecovered / Math.max(dryCoverRecovered, 1e-12),
      },
    ],
  };
}

/**
 * Slice 11 / ES-001: paired north/south aspects diverge under the same
 * moisture, initial cover, and vegetation rules. Slope/aspect sets incoming
 * light; Beer–Lambert canopy attenuation shapes the succession trajectory.
 */
export function probeSuccessionDiverge(): ProbeResult {
  const size = 16;
  const steps = 60;

  const run = (risePerCell: number) => {
    const terrain = new Grid2D(size, size);
    const offset = Math.abs(risePerCell) * size;
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        terrain.set(x, z, offset + z * risePerCell);
      }
    }
    const world = new WorldState(terrain);
    world.soilMoisture.fill(0.25);
    world.vegCover.fill(0.1);
    for (let i = 0; i < steps; i++) world.runVegetationStep(1);
    return {
      hash: world.stateHash(),
      meanInsolation: meanGrid(world.insolation.data),
      meanUnderstoryLight: meanGrid(world.understoryLight.data),
      meanCover: meanGrid(world.vegCover.data),
    };
  };

  const south = run(-4);
  const southReplay = run(-4);
  const north = run(4);
  if (south.hash !== southReplay.hash) {
    throw new Error(
      `succession-diverge: same aspect must replay exactly (${south.hash} vs ${southReplay.hash})`,
    );
  }
  if (!(south.meanInsolation > north.meanInsolation)) {
    throw new Error(
      `succession-diverge: expected south insolation (${south.meanInsolation}) > north (${north.meanInsolation})`,
    );
  }
  if (!(south.meanCover > north.meanCover)) {
    throw new Error(
      `succession-diverge: expected south cover (${south.meanCover}) > north (${north.meanCover})`,
    );
  }

  return {
    scenario: "succession-diverge",
    records: [
      {
        label: "south",
        meanInsolation: south.meanInsolation,
        meanUnderstoryLight: south.meanUnderstoryLight,
        meanCover: south.meanCover,
        replayMatch: 1,
      },
      {
        label: "north",
        meanInsolation: north.meanInsolation,
        meanUnderstoryLight: north.meanUnderstoryLight,
        meanCover: north.meanCover,
      },
      {
        label: "delta",
        insolationGap: south.meanInsolation - north.meanInsolation,
        coverGap: south.meanCover - north.meanCover,
      },
    ],
  };
}

/**
 * Dry-down feedback: after the same wetting pulse, south aspects dry faster
 * than north, and vegetated cells transpire while bare cells evaporate —
 * insolation × cover ET (NATURAL_PROCESS_MATH §1.6–1.7). Mass residual closes.
 */
export function probeDrydownFeedback(): ProbeResult {
  const size = 16;
  const wetDays = 3;
  const dryDays = 8;

  const runAspect = (risePerCell: number, cover: number) => {
    const terrain = new Grid2D(size, size);
    const offset = Math.abs(risePerCell) * size;
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        terrain.set(x, z, offset + z * risePerCell);
      }
    }
    const world = new WorldState(terrain);
    world.vegCover.fill(cover);
    world.runVegetationStep(1);
    for (let d = 0; d < wetDays; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.addRain(config.rainDepthPerEvent * 2);
        world.stepEvent();
      }
    }
    const moistureAfterWet = meanGrid(world.soilMoisture.data);
    for (let d = 0; d < dryDays; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.stepEvent();
      }
    }
    return {
      moistureAfterWet,
      moistureAfterDry: meanGrid(world.soilMoisture.data),
      meanPet: meanGrid(world.potentialEt.data),
      meanAet: meanGrid(world.actualEt.data),
      transpiration: world.transpirationLedger,
      soilEvaporation: world.soilEvaporationLedger,
      openWater: world.openWaterEvaporationLedger,
      etTotal: world.etLedger,
      massResidual: world.waterBalanceResidual(),
      precip: world.precipitationLedger,
      hash: world.stateHash(),
    };
  };

  const southBare = runAspect(-4, 0);
  const southVeg = runAspect(-4, 0.8);
  const northBare = runAspect(4, 0);
  const southReplay = runAspect(-4, 0);

  if (southBare.hash !== southReplay.hash) {
    throw new Error(
      `drydown-feedback: south bare must replay (T-001) ${southBare.hash} vs ${southReplay.hash}`,
    );
  }
  if (!(southBare.meanPet > northBare.meanPet)) {
    throw new Error(
      `drydown-feedback: expected south PET (${southBare.meanPet}) > north (${northBare.meanPet})`,
    );
  }
  if (!(southBare.moistureAfterDry < northBare.moistureAfterDry)) {
    throw new Error(
      `drydown-feedback: expected south drier (${southBare.moistureAfterDry}) than north (${northBare.moistureAfterDry})`,
    );
  }
  if (!(southVeg.transpiration > southBare.transpiration)) {
    throw new Error(
      `drydown-feedback: vegetated should transpire more (${southVeg.transpiration} vs ${southBare.transpiration})`,
    );
  }
  const parts =
    southBare.transpiration + southBare.soilEvaporation + southBare.openWater;
  if (Math.abs(parts - southBare.etTotal) > 1e-6) {
    throw new Error(
      `drydown-feedback: ET partitions ${parts} ≠ total ${southBare.etTotal}`,
    );
  }
  const relResidual =
    Math.abs(southBare.massResidual) / Math.max(1, southBare.precip);
  if (relResidual >= 1e-4) {
    throw new Error(
      `drydown-feedback: H-004 residual too large (${southBare.massResidual}, rel=${relResidual})`,
    );
  }

  return {
    scenario: "drydown-feedback",
    records: [
      {
        label: "southBare",
        moistureAfterDry: southBare.moistureAfterDry,
        meanPet: southBare.meanPet,
        etTotal: southBare.etTotal,
        transpiration: southBare.transpiration,
        soilEvaporation: southBare.soilEvaporation,
        massResidual: southBare.massResidual,
        replayMatch: 1,
      },
      {
        label: "southVeg",
        moistureAfterDry: southVeg.moistureAfterDry,
        transpiration: southVeg.transpiration,
        soilEvaporation: southVeg.soilEvaporation,
      },
      {
        label: "northBare",
        moistureAfterDry: northBare.moistureAfterDry,
        meanPet: northBare.meanPet,
      },
      {
        label: "delta",
        petGap: southBare.meanPet - northBare.meanPet,
        moistureGap: northBare.moistureAfterDry - southBare.moistureAfterDry,
        transpirationGap: southVeg.transpiration - southBare.transpiration,
        relResidual,
      },
    ],
  };
}

/**
 * Disturbance recovery: after a wetting pulse, moisture declines toward the
 * pre-pulse dry baseline without growing oscillation (ES-003).
 */
export function probeDisturbanceRecovery(): ProbeResult {
  const world = new WorldState(generateMountain(16, 16, 5, 7));
  // Mild wet-up then long dry settle → dry baseline the pulse must leave and return toward.
  for (let d = 0; d < 4; d++) {
    for (let i = 0; i < config.dailyEventSteps; i++) {
      world.addRain(config.rainDepthPerEvent);
      world.stepEvent();
    }
  }
  for (let d = 0; d < 12; d++) {
    for (let i = 0; i < config.dailyEventSteps; i++) {
      world.stepEvent();
    }
  }
  const baseline = meanGrid(world.soilMoisture.data);

  for (let d = 0; d < 2; d++) {
    for (let i = 0; i < config.dailyEventSteps; i++) {
      world.addRain(config.rainDepthPerEvent * 3);
      world.stepEvent();
    }
  }
  const peak = meanGrid(world.soilMoisture.data);
  if (!(peak > baseline * 1.2)) {
    throw new Error(
      `disturbance-recovery: expected clear pulse (peak=${peak}, baseline=${baseline})`,
    );
  }

  // Recovery target: halfway from peak back to baseline (half-life style).
  const halfTarget = baseline + 0.5 * (peak - baseline);
  let recoveredDay = -1;
  const trajectory: number[] = [peak];
  for (let d = 0; d < 30; d++) {
    for (let i = 0; i < config.dailyEventSteps; i++) {
      world.stepEvent();
    }
    const m = meanGrid(world.soilMoisture.data);
    trajectory.push(m);
    if (recoveredDay < 0 && m <= halfTarget) {
      recoveredDay = d + 1;
    }
  }
  const finalM = trajectory[trajectory.length - 1]!;
  if (recoveredDay < 0) {
    throw new Error(
      `disturbance-recovery: never reached half-recovery target ${halfTarget} (final=${finalM})`,
    );
  }
  // Monotone dry-down: each day ≤ previous + tiny noise.
  let risingDays = 0;
  for (let i = 1; i < trajectory.length; i++) {
    if (trajectory[i]! > trajectory[i - 1]! + 1e-4) risingDays++;
  }
  if (risingDays > 2) {
    throw new Error(
      `disturbance-recovery: moisture rose on ${risingDays} days — oscillation risk`,
    );
  }
  const earlyDrop = trajectory[0]! - trajectory[Math.min(3, trajectory.length - 1)]!;
  const lateDrop =
    trajectory[Math.max(0, trajectory.length - 4)]! -
    trajectory[trajectory.length - 1]!;
  // Late drop should not reverse into growth; allow slowing.
  if (lateDrop < -0.01) {
    throw new Error(
      `disturbance-recovery: late moisture increased (lateDrop=${lateDrop})`,
    );
  }
  const relResidual =
    Math.abs(world.waterBalanceResidual()) /
    Math.max(1, world.precipitationLedger);
  if (relResidual >= 1e-4) {
    throw new Error(
      `disturbance-recovery: residual too large (rel=${relResidual})`,
    );
  }

  return {
    scenario: "disturbance-recovery",
    records: [
      {
        label: "pulse",
        baseline,
        peak,
        halfTarget,
        finalMoisture: finalM,
        recoveredDay,
        earlyDrop,
        lateDrop,
        risingDays,
        relResidual,
        bounded: risingDays <= 2 ? 1 : 0,
      },
    ],
  };
}

/**
 * Slice 12: paired suitable / unsuitable patches under one seed schedule (C-007).
 * Suitable wet hollow earns herb biomass; dry unsuitable patch does not.
 * Same seed + forcing → identical hash (T-001). Continuous establishment (C-003).
 */
export function probeArrivalEarned(): ProbeResult {
  const w = 16;
  const h = 16;
  const make = () => {
    const world = new WorldState(new Grid2D(w, h, 2.5));
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(0);
    world.groundwaterStorage.fill(0);
    // Suitable wet hollow near the edge (high seed pressure + high HSI).
    const sx = 1;
    const sz = 8;
    world.soilMoisture.set(sx, sz, config.soilPorosity);
    world.groundwaterStorage.set(sx, sz, config.hsiGwRefMeters);
    // Unsuitable dry interior cell (zero moisture / GW → HSI 0).
    const ux = 8;
    const uz = 8;
    world.soilMoisture.set(ux, uz, 0);
    world.groundwaterStorage.set(ux, uz, 0);
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    return { world, sx, sz, ux, uz };
  };

  const a = make();
  const b = make();
  const hashMatch = a.world.stateHash() === b.world.stateHash() ? 1 : 0;
  if (hashMatch !== 1) {
    throw new Error("arrival-earned: replay hash mismatch");
  }

  const suitableBiomass = a.world.getHerbBiomass(a.sx, a.sz);
  const unsuitableBiomass = a.world.getHerbBiomass(a.ux, a.uz);
  const suitableHsi = a.world.getHabitatSuitability(a.sx, a.sz);
  const unsuitableHsi = a.world.getHabitatSuitability(a.ux, a.uz);
  const suitableSeed = a.world.getHerbSeedBank(a.sx, a.sz);
  const unsuitableSeed = a.world.getHerbSeedBank(a.ux, a.uz);
  const suitableEst = a.world.getHerbEstablishment(a.sx, a.sz);
  const unsuitableEst = a.world.getHerbEstablishment(a.ux, a.uz);
  const biomassDelta = suitableBiomass - unsuitableBiomass;

  if (!(suitableHsi > 0.5)) {
    throw new Error(`arrival-earned: suitable HSI too low (${suitableHsi})`);
  }
  if (unsuitableHsi !== 0) {
    throw new Error(`arrival-earned: unsuitable HSI expected 0 (got ${unsuitableHsi})`);
  }
  if (!(suitableBiomass > 0.1)) {
    throw new Error(
      `arrival-earned: suitable biomass too low (${suitableBiomass})`,
    );
  }
  if (unsuitableBiomass !== 0) {
    throw new Error(
      `arrival-earned: unsuitable biomass expected 0 (got ${unsuitableBiomass})`,
    );
  }
  if (!(biomassDelta > 0.1)) {
    throw new Error(`arrival-earned: biomass delta too small (${biomassDelta})`);
  }

  let bounded = 1;
  for (let i = 0; i < a.world.herbBiomass.data.length; i++) {
    const v = a.world.herbBiomass.data[i]!;
    if (!Number.isFinite(v) || v < 0 || v > config.herbBiomassMax + 1e-6) {
      bounded = 0;
      break;
    }
  }

  return {
    scenario: "arrival-earned",
    records: [
      {
        label: "suitable",
        hsi: suitableHsi,
        seedBank: suitableSeed,
        establishment: suitableEst,
        biomass: suitableBiomass,
      },
      {
        label: "unsuitable",
        hsi: unsuitableHsi,
        seedBank: unsuitableSeed,
        establishment: unsuitableEst,
        biomass: unsuitableBiomass,
      },
      {
        label: "delta",
        biomassDelta,
        hashMatch,
        bounded,
        earned: biomassDelta > 0.1 && unsuitableBiomass === 0 ? 1 : 0,
      },
    ],
  };
}

/**
 * Slice 13 / E-005: earned herb biomass changes storm response with veg.cover held at 0.
 * Twins share geometry (matched seed field); only HSI / biomass differ.
 */
export function probeLivingHollow(): ProbeResult {
  const establishThenIsolate = (
    terrain: Grid2D,
    suitable: boolean,
    closedBoundary: boolean,
  ): WorldState => {
    const world = new WorldState(terrain.clone(), { closedBoundary });
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    if (suitable) {
      world.soilMoisture.fill(config.soilPorosity);
      world.groundwaterStorage.fill(config.hsiGwRefMeters);
    } else {
      world.soilMoisture.fill(0);
      world.groundwaterStorage.fill(0);
    }
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    // Isolate herb → physics from daily cover growth (docs/slices/13-composition.md).
    world.soilMoisture.fill(0);
    world.vegCover.fill(0);
    world.runVegetationStep(1);
    world.runSoilWaterStep(1);
    return world;
  };

  const w = 16;
  const h = 8;
  const ramp = new Grid2D(w, h);
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      ramp.set(x, z, (w - 1 - x) * 0.4);
    }
  }

  const colonizedFlux = establishThenIsolate(ramp, true, true);
  const bareFlux = establishThenIsolate(ramp, false, true);
  const colonizedReplay = establishThenIsolate(ramp, true, true);
  const hashMatch =
    colonizedFlux.stateHash() === colonizedReplay.stateHash() ? 1 : 0;
  if (hashMatch !== 1) {
    throw new Error("living-hollow: replay hash mismatch");
  }

  const meanBiomass = (world: WorldState): number => {
    let s = 0;
    for (let i = 0; i < world.herbBiomass.data.length; i++) {
      s += world.herbBiomass.data[i]!;
    }
    return s / world.herbBiomass.data.length;
  };

  const colonizedBiomass = meanBiomass(colonizedFlux);
  const bareBiomass = meanBiomass(bareFlux);
  if (!(colonizedBiomass > 0.1)) {
    throw new Error(
      `living-hollow: colonized biomass too low (${colonizedBiomass})`,
    );
  }
  if (bareBiomass !== 0) {
    throw new Error(
      `living-hollow: bare biomass expected 0 (got ${bareBiomass})`,
    );
  }

  const runFlux = (world: WorldState): ProbeRecord => {
    world.water.fill(0);
    for (let z = 0; z < h; z++) {
      world.water.set(0, z, 0.5);
    }
    for (let i = 0; i < 40; i++) {
      world.runSurfaceWaterStep(config.eventFluxDt);
    }
    return {
      cover: world.vegCover.get(0, 0),
      biomass: meanBiomass(world),
      downslope: world.water.get(w - 1, (h / 2) | 0),
      roughness: world.surfaceRoughness.get(0, 0),
    };
  };

  const colonizedFluxRec = runFlux(colonizedFlux);
  const bareFluxRec = runFlux(bareFlux);
  const bareDown = Number(bareFluxRec.downslope);
  const colonizedDown = Number(colonizedFluxRec.downslope);
  if (!(bareDown > colonizedDown)) {
    throw new Error(
      `living-hollow: expected bare downslope (${bareDown}) > colonized (${colonizedDown})`,
    );
  }

  const flat = new Grid2D(12, 12, 1);
  const colonizedSoil = establishThenIsolate(flat, true, false);
  const bareSoil = establishThenIsolate(flat, false, false);
  colonizedSoil.water.fill(0.4);
  bareSoil.water.fill(0.4);
  colonizedSoil.infiltrationLedger = 0;
  bareSoil.infiltrationLedger = 0;
  colonizedSoil.runSoilWaterStep(1);
  bareSoil.runSoilWaterStep(1);
  const colonizedInfil = colonizedSoil.infiltrationLedger;
  const bareInfil = bareSoil.infiltrationLedger;
  if (!(colonizedInfil > bareInfil)) {
    throw new Error(
      `living-hollow: expected colonized infil (${colonizedInfil}) > bare (${bareInfil})`,
    );
  }

  let bounded = 1;
  for (let i = 0; i < colonizedFlux.herbBiomass.data.length; i++) {
    const v = colonizedFlux.herbBiomass.data[i]!;
    if (!Number.isFinite(v) || v < 0 || v > config.herbBiomassMax + 1e-6) {
      bounded = 0;
      break;
    }
  }

  const coverHeld =
    Number(colonizedFluxRec.cover) === 0 && Number(bareFluxRec.cover) === 0
      ? 1
      : 0;

  return {
    scenario: "living-hollow",
    records: [
      {
        label: "colonized",
        ...colonizedFluxRec,
        infiltrated: colonizedInfil,
      },
      {
        label: "bare",
        ...bareFluxRec,
        infiltrated: bareInfil,
      },
      {
        label: "delta",
        biomassDelta: colonizedBiomass - bareBiomass,
        downslopeDelta: bareDown - colonizedDown,
        infilDelta: colonizedInfil - bareInfil,
        hashMatch,
        bounded,
        coverHeld,
        earned:
          colonizedBiomass > 0.1 &&
          bareBiomass === 0 &&
          bareDown > colonizedDown &&
          colonizedInfil > bareInfil
            ? 1
            : 0,
      },
    ],
  };
}

/**
 * Slice 14 / G-002 — paired meeting vs failing preserve under one authored
 * criterion window. Evaluator is observer-only (T-006); G-007 shapes stored.
 */
/**
 * Slice 16 / C-015 — island drains to ocean; mass closes; shoreline + habitats readable.
 * Opt-in seaLevel only — does not touch legacy golden hashes.
 */
export function probeIslandDrainage(): ProbeResult {
  const size = 48;
  const sea = DEFAULT_SEA_LEVEL_METERS;
  const seed = 29;

  const run = (seaLevel: number) => {
    const world = new WorldState(generateIsland(size, size, 10, seed), {
      seaLevel,
    });
    const t0 = performance.now();
    for (let d = 0; d < 4; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.addRain(config.rainDepthPerEvent * 2);
        world.stepEvent();
      }
    }
    const stepMsMean = (performance.now() - t0) / (4 * config.dailyEventSteps);
    const relResidual =
      Math.abs(world.waterBalanceResidual()) /
      Math.max(1, world.precipitationLedger);
    const shore = world.shorelineCellCount();
    const ocean = world.oceanCellCount();
    const land = size * size - ocean;
    // Habitat zones proxy: wet hollow (high moisture land) vs dry ridge vs shore band.
    let wetLand = 0;
    let dryLand = 0;
    for (let i = 0; i < world.soilMoisture.data.length; i++) {
      if (world.oceanCells.has(i)) continue;
      const m = world.soilMoisture.data[i]!;
      if (m > 0.2) wetLand++;
      else dryLand++;
    }
    const habitatZones =
      (ocean > 0 ? 1 : 0) + (shore > 0 ? 1 : 0) + (wetLand > 0 ? 1 : 0) + (dryLand > 0 ? 1 : 0);
    return {
      hash: world.stateHash(),
      precip: world.precipitationLedger,
      oceanExchange: world.oceanExchangeLedger,
      massResidual: world.waterBalanceResidual(),
      relResidual,
      oceanCells: ocean,
      shorelineCells: shore,
      landCells: land,
      habitatZones,
      stepMsMean,
      shoreFrac: shorelineEncodingDelta(size, size, world.terrain.data, seaLevel),
    };
  };

  const midA = run(sea);
  const midB = run(sea);
  const high = run(3.5);

  if (midA.hash !== midB.hash) {
    throw new Error(
      `island-drainage: replay hash mismatch (T-001) ${midA.hash} vs ${midB.hash}`,
    );
  }
  if (!(midA.oceanExchange > 0)) {
    throw new Error("island-drainage: expected positive ocean exchange");
  }
  if (midA.relResidual >= 1e-4) {
    throw new Error(
      `island-drainage: H-004 residual too large (rel=${midA.relResidual})`,
    );
  }
  if (!(high.oceanCells > midA.oceanCells)) {
    throw new Error("island-drainage: higher sea should flood more cells");
  }
  if (midA.habitatZones < 3) {
    throw new Error(
      `island-drainage: expected ≥3 habitat zones (got ${midA.habitatZones})`,
    );
  }

  // Optional larger grid timing sample (document, do not fail gate on wall clock).
  const big = new WorldState(generateIsland(64, 64, 10, seed), { seaLevel: sea });
  const tBig = performance.now();
  for (let i = 0; i < 24; i++) {
    big.addRain(config.rainDepthPerEvent);
    big.stepEvent();
  }
  const stepMs64 = (performance.now() - tBig) / 24;

  return {
    scenario: "island-drainage",
    records: [
      {
        label: "mid",
        oceanExchange: midA.oceanExchange,
        precip: midA.precip,
        massResidual: midA.massResidual,
        relResidual: midA.relResidual,
        oceanCells: midA.oceanCells,
        shorelineCells: midA.shorelineCells,
        habitatZones: midA.habitatZones,
        shoreFrac: midA.shoreFrac,
        stepMsMean: midA.stepMsMean,
        replayMatch: 1,
        hashN: Number.parseInt(midA.hash.slice(0, 8), 16),
      },
      {
        label: "high",
        oceanCells: high.oceanCells,
        shorelineCells: high.shorelineCells,
        oceanExchange: high.oceanExchange,
      },
      {
        label: "delta",
        oceanCellDelta: high.oceanCells - midA.oceanCells,
        conserved: midA.relResidual < 1e-4 ? 1 : 0,
        habitatMosaic: midA.habitatZones >= 3 ? 1 : 0,
        stepMs64,
      },
    ],
  };
}

/**
 * Slice 17 / C-016 — MHW/MLW envelope grows intertidal monotonically;
 * same envelope → identical hash; no per-event tidal phase. Sea hydrology unchanged.
 */
export function probeTidalEnvelope(): ProbeResult {
  const size = 48;
  const sea = DEFAULT_SEA_LEVEL_METERS;
  const seed = 31;

  const run = (amplitude: number) => {
    const world = new WorldState(generateIsland(size, size, 10, seed), {
      seaLevel: sea,
      tidalAmplitude: amplitude,
    });
    const before = world.intertidalCellCount();
    for (let i = 0; i < 8; i++) world.stepEvent();
    if (world.intertidalCellCount() !== before) {
      throw new Error("tidal-envelope: intertidal changed across stepEvent (phase leak)");
    }
    const mhw = world.meanHighWater!;
    const mlw = world.meanLowWater!;
    return {
      hash: world.stateHash(),
      intertidalCells: before,
      mhw,
      mlw,
      amplitude,
      foreshoreFrac: foreshoreEncodingFrac(world.terrain.data, sea, mhw),
      oceanCells: world.oceanCellCount(),
      encodingDelta: intertidalEncodingDelta(config.soilPorosity),
    };
  };

  const off = run(0);
  const neap = run(tideById("neap").amplitudeMeters);
  const mean = run(tideById("mean").amplitudeMeters);
  const spring = run(tideById("spring").amplitudeMeters);
  const meanB = run(tideById("mean").amplitudeMeters);

  if (mean.hash !== meanB.hash) {
    throw new Error(
      `tidal-envelope: replay hash mismatch (T-001) ${mean.hash} vs ${meanB.hash}`,
    );
  }
  if (off.intertidalCells !== 0) {
    throw new Error(
      `tidal-envelope: tide off should have 0 intertidal (got ${off.intertidalCells})`,
    );
  }
  if (!(neap.intertidalCells < mean.intertidalCells)) {
    throw new Error(
      `tidal-envelope: neap (${neap.intertidalCells}) should be < mean (${mean.intertidalCells})`,
    );
  }
  if (!(mean.intertidalCells < spring.intertidalCells)) {
    throw new Error(
      `tidal-envelope: mean (${mean.intertidalCells}) should be < spring (${spring.intertidalCells})`,
    );
  }
  if (!(spring.foreshoreFrac > neap.foreshoreFrac)) {
    throw new Error("tidal-envelope: foreshore fraction should grow with amplitude");
  }
  if (!(spring.encodingDelta > 0.08)) {
    throw new Error(
      `tidal-envelope: Tier-P intertidal tint too weak (${spring.encodingDelta})`,
    );
  }
  // Ocean outlet unchanged by tide envelope (C-015).
  if (off.oceanCells !== spring.oceanCells) {
    throw new Error("tidal-envelope: tide must not change ocean cell count");
  }

  return {
    scenario: "tidal-envelope",
    records: [
      {
        label: "off",
        intertidalCells: off.intertidalCells,
        oceanCells: off.oceanCells,
      },
      {
        label: "neap",
        intertidalCells: neap.intertidalCells,
        foreshoreFrac: neap.foreshoreFrac,
        mhw: neap.mhw,
        mlw: neap.mlw,
      },
      {
        label: "mean",
        intertidalCells: mean.intertidalCells,
        foreshoreFrac: mean.foreshoreFrac,
        replayMatch: 1,
        hashN: Number.parseInt(mean.hash.slice(0, 8), 16),
        encodingDelta: mean.encodingDelta,
      },
      {
        label: "spring",
        intertidalCells: spring.intertidalCells,
        foreshoreFrac: spring.foreshoreFrac,
        mhw: spring.mhw,
        mlw: spring.mlw,
      },
      {
        label: "delta",
        neapToMean: mean.intertidalCells - neap.intertidalCells,
        meanToSpring: spring.intertidalCells - mean.intertidalCells,
        foreshoreGrew: spring.foreshoreFrac > neap.foreshoreFrac ? 1 : 0,
        oceanUnchanged: off.oceanCells === spring.oceanCells ? 1 : 0,
        encodingFloor: mean.encodingDelta > 0.08 ? 1 : 0,
      },
    ],
  };
}

/**
 * Slice 18 / C-017 — fetch × wind exposure; coastal retreat inside geomorphology
 * only (no SWE / no second sediment writer). Windward vs leeward diverge.
 */
export function probeShoreExposure(): ProbeResult {
  const size = 40;
  const sea = DEFAULT_SEA_LEVEL_METERS;
  const seed = 19;
  const bands = 12;

  const run = (windId: WindId) => {
    const wind = windById(windId);
    const world = new WorldState(generateIsland(size, size, 10, seed), {
      seaLevel: sea,
      windUx: wind.ux,
      windUz: wind.uz,
    });
    world.soilDepth.fill(1.2);
    world.vegCover.fill(0);
    const elev0 = world.terrain.data.slice();
    const depth0 = world.soilDepth.data.slice();
    const mid = (size / 2) | 0;
    const westShore: number[] = [];
    const eastShore: number[] = [];
    for (let i = 0; i < elev0.length; i++) {
      if (world.oceanCells.has(i)) continue;
      const x = i % size;
      const z = (i / size) | 0;
      const nbs = [
        z > 0 ? i - size : -1,
        z < size - 1 ? i + size : -1,
        x > 0 ? i - 1 : -1,
        x < size - 1 ? i + 1 : -1,
      ];
      if (!nbs.some((ni) => ni >= 0 && world.oceanCells.has(ni))) continue;
      if (x < mid) westShore.push(i);
      else eastShore.push(i);
    }
    const meanExpWest = meanExposure(world.shoreExposure.data, (i) =>
      westShore.includes(i),
    );
    const meanExpEast = meanExposure(world.shoreExposure.data, (i) =>
      eastShore.includes(i),
    );
    for (let n = 0; n < bands; n++) world.runGeomorphologyStep(1);
    const meanLoss = (cells: number[]) => {
      if (cells.length === 0) return 0;
      let s = 0;
      for (const i of cells) s += elev0[i]! - world.terrain.data[i]!;
      return s / cells.length;
    };
    let bedrockOk = 1;
    for (let i = 0; i < elev0.length; i++) {
      if (elev0[i]! < sea) continue;
      const dElev = elev0[i]! - world.terrain.data[i]!;
      const dDepth = depth0[i]! - world.soilDepth.data[i]!;
      if (Math.abs(dElev - dDepth) > 1e-6) bedrockOk = 0;
    }
    return {
      hash: world.stateHash(),
      westLoss: meanLoss(westShore),
      eastLoss: meanLoss(eastShore),
      meanExpWest,
      meanExpEast,
      shoreErosion: world.shoreErosionLedger,
      bedrockOk,
    };
  };

  const west = run("west");
  const east = run("east");
  const westB = run("west");

  if (west.hash !== westB.hash) {
    throw new Error(
      `shore-exposure: replay hash mismatch (T-001) ${west.hash} vs ${westB.hash}`,
    );
  }
  if (west.hash === east.hash) {
    throw new Error("shore-exposure: opposite winds produced identical hashes");
  }
  if (!(west.westLoss > west.eastLoss)) {
    throw new Error(
      `shore-exposure: west wind should cut west shore more (W=${west.westLoss} E=${west.eastLoss})`,
    );
  }
  if (!(east.eastLoss > east.westLoss)) {
    throw new Error(
      `shore-exposure: east wind should cut east shore more (W=${east.westLoss} E=${east.eastLoss})`,
    );
  }
  if (!(west.meanExpWest > west.meanExpEast)) {
    throw new Error("shore-exposure: west wind should expose west shore more");
  }
  if (west.bedrockOk !== 1) {
    throw new Error("shore-exposure: bedrock invariant failed (Δelev ≠ Δdepth)");
  }
  if (!(west.shoreErosion > 0)) {
    throw new Error("shore-exposure: expected positive shore erosion ledger");
  }

  return {
    scenario: "shore-exposure",
    records: [
      {
        label: "west",
        westLoss: west.westLoss,
        eastLoss: west.eastLoss,
        meanExpWest: west.meanExpWest,
        meanExpEast: west.meanExpEast,
        shoreErosion: west.shoreErosion,
        bedrockOk: west.bedrockOk,
        replayMatch: 1,
        hashN: Number.parseInt(west.hash.slice(0, 8), 16),
      },
      {
        label: "east",
        westLoss: east.westLoss,
        eastLoss: east.eastLoss,
        meanExpWest: east.meanExpWest,
        meanExpEast: east.meanExpEast,
        shoreErosion: east.shoreErosion,
        hashN: Number.parseInt(east.hash.slice(0, 8), 16),
      },
      {
        label: "delta",
        hashDiverged: west.hash !== east.hash ? 1 : 0,
        westWindwardBias: west.westLoss - west.eastLoss,
        eastWindwardBias: east.eastLoss - east.westLoss,
        bedrockClosed: west.bedrockOk,
        noSwe: 1,
      },
    ],
  };
}

/**
 * Slice 19 / C-017 — longshore lee deposit: windward scours, lee receives
 * under one wind; mass closes via bedrock + ocean ledger. No SWE / no second writer.
 */
export function probeLongshoreDrift(): ProbeResult {
  const size = 40;
  const sea = DEFAULT_SEA_LEVEL_METERS;
  const seed = 19;
  const bands = 12;

  const run = (windId: WindId) => {
    const wind = windById(windId);
    const world = new WorldState(generateIsland(size, size, 10, seed), {
      seaLevel: sea,
      windUx: wind.ux,
      windUz: wind.uz,
    });
    world.soilDepth.fill(1.2);
    world.vegCover.fill(0);
    const elev0 = world.terrain.data.slice();
    const depth0 = world.soilDepth.data.slice();
    const mid = (size / 2) | 0;
    const westShore: number[] = [];
    const eastShore: number[] = [];
    for (let i = 0; i < elev0.length; i++) {
      if (world.oceanCells.has(i)) continue;
      const x = i % size;
      const z = (i / size) | 0;
      const nbs = [
        z > 0 ? i - size : -1,
        z < size - 1 ? i + size : -1,
        x > 0 ? i - 1 : -1,
        x < size - 1 ? i + 1 : -1,
      ];
      if (!nbs.some((ni) => ni >= 0 && world.oceanCells.has(ni))) continue;
      if (x < mid) westShore.push(i);
      else eastShore.push(i);
    }
    for (let n = 0; n < bands; n++) world.runGeomorphologyStep(1);
    const meanDelta = (cells: number[]) => {
      if (cells.length === 0) return 0;
      let s = 0;
      for (const i of cells) s += world.terrain.data[i]! - elev0[i]!;
      return s / cells.length;
    };
    let bedrockOk = 1;
    let soil0 = 0;
    let soil1 = 0;
    for (let i = 0; i < elev0.length; i++) {
      if (elev0[i]! < sea) continue;
      soil0 += depth0[i]!;
      soil1 += world.soilDepth.data[i]!;
      const dElev = world.terrain.data[i]! - elev0[i]!;
      const dDepth = world.soilDepth.data[i]! - depth0[i]!;
      if (Math.abs(dElev - dDepth) > 1e-6) bedrockOk = 0;
    }
    return {
      hash: world.stateHash(),
      westDelta: meanDelta(westShore),
      eastDelta: meanDelta(eastShore),
      shoreErosion: world.shoreErosionLedger,
      bedrockOk,
      soilDelta: soil1 - soil0,
    };
  };

  const west = run("west");
  const east = run("east");
  const calm = run("calm");
  const westB = run("west");

  if (west.hash !== westB.hash) {
    throw new Error(
      `longshore-drift: replay hash mismatch (T-001) ${west.hash} vs ${westB.hash}`,
    );
  }
  if (west.hash === east.hash) {
    throw new Error("longshore-drift: opposite winds produced identical hashes");
  }
  if (!(west.westDelta < calm.westDelta)) {
    throw new Error(
      `longshore-drift: west wind should scour west vs calm (W=${west.westDelta} calm=${calm.westDelta})`,
    );
  }
  if (!(west.eastDelta > calm.eastDelta)) {
    throw new Error(
      `longshore-drift: west wind should feed east vs calm (E=${west.eastDelta} calm=${calm.eastDelta})`,
    );
  }
  if (!(east.westDelta > calm.westDelta)) {
    throw new Error(
      `longshore-drift: east wind should feed west vs calm (W=${east.westDelta} calm=${calm.westDelta})`,
    );
  }
  if (west.bedrockOk !== 1) {
    throw new Error("longshore-drift: bedrock invariant failed (Δelev ≠ Δdepth)");
  }
  if (!(west.shoreErosion > 0)) {
    throw new Error("longshore-drift: expected positive ocean share in shore ledger");
  }

  return {
    scenario: "longshore-drift",
    records: [
      {
        label: "west",
        westDelta: west.westDelta,
        eastDelta: west.eastDelta,
        shoreErosion: west.shoreErosion,
        bedrockOk: west.bedrockOk,
        soilDelta: west.soilDelta,
        replayMatch: 1,
        hashN: Number.parseInt(west.hash.slice(0, 8), 16),
      },
      {
        label: "east",
        westDelta: east.westDelta,
        eastDelta: east.eastDelta,
        shoreErosion: east.shoreErosion,
        hashN: Number.parseInt(east.hash.slice(0, 8), 16),
      },
      {
        label: "calm",
        westDelta: calm.westDelta,
        eastDelta: calm.eastDelta,
        shoreErosion: calm.shoreErosion,
      },
      {
        label: "delta",
        hashDiverged: west.hash !== east.hash ? 1 : 0,
        westLeeGain: west.eastDelta - calm.eastDelta,
        eastLeeGain: east.westDelta - calm.westDelta,
        westWindwardLoss: calm.westDelta - west.westDelta,
        bedrockClosed: west.bedrockOk,
        noSwe: 1,
      },
    ],
  };
}

/**
 * Slice F / C-020 lite — climate-mean rain + opposite winds → divergent
 * wet/dry sides; mean precip tracks regime; mass closes. No cell targeting.
 */
export function probeOrographicWind(): ProbeResult {
  const w = 40;
  const h = 24;
  const seedPeak = 12;
  const regime = rainRegimeById("moderate");
  // Real-scale means need more than one cartoon day for wet/dry sides to encode.
  const days = regime.cycleDays * 3;
  const base = rainDepthForRegime(
    regime,
    config.rainDepthPerEvent,
    config.dailyEventSteps,
  );
  const depths = new Float32Array(w * h);

  const ridge = () => {
    const g = new Grid2D(w, h);
    const mid = (w - 1) * 0.5;
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        g.set(
          x,
          z,
          Math.max(0.5, seedPeak - Math.abs(x - mid) * (seedPeak / mid)),
        );
      }
    }
    return g;
  };

  const run = (windId: WindId) => {
    const world = new WorldState(ridge(), { closedBoundary: true });
    const wind = windById(windId);
    for (let d = 0; d < days; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        if (
          base > 0 &&
          regimeRainsThisEvent(regime, i, config.dailyEventSteps, d)
        ) {
          fillOrographicRainDepths(
            depths,
            world.terrain.data,
            w,
            h,
            base,
            wind,
            config.orographicGamma,
            () => false,
          );
          world.addRainField(depths);
        }
        world.stepEvent();
      }
    }
    let leftSoil = 0;
    let rightSoil = 0;
    let nL = 0;
    let nR = 0;
    const half = (w / 2) | 0;
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        const idx = z * w + x;
        const m = world.soilMoisture.data[idx]!;
        if (x < half) {
          leftSoil += m;
          nL++;
        } else {
          rightSoil += m;
          nR++;
        }
      }
    }
    const leftMean = leftSoil / Math.max(1, nL);
    const rightMean = rightSoil / Math.max(1, nR);
    const relResidual =
      Math.abs(world.waterBalanceResidual()) /
      Math.max(1, world.precipitationLedger);
    return {
      hash: world.stateHash(),
      precip: world.precipitationLedger,
      relResidual,
      leftMean,
      rightMean,
      sideEncoding: Math.abs(
        soilEncodingDelta(leftMean, rightMean, config.soilPorosity),
      ),
    };
  };

  const westA = run("west");
  const westB = run("west");
  const east = run("east");
  const calm = run("calm");

  if (westA.hash !== westB.hash) {
    throw new Error(
      `orographic-wind: same wind must match (T-001) ${westA.hash} vs ${westB.hash}`,
    );
  }
  if (westA.hash === east.hash) {
    throw new Error(
      "orographic-wind: opposite winds produced identical hashes",
    );
  }
  if (westA.relResidual >= 1e-4) {
    throw new Error(
      `orographic-wind: H-004 residual too large (rel=${westA.relResidual})`,
    );
  }
  const precipRatio = westA.precip / Math.max(1e-9, calm.precip);
  if (precipRatio < 0.85 || precipRatio > 1.15) {
    throw new Error(
      `orographic-wind: precip should track climate mean (west/calm=${precipRatio})`,
    );
  }
  if (!(westA.leftMean > westA.rightMean)) {
    throw new Error(
      `orographic-wind: west wind should wet west face (L=${westA.leftMean} R=${westA.rightMean})`,
    );
  }
  const encoding = Math.max(westA.sideEncoding, east.sideEncoding);
  if (encoding < 0.05) {
    throw new Error(
      `orographic-wind: wet/dry side soil encoding too weak (${encoding})`,
    );
  }

  return {
    scenario: "orographic-wind",
    records: [
      {
        label: "west",
        precip: westA.precip,
        relResidual: westA.relResidual,
        sideEncoding: westA.sideEncoding,
        replayMatch: 1,
        hashN: Number.parseInt(westA.hash.slice(0, 8), 16),
      },
      {
        label: "east",
        precip: east.precip,
        sideEncoding: east.sideEncoding,
        hashN: Number.parseInt(east.hash.slice(0, 8), 16),
      },
      {
        label: "delta",
        hashDiverged: westA.hash !== east.hash ? 1 : 0,
        precipRatio,
        conserved: westA.relResidual < 1e-4 ? 1 : 0,
        encodingFloor: encoding >= 0.05 ? 1 : 0,
        calmPrecip: calm.precip,
      },
    ],
  };
}

export function probeScenarioWindow(): ProbeResult {
  const def = livingHollowObjective({
    threshold: 0.5,
    lengthDays: 3,
    entryDays: 1,
    exitDays: 2,
  });

  const runTwin = (biomass: number) => {
    const world = new WorldState(new Grid2D(8, 8, 1));
    world.herbBiomass.fill(biomass);
    const hashBefore = world.stateHash();
    const session = new ScenarioSession(def);
    const reader = criterionReaderFromWorld(world);
    for (let day = 1; day <= 5; day++) {
      const t = day * config.dailyEventSteps * config.eventDtMinutes;
      session.sampleNow({ ...reader, simMinutes: t });
    }
    const hashAfter = world.stateHash();
    const o = session.outcome();
    return {
      worldHashMatch: hashBefore === hashAfter ? 1 : 0,
      satisfied: o.currentlySatisfied ? 1 : 0,
      achieved: o.achievedAtSimMinutes !== null ? 1 : 0,
      achievedAt: o.achievedAtSimMinutes ?? -1,
      rollingMet: o.rollingMet ? 1 : 0,
      samples: o.samplesTaken,
      outcomeHash: session.outcomeHash(),
    };
  };

  const meetA = runTwin(2);
  const meetB = runTwin(2);
  const fail = runTwin(0);

  if (meetA.outcomeHash !== meetB.outcomeHash) {
    throw new Error("scenario-window: replay outcome hash mismatch");
  }
  if (!(meetA.satisfied === 1 && meetA.achieved === 1)) {
    throw new Error("scenario-window: meet twin should satisfy window");
  }
  if (!(fail.satisfied === 0 && fail.achieved === 0)) {
    throw new Error("scenario-window: fail twin should not satisfy");
  }
  if (meetA.worldHashMatch !== 1 || fail.worldHashMatch !== 1) {
    throw new Error("scenario-window: evaluator mutated WorldState");
  }

  // Encode outcome hash as stable numeric for baseline (djb2 over chars).
  let hashNum = 5381;
  for (let i = 0; i < meetA.outcomeHash.length; i++) {
    hashNum = ((hashNum << 5) + hashNum + meetA.outcomeHash.charCodeAt(i)) | 0;
  }

  return {
    scenario: "scenario-window",
    records: [
      {
        label: "meet",
        satisfied: meetA.satisfied,
        achieved: meetA.achieved,
        achievedAt: meetA.achievedAt,
        rollingMet: meetA.rollingMet,
        samples: meetA.samples,
        worldHashMatch: meetA.worldHashMatch,
      },
      {
        label: "fail",
        satisfied: fail.satisfied,
        achieved: fail.achieved,
        achievedAt: fail.achievedAt,
        rollingMet: fail.rollingMet,
        samples: fail.samples,
        worldHashMatch: fail.worldHashMatch,
      },
      {
        label: "delta",
        hashMatch: meetA.outcomeHash === meetB.outcomeHash ? 1 : 0,
        pairedDiverge: meetA.outcomeHash !== fail.outcomeHash ? 1 : 0,
        writeIsolated:
          meetA.worldHashMatch === 1 && fail.worldHashMatch === 1 ? 1 : 0,
        outcomeHashNum: hashNum,
      },
    ],
  };
}

function meanGrid(data: Float32Array): number {
  return sumGrid(data) / data.length;
}

function sumGrid(data: Float32Array): number {
  let s = 0;
  for (let i = 0; i < data.length; i++) s += data[i]!;
  return s;
}

function sectorMean(
  data: Float32Array,
  stride: number,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
): number {
  let sum = 0;
  let n = 0;
  for (let z = z0; z < z1; z++) {
    for (let x = x0; x < x1; x++) {
      sum += data[z * stride + x]!;
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

/**
 * Slice 20 / C-018 — paired freshened vs salty hollow under one seed schedule.
 * Salty twin is salt-limited and earns less herb biomass; water residual
 * stays finite (no separate salt ledger). Save-legacy covered in unit tests.
 */
export function probeSalinityArrival(): ProbeResult {
  const w = 16;
  const h = 16;
  const sx = 1;
  const sz = 8;

  const make = (salinity: number) => {
    const world = new WorldState(new Grid2D(w, h, 2.5));
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(salinity);
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    return world;
  };

  const freshA = make(0);
  const freshB = make(0);
  const salty = make(0.85);

  const replayMatch =
    freshA.stateHash() === freshB.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("salinity-arrival: freshened replay hash mismatch");
  }

  const freshHsi = freshA.getHabitatSuitability(sx, sz);
  const saltyHsi = salty.getHabitatSuitability(sx, sz);
  const freshBiomass = freshA.getHerbBiomass(sx, sz);
  const saltyBiomass = salty.getHerbBiomass(sx, sz);
  const freshLim = freshA.getLimitingFactor(sx, sz);
  const saltyLim = salty.getLimitingFactor(sx, sz);
  const biomassDelta = freshBiomass - saltyBiomass;
  // Residual class: salinity must not invent a salt mass term — twins match.
  const residualFresh = freshA.waterBalanceResidual();
  const residualSalty = salty.waterBalanceResidual();
  const residualMatch =
    Math.abs(residualFresh - residualSalty) < 1e-9 ? 1 : 0;

  if (!(freshHsi > saltyHsi)) {
    throw new Error(
      `salinity-arrival: expected fresh HSI (${freshHsi}) > salty (${saltyHsi})`,
    );
  }
  if (saltyLim !== LIMITING_SALINITY) {
    throw new Error(
      `salinity-arrival: expected salty limiting=salinity (got ${saltyLim})`,
    );
  }
  if (!(freshBiomass > 0.1)) {
    throw new Error(
      `salinity-arrival: freshened biomass too low (${freshBiomass})`,
    );
  }
  if (!(biomassDelta > 0.05)) {
    throw new Error(
      `salinity-arrival: biomass delta too small (${biomassDelta})`,
    );
  }
  if (residualMatch !== 1) {
    throw new Error(
      `salinity-arrival: residual diverged fresh=${residualFresh} salty=${residualSalty}`,
    );
  }

  return {
    scenario: "salinity-arrival",
    records: [
      {
        label: "freshened",
        hsi: freshHsi,
        biomass: freshBiomass,
        limiting: freshLim,
        salinity: 0,
      },
      {
        label: "salty",
        hsi: saltyHsi,
        biomass: saltyBiomass,
        limiting: saltyLim,
        salinity: 0.85,
        saltLimited: saltyLim === LIMITING_SALINITY ? 1 : 0,
      },
      {
        label: "delta",
        biomassDelta,
        hsiDelta: freshHsi - saltyHsi,
        replayMatch,
        residualMatch,
        hashN: Number.parseInt(freshA.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * C-004 / C-020 — Heat dial gates herb arrival.
 * Warm twin earns; cold twin is temperature-limited under one seed schedule.
 */
export function probeHeatArrival(): ProbeResult {
  const w = 16;
  const h = 16;
  const sx = 1;
  const sz = 8;

  const make = (heatId: "warm" | "mild" | "cold") => {
    const world = new WorldState(new Grid2D(w, h, 2.5));
    world.setAirTemperature(heatById(heatId).airTempC);
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    return world;
  };

  const warmA = make("warm");
  const warmB = make("warm");
  const cold = make("cold");
  const mild = make("mild");

  const replayMatch =
    warmA.stateHash() === warmB.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("heat-arrival: warm replay hash mismatch");
  }

  const warmHsi = warmA.getHabitatSuitability(sx, sz);
  const coldHsi = cold.getHabitatSuitability(sx, sz);
  const mildHsi = mild.getHabitatSuitability(sx, sz);
  const warmBiomass = warmA.getHerbBiomass(sx, sz);
  const coldBiomass = cold.getHerbBiomass(sx, sz);
  const mildBiomass = mild.getHerbBiomass(sx, sz);
  const coldLim = cold.getLimitingFactor(sx, sz);
  const biomassDelta = warmBiomass - coldBiomass;

  if (!(warmHsi > coldHsi)) {
    throw new Error(
      `heat-arrival: expected warm HSI (${warmHsi}) > cold (${coldHsi})`,
    );
  }
  if (coldLim !== LIMITING_TEMPERATURE) {
    throw new Error(
      `heat-arrival: expected cold limiting=temperature (got ${coldLim})`,
    );
  }
  if (!(warmBiomass > 0.1)) {
    throw new Error(
      `heat-arrival: warm biomass too low (${warmBiomass})`,
    );
  }
  if (!(biomassDelta > 0.05)) {
    throw new Error(
      `heat-arrival: biomass delta too small (${biomassDelta})`,
    );
  }
  if (!(mildHsi > coldHsi && mildHsi < warmHsi + 1e-9)) {
    throw new Error(
      `heat-arrival: mild HSI (${mildHsi}) not between cold and warm`,
    );
  }

  return {
    scenario: "heat-arrival",
    records: [
      {
        label: "warm",
        hsi: warmHsi,
        biomass: warmBiomass,
        limiting: warmA.getLimitingFactor(sx, sz),
        airTempC: heatById("warm").airTempC,
      },
      {
        label: "mild",
        hsi: mildHsi,
        biomass: mildBiomass,
        limiting: mild.getLimitingFactor(sx, sz),
        airTempC: heatById("mild").airTempC,
      },
      {
        label: "cold",
        hsi: coldHsi,
        biomass: coldBiomass,
        limiting: coldLim,
        airTempC: heatById("cold").airTempC,
        tempLimited: coldLim === LIMITING_TEMPERATURE ? 1 : 0,
      },
      {
        label: "delta",
        biomassDelta,
        hsiDelta: warmHsi - coldHsi,
        mildBetween: mildHsi > coldHsi && mildHsi <= warmHsi + 1e-9 ? 1 : 0,
        replayMatch,
        hashN: Number.parseInt(warmA.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * C-018 / Slice N4 — strand vs inland herb under one seed schedule.
 * Salty exposed shore earns strand mats; fresh inland hollow earns herb.
 */
export function probeStrandArrival(): ProbeResult {
  const w = 16;
  const h = 16;
  const shoreX = 1;
  const shoreZ = 4;
  const inlandX = 1;
  const inlandZ = 12;

  const make = () => {
    const world = new WorldState(new Grid2D(w, h, 2.5));
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.shoreExposure.fill(0);
    world.shoreExposure.set(shoreX, shoreZ, 1);
    world.soilSalinity.set(shoreX, shoreZ, 0.85);
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    return world;
  };

  const a = make();
  const b = make();
  const replayMatch = a.stateHash() === b.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("strand-arrival: replay hash mismatch");
  }

  const shoreStrand = a.getStrandBiomass(shoreX, shoreZ);
  const shoreHerb = a.getHerbBiomass(shoreX, shoreZ);
  const inlandHerb = a.getHerbBiomass(inlandX, inlandZ);
  const inlandStrand = a.getStrandBiomass(inlandX, inlandZ);
  const seedMatch =
    Math.abs(
      a.getHerbSeedBank(shoreX, shoreZ) - a.getHerbSeedBank(inlandX, inlandZ),
    ) < 1e-9
      ? 1
      : 0;
  const guildSeedMatch =
    Math.abs(
      a.getStrandSeedBank(shoreX, shoreZ) - a.getHerbSeedBank(shoreX, shoreZ),
    ) < 1e-9
      ? 1
      : 0;
  const shoreGuildDelta = shoreStrand - shoreHerb;
  const inlandGuildDelta = inlandHerb - inlandStrand;

  if (seedMatch !== 1 || guildSeedMatch !== 1) {
    throw new Error("strand-arrival: seed schedule not matched");
  }
  if (!(shoreStrand > 0.1)) {
    throw new Error(`strand-arrival: shore strand too low (${shoreStrand})`);
  }
  if (!(shoreGuildDelta > 0.05)) {
    throw new Error(
      `strand-arrival: shore guild delta too small (${shoreGuildDelta})`,
    );
  }
  if (!(inlandHerb > 0.1)) {
    throw new Error(`strand-arrival: inland herb too low (${inlandHerb})`);
  }
  if (!(inlandGuildDelta > 0.05)) {
    throw new Error(
      `strand-arrival: inland guild delta too small (${inlandGuildDelta})`,
    );
  }
  if (inlandStrand !== 0) {
    throw new Error(
      `strand-arrival: inland strand expected 0 (got ${inlandStrand})`,
    );
  }
  if (a.getLimitingFactor(shoreX, shoreZ) !== LIMITING_SALINITY) {
    throw new Error("strand-arrival: shore herb not salinity-limited");
  }

  return {
    scenario: "strand-arrival",
    records: [
      {
        label: "shore",
        strandBiomass: shoreStrand,
        herbBiomass: shoreHerb,
        salinity: 0.85,
        exposure: 1,
        herbLimiting: a.getLimitingFactor(shoreX, shoreZ),
      },
      {
        label: "inland",
        strandBiomass: inlandStrand,
        herbBiomass: inlandHerb,
        salinity: 0,
        exposure: 0,
        herbLimiting: a.getLimitingFactor(inlandX, inlandZ),
      },
      {
        label: "delta",
        shoreGuildDelta,
        inlandGuildDelta,
        seedMatch,
        guildSeedMatch,
        replayMatch,
        hashN: Number.parseInt(a.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * Slice S / C-009 — sand vs clay under identical storm + slope diverge on
 * infiltration and hillslope erosion; properties from substrates.ts table.
 */
export function probeSubstrateContrast(): ProbeResult {
  const w = 16;
  const h = 16;

  const ramp = (): Grid2D => {
    const t = new Grid2D(w, h);
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        // Steep west→east fall so D8 accumulates toward the east edge.
        t.set(x, z, (w - 1 - x) * 0.55 + z * 0.02);
      }
    }
    return t;
  };

  const make = (material: number) => {
    const world = new WorldState(ramp(), { closedBoundary: true });
    world.soilMaterial.fill(material);
    world.vegCover.fill(0);
    world.soilDepth.fill(config.defaultSoilDepthMeters);
    world.soilMoisture.fill(0);
    world.runVegetationStep(1);
    world.runSoilWaterStep(1);
    return world;
  };

  const sandA = make(SUBSTRATE_SAND);
  const sandB = make(SUBSTRATE_SAND);
  const clay = make(SUBSTRATE_CLAY);

  const replayMatch = sandA.stateHash() === sandB.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("substrate-contrast: sand replay hash mismatch");
  }

  const soak = (world: WorldState) => {
    world.water.fill(0.35);
    world.infiltrationLedger = 0;
    world.runSoilWaterStep(1);
    return world.infiltrationLedger;
  };

  const sandInfil = soak(sandA);
  const clayInfil = soak(clay);

  // Fresh twins for erosion — bare, steep, many bands so K difference accumulates.
  const meanChannelLoss = (world: WorldState): number => {
    const elev0 = Float32Array.from(world.terrain.data);
    for (let n = 0; n < 24; n++) world.runGeomorphologyStep(1);
    world.ensureStructureFresh();
    const acc = world.flowAccumulation;
    if (!acc) return 0;
    const aMin = config.erosionMinAccumulation;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < elev0.length; i++) {
      if (acc[i]! < aMin) continue;
      sum += elev0[i]! - world.terrain.data[i]!;
      count += 1;
    }
    return count > 0 ? sum / count : 0;
  };

  const sandErode = meanChannelLoss(make(SUBSTRATE_SAND));
  const clayErode = meanChannelLoss(make(SUBSTRATE_CLAY));

  const sandProps = substrateProps(SUBSTRATE_SAND);
  const clayProps = substrateProps(SUBSTRATE_CLAY);
  const tableDriven =
    sandProps.infiltrationRate > clayProps.infiltrationRate &&
    sandProps.erosionK > clayProps.erosionK
      ? 1
      : 0;

  if (!(sandInfil > clayInfil)) {
    throw new Error(
      `substrate-contrast: expected sand infil (${sandInfil}) > clay (${clayInfil})`,
    );
  }
  if (!(sandErode > clayErode)) {
    throw new Error(
      `substrate-contrast: expected sand channel loss (${sandErode}) > clay (${clayErode})`,
    );
  }
  if (tableDriven !== 1) {
    throw new Error("substrate-contrast: substrate table ordering broken");
  }

  return {
    scenario: "substrate-contrast",
    records: [
      {
        label: "sand",
        infiltrated: sandInfil,
        erode: sandErode,
        porosity: sandProps.porosity,
        infilRate: sandProps.infiltrationRate,
        erosionK: sandProps.erosionK,
      },
      {
        label: "clay",
        infiltrated: clayInfil,
        erode: clayErode,
        porosity: clayProps.porosity,
        infilRate: clayProps.infiltrationRate,
        erosionK: clayProps.erosionK,
      },
      {
        label: "delta",
        infilDelta: sandInfil - clayInfil,
        erodeDelta: sandErode - clayErode,
        replayMatch,
        tableDriven,
        hashN: Number.parseInt(sandA.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * C-009 geological deposit — sand vs rock ridges under identical storm + slope.
 * Deposit raises elev+depth and stamps material; rock resists washout vs sand.
 */
export function probeSubstrateDeposit(): ProbeResult {
  const w = 16;
  const h = 16;

  const ramp = (): Grid2D => {
    const t = new Grid2D(w, h);
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        t.set(x, z, (w - 1 - x) * 0.55 + z * 0.02);
      }
    }
    return t;
  };

  const makeDeposited = (material: number) => {
    const world = new WorldState(ramp(), { closedBoundary: true });
    world.soilMaterial.fill(0);
    world.vegCover.fill(0);
    world.soilDepth.fill(config.defaultSoilDepthMeters);
    world.soilMoisture.fill(0);
    world.depositSubstrate(8, 8, material, 1.5);
    const stampedAtRidge = world.getSoilMaterial(8, 8);
    // Whole-slope class so infil/erosion laws diverge clearly (GEO-002).
    world.soilMaterial.fill(material);
    world.runVegetationStep(1);
    world.runSoilWaterStep(1);
    return { world, stampedAtRidge };
  };

  const sandA = makeDeposited(SUBSTRATE_SAND);
  const sandB = makeDeposited(SUBSTRATE_SAND);
  const rock = makeDeposited(SUBSTRATE_ROCK);

  const replayMatch =
    sandA.world.stateHash() === sandB.world.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("substrate-deposit: sand replay hash mismatch");
  }

  const stamped =
    sandA.stampedAtRidge === SUBSTRATE_SAND &&
    rock.stampedAtRidge === SUBSTRATE_ROCK
      ? 1
      : 0;
  if (stamped !== 1) {
    throw new Error("substrate-deposit: deposit did not stamp material");
  }

  const soak = (world: WorldState) => {
    world.water.fill(0.35);
    world.infiltrationLedger = 0;
    world.runSoilWaterStep(1);
    return world.infiltrationLedger;
  };

  const sandInfil = soak(sandA.world);
  const rockInfil = soak(rock.world);

  const meanChannelLoss = (world: WorldState): number => {
    const elev0 = Float32Array.from(world.terrain.data);
    for (let n = 0; n < 24; n++) world.runGeomorphologyStep(1);
    world.ensureStructureFresh();
    const acc = world.flowAccumulation;
    if (!acc) return 0;
    const aMin = config.erosionMinAccumulation;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < elev0.length; i++) {
      if (acc[i]! < aMin) continue;
      sum += elev0[i]! - world.terrain.data[i]!;
      count += 1;
    }
    return count > 0 ? sum / count : 0;
  };

  const sandErode = meanChannelLoss(makeDeposited(SUBSTRATE_SAND).world);
  const rockErode = meanChannelLoss(makeDeposited(SUBSTRATE_ROCK).world);

  const sandProps = substrateProps(SUBSTRATE_SAND);
  const rockProps = substrateProps(SUBSTRATE_ROCK);
  const tableDriven =
    sandProps.infiltrationRate > rockProps.infiltrationRate &&
    sandProps.erosionK > rockProps.erosionK
      ? 1
      : 0;

  if (!(sandInfil > rockInfil)) {
    throw new Error(
      `substrate-deposit: expected sand infil (${sandInfil}) > rock (${rockInfil})`,
    );
  }
  if (!(sandErode > rockErode)) {
    throw new Error(
      `substrate-deposit: expected sand channel loss (${sandErode}) > rock (${rockErode})`,
    );
  }
  if (tableDriven !== 1) {
    throw new Error("substrate-deposit: substrate table ordering broken");
  }

  return {
    scenario: "substrate-deposit",
    records: [
      {
        label: "sand",
        infiltrated: sandInfil,
        erode: sandErode,
        porosity: sandProps.porosity,
        infilRate: sandProps.infiltrationRate,
        erosionK: sandProps.erosionK,
        stamped: sandA.stampedAtRidge,
      },
      {
        label: "rock",
        infiltrated: rockInfil,
        erode: rockErode,
        porosity: rockProps.porosity,
        infilRate: rockProps.infiltrationRate,
        erosionK: rockProps.erosionK,
        stamped: rock.stampedAtRidge,
      },
      {
        label: "delta",
        infilDelta: sandInfil - rockInfil,
        erodeDelta: sandErode - rockErode,
        replayMatch,
        tableDriven,
        stamped,
        hashN: Number.parseInt(sandA.world.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * Slice 21 / C-019 — overseas arrival: small vs large island under identical
 * regimes; isolation monotonicity; not mainland-perimeter rain.
 */
export function probeIslandArrival(): ProbeResult {
  const size = 32;
  const sea = 2;
  const isolation = 16;

  const disk = (radius: number): Grid2D => {
    const t = new Grid2D(size, size, 0.5);
    const cx = (size - 1) * 0.5;
    const cz = (size - 1) * 0.5;
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        if (Math.hypot(x - cx, z - cz) <= radius) t.set(x, z, 3);
      }
    }
    return t;
  };

  const firstShore = (world: WorldState): { x: number; z: number } => {
    const shore = computeShorelineCells(
      world.width,
      world.height,
      world.oceanCells,
    );
    for (const i of shore) {
      return { x: i % world.width, z: (i / world.width) | 0 };
    }
    throw new Error("island-arrival: no shoreline");
  };

  const establish = (world: WorldState) => {
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    for (const i of world.oceanCells) {
      world.soilMoisture.data[i] = 0;
      world.groundwaterStorage.data[i] = 0;
    }
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
  };

  const run = (radius: number, isol: number) => {
    const world = new WorldState(disk(radius), {
      seaLevel: sea,
      islandIsolation: isol,
    });
    const sample = firstShore(world);
    establish(world);
    const perimeterWouldBe = seedPressureAt(
      sample.x,
      sample.z,
      world.width,
      world.height,
      config.seedSourceStrength,
      config.seedMeanDistanceCells,
    );
    return {
      world,
      sample,
      landCells: world.landCellCount(),
      sElig: world.eligibleRichness(),
      seed: world.getHerbSeedBank(sample.x, sample.z),
      biomass: world.getHerbBiomass(sample.x, sample.z),
      hsi: world.getHabitatSuitability(sample.x, sample.z),
      perimeterWouldBe,
      notPerimeter:
        Math.abs(world.getHerbSeedBank(sample.x, sample.z) - perimeterWouldBe) >
        1e-6
          ? 1
          : 0,
      oceanSeedZero: [...world.oceanCells].every(
        (i) => world.herbSeedBank.data[i] === 0,
      )
        ? 1
        : 0,
    };
  };

  const smallA = run(4, isolation);
  const smallB = run(4, isolation);
  const large = run(10, isolation);
  const near = run(8, 4);
  const far = run(8, 80);

  const replayMatch =
    smallA.world.stateHash() === smallB.world.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("island-arrival: small-island replay hash mismatch");
  }
  if (!(large.landCells > smallA.landCells)) {
    throw new Error("island-arrival: expected larger land area");
  }
  if (!(large.sElig > smallA.sElig)) {
    throw new Error(
      `island-arrival: expected S_elig large (${large.sElig}) > small (${smallA.sElig})`,
    );
  }
  if (!(large.biomass > smallA.biomass)) {
    throw new Error(
      `island-arrival: expected biomass large (${large.biomass}) > small (${smallA.biomass})`,
    );
  }
  if (!(near.biomass > far.biomass)) {
    throw new Error(
      `island-arrival: expected near biomass (${near.biomass}) > far (${far.biomass})`,
    );
  }
  if (smallA.notPerimeter !== 1 || smallA.oceanSeedZero !== 1) {
    throw new Error(
      "island-arrival: island must not use perimeter rain / ocean seed must be 0",
    );
  }

  return {
    scenario: "island-arrival",
    records: [
      {
        label: "small",
        landCells: smallA.landCells,
        sElig: smallA.sElig,
        seed: smallA.seed,
        biomass: smallA.biomass,
        hsi: smallA.hsi,
        notPerimeter: smallA.notPerimeter,
        oceanSeedZero: smallA.oceanSeedZero,
      },
      {
        label: "large",
        landCells: large.landCells,
        sElig: large.sElig,
        seed: large.seed,
        biomass: large.biomass,
        hsi: large.hsi,
      },
      {
        label: "isolation",
        nearBiomass: near.biomass,
        farBiomass: far.biomass,
        nearSElig: near.sElig,
        farSElig: far.sElig,
        isolationDelta: near.biomass - far.biomass,
      },
      {
        label: "delta",
        landDelta: large.landCells - smallA.landCells,
        sEligDelta: large.sElig - smallA.sElig,
        biomassDelta: large.biomass - smallA.biomass,
        replayMatch,
        hashN: Number.parseInt(smallA.world.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * Full C-020 — atmosphere Process: cloud charges → precip discharges;
 * phase from heat; no cell targeting; mass residual closes; T-001 replay.
 */
export function probeCloudDelivery(): ProbeResult {
  const seed = 42;
  const days = 8;

  const run = (heatId: "warm" | "cold", windUx: number) => {
    const world = new WorldState(generateMountain(24, 24, 6, seed), {
      closedBoundary: true,
      windUx,
      windUz: 0,
    });
    world.setRainRegime("moderate");
    world.setAirTemperature(heatById(heatId).airTempC);
    let peakCloud = 0;
    let maxPhase = 0;
    for (let d = 0; d < days; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.stepEvent();
        peakCloud = Math.max(peakCloud, world.cloudWater);
        maxPhase = Math.max(maxPhase, world.precipPhase);
      }
    }
    const precip = world.precipitationLedger;
    const residual = world.waterBalanceResidual();
    const relResidual =
      precip > 0 ? Math.abs(residual) / Math.max(precip, 1e-9) : Math.abs(residual);
    return {
      world,
      precip,
      peakCloud,
      maxPhase,
      relResidual,
      hash: world.stateHash(),
      hashN: Number.parseInt(world.stateHash().slice(0, 8), 16),
    };
  };

  const warmA = run("warm", 1);
  const warmB = run("warm", 1);
  const cold = run("cold", 1);
  const calm = run("warm", 0);

  if (warmA.hash !== warmB.hash) {
    throw new Error(
      `cloud-delivery: same forcing must match (T-001) ${warmA.hash} vs ${warmB.hash}`,
    );
  }
  if (warmA.precip <= 0 || warmA.peakCloud <= 0) {
    throw new Error(
      `cloud-delivery: expected cloud charge and precip (cloud=${warmA.peakCloud} precip=${warmA.precip})`,
    );
  }
  if (warmA.maxPhase !== 0) {
    throw new Error(
      `cloud-delivery: warm heat should stay rain phase (got ${warmA.maxPhase})`,
    );
  }
  if (cold.maxPhase < 2) {
    throw new Error(
      `cloud-delivery: cold heat should reach snow phase (got ${cold.maxPhase})`,
    );
  }
  if (warmA.relResidual > 1e-4) {
    throw new Error(
      `cloud-delivery: H-004 residual too large (rel=${warmA.relResidual})`,
    );
  }
  // Orographic placement still diverges with wind (calm vs west) under same mean.
  if (Math.abs(warmA.precip - calm.precip) / Math.max(warmA.precip, 1e-9) > 0.15) {
    throw new Error(
      `cloud-delivery: precip should track climate mean (west/calm ratio drifted)`,
    );
  }

  return {
    scenario: "cloud-delivery",
    records: [
      {
        label: "warm",
        precip: warmA.precip,
        peakCloud: warmA.peakCloud,
        phase: warmA.maxPhase,
        relResidual: warmA.relResidual,
        replayMatch: 1,
        hashN: warmA.hashN,
      },
      {
        label: "cold",
        precip: cold.precip,
        peakCloud: cold.peakCloud,
        phase: cold.maxPhase,
        hashN: cold.hashN,
      },
      {
        label: "delta",
        phaseDiverged: cold.maxPhase > warmA.maxPhase ? 1 : 0,
        conserved: warmA.relResidual <= 1e-4 ? 1 : 0,
        precipRatio: warmA.precip / Math.max(calm.precip, 1e-9),
      },
    ],
  };
}

const SCENARIOS: Record<string, () => ProbeResult> = {
  "paired-storm": probePairedStorm,
  "berm-reroute": probeBermReroute,
  "basin-fill": probeBasinFill,
  "deep-time": probeDeepTime,
  "baseflow-persist": probeBaseflowPersist,
  "regime-divergence": probeRegimeDivergence,
  "limiting-shift": probeLimitingShift,
  "burn-recover": probeBurnRecover,
  "succession-diverge": probeSuccessionDiverge,
  "drydown-feedback": probeDrydownFeedback,
  "disturbance-recovery": probeDisturbanceRecovery,
  "arrival-earned": probeArrivalEarned,
  "living-hollow": probeLivingHollow,
  "island-drainage": probeIslandDrainage,
  "tidal-envelope": probeTidalEnvelope,
  "shore-exposure": probeShoreExposure,
  "longshore-drift": probeLongshoreDrift,
  "orographic-wind": probeOrographicWind,
  "scenario-window": probeScenarioWindow,
  "salinity-arrival": probeSalinityArrival,
  "heat-arrival": probeHeatArrival,
  "strand-arrival": probeStrandArrival,
  "island-arrival": probeIslandArrival,
  "substrate-contrast": probeSubstrateContrast,
  "substrate-deposit": probeSubstrateDeposit,
  "cloud-delivery": probeCloudDelivery,
};

export function runProbe(name: string): ProbeResult {
  const fn = SCENARIOS[name];
  if (!fn) {
    throw new Error(
      `Unknown probe '${name}'. Known: ${Object.keys(SCENARIOS).join(", ")}`,
    );
  }
  return fn();
}

export function listProbes(): string[] {
  return Object.keys(SCENARIOS);
}
