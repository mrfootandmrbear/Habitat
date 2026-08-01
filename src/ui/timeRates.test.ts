/**
 * Slice L6 — the rate control in real-world units (T-002 Locked).
 *
 * Two things are under test: that every label is what the clock actually
 * delivers, and that the fastest offered rate is one the machine can hold
 * (rates above it are not offered rather than offered-and-discarded, which was
 * the L1 defect).
 */
import { describe, expect, it } from "vitest";
import { config } from "../config";
import { SimClock } from "../sim/SimClock";
import {
  CATCH_UP_HEADROOM,
  SIM_DAYS_PER_YEAR,
  SIM_SECONDS_PER_DAY,
  SIM_SECONDS_PER_EVENT_STEP,
  TIME_RATE_LADDER,
  formatSimElapsed,
  isSustainable,
  rateById,
  rateDescription,
  stepsPerFrame,
  sustainableRates,
  timeScaleFor,
  type TimeRateSpec,
} from "./timeRates";

const FPS = 60;
const WALL_DT = 1 / FPS;

/** Run a rate for long enough to deliver `targetSteps`, and report what arrived. */
function deliver(
  rate: TimeRateSpec,
  targetSteps: number,
): { wallSeconds: number; simSecondsDelivered: number } {
  const wallSeconds =
    (targetSteps * SIM_SECONDS_PER_EVENT_STEP) / rate.simSecondsPerWallSecond;
  const frames = Math.round(wallSeconds * FPS);
  const clock = new SimClock({
    simDt: config.simDt,
    maxStepsPerFrame: config.maxStepsPerFrame,
    maxDebtSteps: config.maxTimeDebtSteps,
    timeScale: timeScaleFor(rate),
  });

  let steps = 0;
  for (let f = 0; f < frames; f++) steps += clock.tick(WALL_DT).stepsRun;

  return {
    wallSeconds: frames / FPS,
    simSecondsDelivered: steps * SIM_SECONDS_PER_EVENT_STEP,
  };
}

describe("time rates are stated in real-world units (L6 / T-002)", () => {
  it("offers true real time at the slow end", () => {
    const realTime = rateById("second");
    expect(realTime.simSecondsPerWallSecond).toBe(1);
    expect(sustainableRates()).toContainEqual(realTime);
  });

  it("every offered label delivers the sim-time it names", () => {
    for (const rate of sustainableRates()) {
      if (rate.id === "pause") continue;
      const { wallSeconds, simSecondsDelivered } = deliver(rate, 20);
      const expected = wallSeconds * rate.simSecondsPerWallSecond;
      // The clock's quantum is one event step; nothing finer is claimable.
      expect(Math.abs(simSecondsDelivered - expected)).toBeLessThanOrEqual(
        SIM_SECONDS_PER_EVENT_STEP,
      );
    }
  });

  it("pause delivers no simulated time", () => {
    const clock = new SimClock({
      simDt: config.simDt,
      maxStepsPerFrame: config.maxStepsPerFrame,
      timeScale: timeScaleFor(rateById("pause")),
    });
    expect(clock.tick(1).stepsRun).toBe(0);
  });

  it("the scale is derived from the clock, not typed beside it", () => {
    // The old control's "1×" — the base nobody could state — was this.
    const oldOneX = SIM_SECONDS_PER_EVENT_STEP / config.wallSecondsPerEventStep;
    expect(oldOneX).toBe(54_000);
    for (const rate of TIME_RATE_LADDER) {
      expect(timeScaleFor(rate)).toBeCloseTo(
        rate.simSecondsPerWallSecond / oldOneX,
        12,
      );
    }
  });

  it("rates are strictly increasing so the ladder reads as one", () => {
    for (let i = 1; i < TIME_RATE_LADDER.length; i++) {
      expect(TIME_RATE_LADDER[i]!.simSecondsPerWallSecond).toBeGreaterThan(
        TIME_RATE_LADDER[i - 1]!.simSecondsPerWallSecond,
      );
    }
  });
});

describe("the ceiling is honest (L6 / L1)", () => {
  it("every offered rate fits the per-frame budget with catch-up left over", () => {
    for (const rate of sustainableRates()) {
      expect(stepsPerFrame(rate)).toBeLessThanOrEqual(
        config.maxStepsPerFrame * CATCH_UP_HEADROOM,
      );
    }
  });

  it("the rate above the ceiling is withheld, not offered and discarded", () => {
    const month = rateById("month");
    expect(isSustainable(month)).toBe(false);
    expect(stepsPerFrame(month)).toBeGreaterThan(config.maxStepsPerFrame);
    expect(sustainableRates()).not.toContainEqual(month);
    // ...and it is still in the ladder, so the ceiling is a measurement.
    expect(TIME_RATE_LADDER).toContainEqual(month);
  });

  it("the fastest offered rate is a week per second", () => {
    expect(sustainableRates().at(-1)!.id).toBe("week");
    expect(stepsPerFrame(rateById("week"))).toBeCloseTo(11.2, 6);
  });

  it("the 'fastest sustains' suffix is derived from sustainableRates, not typed onto week (BUILD_GUIDE §4.52)", () => {
    expect(rateDescription(rateById("week"))).toContain(
      "the fastest this machine sustains",
    );
    expect(rateDescription(rateById("day"))).not.toContain("sustains");
    // At a lower fps the ceiling drops below week — the suffix must move
    // with it, not stay hardcoded to whichever rate held it at 60fps.
    const lowFps = 5;
    expect(sustainableRates(lowFps).at(-1)!.id).not.toBe("week");
    const slowerFastest = sustainableRates(lowFps).at(-1)!;
    expect(rateDescription(slowerFastest, lowFps)).toContain(
      "the fastest this machine sustains",
    );
    expect(rateDescription(rateById("week"), lowFps)).not.toContain(
      "sustains",
    );
  });
});

describe("elapsed simulation time reads in real units (S-009)", () => {
  it("reports hours below a day", () => {
    expect(formatSimElapsed(0)).toBe("0h 00m");
    expect(formatSimElapsed(3 * 60 + 15)).toBe("3h 15m");
  });

  it("reports days then years on the world's own 360-day calendar", () => {
    expect(formatSimElapsed(config.minutesPerDay * 2.5)).toBe("2d 12h");
    const oneYear = config.minutesPerDay * SIM_DAYS_PER_YEAR;
    expect(formatSimElapsed(oneYear)).toBe("1y 0d");
    expect(formatSimElapsed(oneYear * 2 + config.minutesPerDay * 5)).toBe(
      "2y 5d",
    );
  });

  it("a wall-second at 1 day/s advances the readout by one sim-day", () => {
    expect(rateById("day").simSecondsPerWallSecond).toBe(SIM_SECONDS_PER_DAY);
  });
});
