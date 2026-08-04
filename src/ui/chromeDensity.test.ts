import { describe, expect, it } from "vitest";
import {
  FULL_ONLY_CONTROL_IDS,
  SIMPLE_CONTROL_IDS,
  chromeControlCount,
  chromeDensityDelta,
  fullOnlyVisible,
  isChromeDensity,
  resolveChromeDensity,
} from "./chromeDensity";

describe("chrome density (U-001)", () => {
  it("defaults to Simple when nothing is stored", () => {
    expect(resolveChromeDensity(null)).toBe("simple");
    expect(resolveChromeDensity(undefined)).toBe("simple");
    expect(resolveChromeDensity("nope")).toBe("simple");
  });

  it("accepts only Simple and Full as density ids", () => {
    expect(isChromeDensity("simple")).toBe(true);
    expect(isChromeDensity("full")).toBe(true);
    expect(isChromeDensity("compact")).toBe(false);
  });

  it("Full-only chrome is hidden in Simple and shown in Full", () => {
    expect(fullOnlyVisible("simple")).toBe(false);
    expect(fullOnlyVisible("full")).toBe(true);
  });

  it("Simple exposes a strict subset of Full (ceded real estate)", () => {
    expect(chromeControlCount("simple")).toBe(SIMPLE_CONTROL_IDS.length);
    expect(chromeControlCount("full")).toBe(
      SIMPLE_CONTROL_IDS.length + FULL_ONLY_CONTROL_IDS.length,
    );
    expect(chromeDensityDelta()).toBeGreaterThanOrEqual(8);
    expect(chromeControlCount("simple")).toBeLessThan(
      chromeControlCount("full"),
    );
  });

  it("Simple keeps the sand-castle loop controls", () => {
    for (const id of [
      "chrome-density",
      "rain-regime",
      "sea-level",
      "wind-regime",
      "time-rates",
      "siting-tool",
      "siting-brush-size",
      "undo-edit",
    ] as const) {
      expect(SIMPLE_CONTROL_IDS).toContain(id);
    }
  });

  it("Full is where inspect, branch, and secondary forces live", () => {
    for (const id of [
      "heat-regime",
      "tide-envelope",
      "season-regime",
      "erosion-intensity",
      "inspector",
      "branch-actions",
      "seed-actions",
    ] as const) {
      expect(FULL_ONLY_CONTROL_IDS).toContain(id);
    }
  });
});
