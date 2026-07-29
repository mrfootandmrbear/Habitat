/**
 * Slice manifest validation (BUILD_GUIDE DoD row 9).
 * Used by conformance:check — fails when a manifest names missing artifacts.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { listProbes } from "../src/sim/probes/scenarios.ts";
import { Grid2D } from "../src/sim/Grid2D.ts";
import { WorldState } from "../src/sim/WorldState.ts";

export type SliceManifest = {
  id: string;
  title: string;
  simLoop: string;
  gameLoop: string;
  registerIds: string[];
  invariantClass: string;
  tests: string[];
  probes: string[];
  fields: string[];
  notebookSeed: string;
  /** Owner-only question, or the literal deferral sentence. */
  tierO: string;
};

const INVARIANT_CLASSES = new Set([
  "Conservation",
  "Refinement",
  "Monotonicity",
  "Bounds",
  "Equilibrium",
  "Symmetry",
  "Write isolation",
]);

export function loadManifests(slicesDir: string): SliceManifest[] {
  if (!existsSync(slicesDir)) return [];
  return readdirSync(slicesDir)
    .filter((n) => n.endsWith(".json"))
    .sort()
    .map((n) => {
      const raw = JSON.parse(
        readFileSync(join(slicesDir, n), "utf8"),
      ) as SliceManifest;
      return raw;
    });
}

export type ManifestIssue = { sliceId: string; message: string };

export function validateManifests(
  manifests: SliceManifest[],
  options: {
    root: string;
    registerIds: Set<string>;
    knownFields: Set<string>;
    knownProbes: Set<string>;
  },
): ManifestIssue[] {
  const issues: ManifestIssue[] = [];
  for (const m of manifests) {
    const fail = (message: string): void => {
      issues.push({ sliceId: m.id, message });
    };

    if (!m.id || !m.title) fail("missing id or title");
    if (!m.simLoop?.trim()) fail("missing simLoop");
    if (!m.gameLoop?.trim()) fail("missing gameLoop");
    if (!m.notebookSeed?.trim()) fail("missing notebookSeed");
    if (!m.tierO?.trim()) fail("missing tierO");
    if (!INVARIANT_CLASSES.has(m.invariantClass)) {
      fail(
        `invariantClass '${m.invariantClass}' not in BUILD_GUIDE §2.1 (${[...INVARIANT_CLASSES].join(", ")})`,
      );
    }

    for (const id of m.registerIds ?? []) {
      if (/^C-\d{3}$/.test(id)) continue; // Open candidates may be cited as hypotheses
      if (!options.registerIds.has(id)) {
        fail(`unknown register id '${id}'`);
      }
    }

    for (const testPath of m.tests ?? []) {
      if (!existsSync(join(options.root, testPath))) {
        fail(`test file missing: ${testPath}`);
      }
    }

    for (const probe of m.probes ?? []) {
      if (!options.knownProbes.has(probe)) {
        fail(`unknown probe scenario '${probe}'`);
      }
    }

    for (const fieldId of m.fields ?? []) {
      if (!options.knownFields.has(fieldId)) {
        fail(`unknown registry field '${fieldId}'`);
      }
    }
  }
  return issues;
}

export function knownRegistryFieldIds(): Set<string> {
  const world = new WorldState(new Grid2D(2, 2, 1));
  return new Set(world.registry.list().map((f) => f.id));
}

export function knownProbeIds(): Set<string> {
  return new Set(listProbes());
}
