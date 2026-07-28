#!/usr/bin/env npx tsx
/**
 * Headless probes (VERIFICATION_POLICY §8, T-006).
 * Usage: npm run probe -- <scenario>
 *        npm run probe -- --list
 */
import { listProbes, runProbe } from "../src/sim/probes/scenarios.ts";

const arg = process.argv[2] ?? "";
if (arg === "--list" || arg === "") {
  console.log("Probes:", listProbes().join(", "));
  if (!arg) {
    console.log("Usage: npm run probe -- <scenario>");
    process.exit(arg === "--list" ? 0 : 1);
  }
  process.exit(0);
}

const result = runProbe(arg);
console.log(JSON.stringify(result, null, 2));
console.log(`Wrote docs/evidence/${result.scenario}.md`);
