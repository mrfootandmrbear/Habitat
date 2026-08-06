import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { captureWorld, restoreWorld } from "./sessionPersist";
import {
  SKIP_PRESETS,
  YEARS_PER_DECADAL_BAND,
  advanceAtFloor,
  skipPresetById,
} from "./timeSkip";
import { meanField } from "./probes/deepTime";

describe("L8 time skip (C-024 / C-025)", () => {
  it("C-024: shipped band periods stay the Locked compressed calendar", () => {
    // Spec §6.1 would be annual=360, decadal=3600; Locked choice keeps the
    // compressed periods and treats rates as already matched (C-008).
    expect(config.annualDailySteps).toBe(36);
    expect(config.decadalDailySteps).toBe(10);
    expect(config.seasonalDailySteps).toBe(10);
    expect(YEARS_PER_DECADAL_BAND).toBe(10);
  });

  it("every skip preset binds a floor and advances exact duration", () => {
    for (const preset of SKIP_PRESETS) {
      expect(preset.durationSimMinutes).toBeGreaterThan(0);
      expect(preset.floor).toBeTruthy();
      const found = skipPresetById(preset.id);
      expect(found.id).toBe(preset.id);
    }
  });

  it("1-day event-floor skip advances simMinutes by one day", () => {
    const world = new WorldState(new Grid2D(6, 6, 2));
    const before = world.simMinutes;
    const action = world.applySkipPreset("1day");
    expect(world.simMinutes - before).toBe(config.minutesPerDay);
    expect(action.floor).toBe("event");
    expect(world.getSkipSchedule()).toHaveLength(1);
    expect(world.getSkipSchedule()[0]!.presetId).toBe("1day");
  });

  it("1-month daily-floor skip advances 30 days without running event flux", () => {
    const world = new WorldState(new Grid2D(6, 6, 2));
    world.soilMoisture.fill(0.3);
    const before = world.simMinutes;
    world.applySkipPreset("1month");
    expect(world.simMinutes - before).toBe(30 * config.minutesPerDay);
  });

  it("100-year decadal-floor skip advances HUD years via YEARS_PER_DECADAL_BAND", () => {
    const world = new WorldState(new Grid2D(6, 6, 2));
    const before = world.simMinutes;
    world.applySkipPreset("100years");
    const years =
      (world.simMinutes - before) / (360 * config.minutesPerDay);
    expect(years).toBeCloseTo(100, 6);
  });

  it("skip schedule round-trips through save (C-025 declared state)", () => {
    const world = new WorldState(new Grid2D(6, 6, 2));
    world.applySkipPreset("1year");
    world.applySkipPreset("10years");
    const doc = captureWorld(world);
    expect(doc.skipSchedule).toHaveLength(2);
    expect(doc.schemaVersion).toBe(13);

    const other = new WorldState(new Grid2D(6, 6, 2));
    restoreWorld(other, doc);
    expect(other.getSkipSchedule()).toHaveLength(2);
    expect(other.getSkipSchedule()[1]!.presetId).toBe("10years");
    expect(other.simMinutes).toBe(world.simMinutes);
  });

  it("floor-invariance: seasonal vs annual over 1 year agree within 8% on cover", () => {
    // Extend band-refinement family across floors (C-025 criterion).
    const seasonal = new WorldState(new Grid2D(8, 8, 2));
    const annual = new WorldState(new Grid2D(8, 8, 2));
    for (const w of [seasonal, annual]) {
      w.soilMoisture.fill(0.28);
      w.vegCover.fill(0.15);
      w.herbBiomass.fill(0.4);
    }
    const duration = skipPresetById("1year").durationSimMinutes;
    advanceAtFloor(seasonal, "seasonal", duration);
    advanceAtFloor(annual, "annual", duration);

    expect(seasonal.simMinutes).toBe(annual.simMinutes);
    const coverS = meanField(seasonal.vegCover.data);
    const coverA = meanField(annual.vegCover.data);
    const rel =
      Math.abs(coverS - coverA) / Math.max(Math.abs(coverS), Math.abs(coverA), 1e-6);
    expect(rel).toBeLessThan(0.08);
  });
});
