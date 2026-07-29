import { describe, expect, it } from "vitest";
import {
  compareToBaseline,
  flattenRecords,
  withinTolerance,
  type BaselineFile,
  type MetricTolerance,
} from "./baseline";
import { listProbes, runProbe, type ProbeResult } from "./scenarios";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("probe baseline harness", () => {
  it("withinTolerance honors abs and rel", () => {
    expect(withinTolerance(1.000001, 1, { abs: 1e-5 })).toBe(true);
    expect(withinTolerance(1.01, 1, { abs: 1e-5 })).toBe(false);
    expect(withinTolerance(101, 100, { rel: 0.02 })).toBe(true);
    expect(withinTolerance(105, 100, { rel: 0.02 })).toBe(false);
  });

  it("flattens labeled rows as label.metric", () => {
    const flat = flattenRecords([
      { label: "bare", downslope: 1, infiltrated: 2 },
      { label: "vegetated", downslope: 3, infiltrated: 4 },
    ]);
    expect(flat["bare.downslope"]).toBe(1);
    expect(flat["vegetated.infiltrated"]).toBe(4);
  });

  it("every live scenario has a committed baseline and passes --check semantics", () => {
    for (const name of listProbes()) {
      const baselinePath = join(
        process.cwd(),
        "docs/evidence",
        `${name}.baseline.json`,
      );
      const raw = JSON.parse(readFileSync(baselinePath, "utf8")) as BaselineFile;
      expect(raw.scenario).toBe(name);
      expect(Object.keys(raw.metrics).length).toBeGreaterThan(0);

      const result = runProbe(name);
      const report = compareToBaseline(result);
      expect(report.missingBaseline).toBe(false);
      expect(report.ok, `${name} drifted: ${JSON.stringify(report.deltas)}`).toBe(
        true,
      );
    }
  });

  it("a deliberately perturbed baseline metric fails compare (Tier-M tripwire)", () => {
    const result = runProbe("basin-fill");
    const report = compareToBaseline(result);
    expect(report.ok).toBe(true);

    // Perturb: rewrite compare path by mutating a copy of the run above abs tol
    const perturbed: ProbeResult = {
      scenario: result.scenario,
      records: result.records.map((r) => ({
        ...r,
        volumeResidual: Number(r.volumeResidual) + 1e-3,
      })),
    };
    // Load real baseline via compare — inject by comparing against mutated actual
    const bad = compareToBaseline(perturbed);
    expect(bad.ok).toBe(false);
    const residual = bad.deltas.find((d) => d.key === "row0.volumeResidual");
    expect(residual?.ok).toBe(false);
  });

  it("integer berm metrics use abs 0 so any change fails", () => {
    const tol: MetricTolerance = { abs: 0 };
    expect(withinTolerance(64, 64, tol)).toBe(true);
    expect(withinTolerance(65, 64, tol)).toBe(false);
  });
});
