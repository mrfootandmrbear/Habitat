import { describe, expect, it } from "vitest";
import {
  hillslopeDepositWeight,
  isLocalMinimum,
  transportCapacityProxy,
} from "./hillslopeDeposit";

describe("hillslopeDepositWeight (Exner-lite / GEO-002)", () => {
  it("zeros weight on concentrated flow unless basin or local min", () => {
    const channel = hillslopeDepositWeight({
      slope: 0.2,
      depressionDepth: 0,
      aNorm: 0.5,
      isLocalMin: false,
      concentratedFlow: true,
    });
    expect(channel).toBe(0);
    const sink = hillslopeDepositWeight({
      slope: 0.2,
      depressionDepth: 0.4,
      aNorm: 0.5,
      isLocalMin: false,
      concentratedFlow: true,
    });
    expect(sink).toBeGreaterThan(0);
  });

  it("prefers basins and local minima over steep under-capacity flats", () => {
    const steep = hillslopeDepositWeight({
      slope: 0.3,
      depressionDepth: 0,
      aNorm: 0.01,
      isLocalMin: false,
      concentratedFlow: false,
    });
    const basin = hillslopeDepositWeight({
      slope: 0.02,
      depressionDepth: 0.5,
      aNorm: 0.01,
      isLocalMin: true,
      concentratedFlow: false,
    });
    expect(basin).toBeGreaterThan(steep);
  });

  it("capacity proxy rises with slope and accumulation", () => {
    expect(transportCapacityProxy(0.2, 0.25)).toBeGreaterThan(
      transportCapacityProxy(0.05, 0.25),
    );
    expect(transportCapacityProxy(0.1, 0.81)).toBeGreaterThan(
      transportCapacityProxy(0.1, 0.09),
    );
  });

  it("detects strict local minima", () => {
    const elev = new Float32Array([2, 2, 2, 2, 1, 2, 2, 2, 2]);
    expect(isLocalMinimum(elev, 3, 3, 1, 1)).toBe(true);
    expect(isLocalMinimum(elev, 3, 3, 0, 0)).toBe(false);
    expect(isLocalMinimum(elev, 3, 3, 1, 0)).toBe(false);
  });
});
