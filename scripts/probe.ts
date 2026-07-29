#!/usr/bin/env npx tsx
/**
 * Headless probes (VERIFICATION_POLICY §8, T-006, BUILD_GUIDE §4.1).
 *
 * Usage:
 *   npm run probe -- --list
 *   npm run probe -- <scenario>              # run + rewrite evidence md vs baseline
 *   npm run probe -- --all --check           # every scenario; write nothing; non-zero on drift
 *   npm run probe -- <scenario> --write-baseline   # intentional baseline refresh (state why in commit)
 */
import {
  compareToBaseline,
  formatCheckFailure,
  writeBaselineFile,
  writeEvidenceMarkdown,
  type MetricTolerance,
} from "../src/sim/probes/baseline.ts";
import { listProbes, runProbe } from "../src/sim/probes/scenarios.ts";

/** Tolerances chosen with the scenario (not fitted after a noisy run). */
const BASELINE_TOLERANCES: Record<string, Record<string, MetricTolerance>> = {
  "paired-storm": {
    // f32 cover / roughness from veg step
    "bare.cover": { abs: 1e-6 },
    "bare.downslope": { abs: 1e-5 },
    "bare.roughness": { abs: 1e-6 },
    "bare.infiltrated": { abs: 1e-4 },
    "vegetated.cover": { abs: 1e-6 },
    "vegetated.downslope": { abs: 1e-5 },
    "vegetated.roughness": { abs: 1e-6 },
    "vegetated.infiltrated": { abs: 1e-4 },
  },
  "berm-reroute": {
    // Exact integer accumulation topology
    "row0.cellsChanged": { abs: 0 },
    "row0.maxAccumulationDelta": { abs: 0 },
    "row0.bermCellAccBefore": { abs: 0 },
    "row0.bermCellAccAfter": { abs: 0 },
  },
  "basin-fill": {
    "row0.pitRawElev": { abs: 0 },
    "row0.spillFilledElev": { abs: 0 },
    "row0.depressionDepth": { abs: 0 },
    // Mass residual is ~1e-8 today; abs 1e-6 catches real leaks, not fp dust
    "row0.volumeResidual": { abs: 1e-6 },
  },
};

const args = process.argv.slice(2);
const list = args.includes("--list");
const all = args.includes("--all");
const check = args.includes("--check");
const writeBaseline = args.includes("--write-baseline");
const positional = args.filter((a) => !a.startsWith("--"));

function usage(): never {
  console.log(`Usage:
  npm run probe -- --list
  npm run probe -- <scenario>
  npm run probe -- --all --check
  npm run probe -- <scenario> --write-baseline`);
  process.exit(1);
}

if (list || args.length === 0) {
  console.log("Probes:", listProbes().join(", "));
  if (!list) usage();
  process.exit(0);
}

if (all && check) {
  let failed = false;
  for (const name of listProbes()) {
    const result = runProbe(name);
    const report = compareToBaseline(result);
    if (!report.ok) {
      failed = true;
      console.error(formatCheckFailure(report));
    } else {
      console.log(`${name}: ok (${report.deltas.length} metrics)`);
    }
  }
  process.exit(failed ? 1 : 0);
}

if (all || check) {
  console.error("Use --all and --check together: npm run probe -- --all --check");
  process.exit(1);
}

const name = positional[0];
if (!name) usage();

const result = runProbe(name);

if (writeBaseline) {
  const tols = BASELINE_TOLERANCES[name];
  if (!tols) {
    console.error(`No baseline tolerances registered for '${name}'`);
    process.exit(1);
  }
  const file = writeBaselineFile(result, tols);
  console.log(
    `Wrote docs/evidence/${name}.baseline.json (${Object.keys(file.metrics).length} metrics)`,
  );
  console.log(
    "State why this baseline moved in the commit body — unexplained moves are defects.",
  );
}

const report = compareToBaseline(result);
writeEvidenceMarkdown(result, report);
console.log(JSON.stringify({ scenario: result.scenario, records: result.records, report }, null, 2));
console.log(`Wrote docs/evidence/${result.scenario}.md`);

if (report.missingBaseline && !writeBaseline) {
  console.error(
    `Missing baseline for ${name}. Create with: npm run probe -- ${name} --write-baseline`,
  );
  process.exit(1);
}
