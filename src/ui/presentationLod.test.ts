import { describe, expect, it } from "vitest";
import { presentationLod } from "./presentationLod";

describe("presentationLod (L8 companion)", () => {
  it("P0 calm — full theatre", () => {
    const lod = presentationLod({
      timeRate: "second",
      timeDebt: 0,
      droppedSteps: 0,
      trueWallDt: 0.016,
      skipActive: false,
    });
    expect(lod.tier).toBe(0);
    expect(lod.showStreaks).toBe(true);
    expect(lod.animateSway).toBe(true);
    expect(lod.weatherFog).toBe(true);
  });

  it("P1 at day/s sheds streaks and sway", () => {
    const lod = presentationLod({
      timeRate: "day",
      timeDebt: 0,
      droppedSteps: 0,
      trueWallDt: 0.016,
      skipActive: false,
    });
    expect(lod.tier).toBe(1);
    expect(lod.showStreaks).toBe(false);
    expect(lod.animateSway).toBe(false);
    expect(lod.rebuildOccupants).toBe(true);
  });

  it("P2 under time debt hides streaks and fog drama", () => {
    const lod = presentationLod({
      timeRate: "hour",
      timeDebt: 4,
      droppedSteps: 0,
      trueWallDt: 0.02,
      skipActive: false,
    });
    expect(lod.tier).toBe(2);
    expect(lod.showStreaks).toBe(false);
    expect(lod.weatherFog).toBe(false);
  });

  it("P3 when droppedSteps rising skips occupant rebuild", () => {
    const lod = presentationLod({
      timeRate: "week",
      timeDebt: 0,
      droppedSteps: 100,
      prevDroppedSteps: 50,
      trueWallDt: 0.2,
      skipActive: false,
    });
    expect(lod.tier).toBe(3);
    expect(lod.rebuildOccupants).toBe(false);
  });

  it("P4 skip freezes weather theatre", () => {
    const lod = presentationLod({
      timeRate: "second",
      timeDebt: 0,
      droppedSteps: 0,
      trueWallDt: 0.016,
      skipActive: true,
    });
    expect(lod.tier).toBe(4);
    expect(lod.freezeWeatherTheatre).toBe(true);
    expect(lod.showStreaks).toBe(false);
  });
});
