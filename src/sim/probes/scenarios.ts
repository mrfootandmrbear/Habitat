import { config } from "../../config";
import { Grid2D } from "../Grid2D";
import { WorldState } from "../WorldState";
import { totalWaterVolume } from "../hydrology/fluxStep";
import { generateMountain } from "../terrain/generateMountain";
import {
  rainDepthForRegime,
  rainRegimeById,
  regimeRainsThisEvent,
  type RainRegimeId,
} from "../climate/rainRegime";
import {
  LIMITING_DEPTH,
  LIMITING_MOISTURE,
} from "../habitat/hsiComposition";
import {
  DEEP_TIME_SIM_YEARS,
  decadalBandsForYears,
  makeDeepTimeWorld,
  p005LegacyDepthEffect,
  p005SaveAdvanceReloadHash,
  sampleHorizon,
} from "./deepTime";

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
    const depth = rainDepthForRegime(regime, config.rainDepthPerEvent);
    for (let d = 0; d < days; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        if (
          depth > 0 &&
          regimeRainsThisEvent(regime, i, config.dailyEventSteps)
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

const SCENARIOS: Record<string, () => ProbeResult> = {
  "paired-storm": probePairedStorm,
  "berm-reroute": probeBermReroute,
  "basin-fill": probeBasinFill,
  "deep-time": probeDeepTime,
  "baseflow-persist": probeBaseflowPersist,
  "regime-divergence": probeRegimeDivergence,
  "limiting-shift": probeLimitingShift,
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
