import { describe, expect, it } from "vitest";
import { eventBandActive } from "./eventBandGate";

describe("eventBandActive (SIM §6.2 / L7)", () => {
  it("is inactive when dry, not raining, not burning", () => {
    expect(
      eventBandActive({
        surfaceDepth: new Float32Array([0, 0, 0]),
        burning: new Float32Array([0, 0, 0]),
        willPrecipitate: false,
      }),
    ).toBe(false);
  });

  it("opens on any positive surface depth (flux authority, not dryEpsilon)", () => {
    expect(
      eventBandActive({
        surfaceDepth: new Float32Array([0, 1e-12, 0]),
        burning: new Float32Array([0, 0, 0]),
        willPrecipitate: false,
      }),
    ).toBe(true);
  });

  it("opens when precip will discharge this event", () => {
    expect(
      eventBandActive({
        surfaceDepth: new Float32Array([0, 0]),
        burning: new Float32Array([0, 0]),
        willPrecipitate: true,
      }),
    ).toBe(true);
  });

  it("opens when any cell is burning", () => {
    expect(
      eventBandActive({
        surfaceDepth: new Float32Array([0, 0]),
        burning: new Float32Array([0, 1]),
        willPrecipitate: false,
      }),
    ).toBe(true);
  });
});
