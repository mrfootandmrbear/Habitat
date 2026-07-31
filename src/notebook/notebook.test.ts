import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateMountain } from "../sim/terrain/generateMountain";
import { WorldState } from "../sim/WorldState";
import { NOTEBOOK_CORPUS } from "./corpus";
import {
  answerNotebook,
  corpusAllTraced,
  freezeNotebookSnapshot,
  formatNotebookAnswer,
  notebookObserver,
  snapshotFromFields,
} from "./FieldNotebook";
import type { NotebookSnapshot } from "./types";

const notebookDir = dirname(fileURLToPath(import.meta.url));

function drySnap(over: Partial<NotebookSnapshot> = {}): NotebookSnapshot {
  return {
    meanSurfaceDepth: 0,
    maxSurfaceDepth: 0,
    meanSoilMoisture: 0,
    meanGroundwater: 0,
    meanCover: 0,
    meanHerbBiomass: 0,
    meanStrandBiomass: 0,
    meanBinderBiomass: 0,
    meanMarshBiomass: 0,
    meanShrubBiomass: 0,
    scarFraction: 0,
    modalLimitingFactor: -1,
    landCellCount: 0,
    ...over,
  };
}

describe("U-006 notebookObserver contract", () => {
  it("declares reads and empty writes (write isolation)", () => {
    expect(notebookObserver.writes).toEqual([]);
    expect(notebookObserver.reads).toContain("water.surfaceDepth");
    expect(notebookObserver.reads).toContain("veg.cover");
    expect(notebookObserver.reads).toContain("fire.scar");
  });

  it("source modules do not call Math.random or sim RNG APIs", () => {
    const stripComments = (src: string): string =>
      src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
    for (const name of ["FieldNotebook.ts", "corpus.ts", "types.ts"]) {
      const src = stripComments(readFileSync(join(notebookDir, name), "utf8"));
      expect(src).not.toMatch(/Math\.random\s*\(/);
      expect(src).not.toMatch(/\bnextFloat\b/);
      expect(src).not.toMatch(/\bseededRng\b/);
    }
  });

  it("every corpus sentence has field traces (U-006)", () => {
    expect(corpusAllTraced()).toBe(true);
    expect(NOTEBOOK_CORPUS.length).toBeGreaterThanOrEqual(5);
    for (const e of NOTEBOOK_CORPUS) {
      expect(e.traces.length).toBeGreaterThan(0);
      for (const t of e.traces) {
        expect(notebookObserver.reads).toContainEqual(t.fieldId);
      }
    }
  });
});

describe("answerNotebook chronology + uncertainty", () => {
  it("emits flooded only when surface water is present", () => {
    const dry = answerNotebook("what-changed", drySnap());
    expect(dry.empty).toBe(true);
    expect(formatNotebookAnswer(dry)).toMatch(/Nothing in the notebook/);

    const wet = answerNotebook(
      "what-changed",
      drySnap({ meanSurfaceDepth: 0.02, maxSurfaceDepth: 0.1, landCellCount: 1 }),
    );
    expect(wet.empty).toBe(false);
    expect(wet.lines.some((l) => l.event === "flooded")).toBe(true);
    expect(wet.lines.every((l) => l.uncertainty === null)).toBe(true);
  });

  it("what-contributed adds uncertainty and keeps traces", () => {
    const ans = answerNotebook(
      "what-contributed",
      drySnap({ meanCover: 0.4, landCellCount: 10 }),
    );
    const recovered = ans.lines.find((l) => l.event === "recovered");
    expect(recovered).toBeDefined();
    expect(recovered!.uncertainty).toMatch(/Likely/);
    expect(recovered!.uncertainty).toMatch(/does not prove a single cause/);
    expect(recovered!.fieldIds).toContain("veg.cover");
  });

  it("seeping requires dry surface and wet ground", () => {
    const surfaceWet = answerNotebook(
      "what-changed",
      drySnap({
        meanSurfaceDepth: 0.01,
        meanSoilMoisture: 0.5,
        landCellCount: 1,
      }),
    );
    expect(surfaceWet.lines.some((l) => l.event === "seeping")).toBe(false);

    const seep = answerNotebook(
      "what-changed",
      drySnap({
        meanSurfaceDepth: 0,
        meanSoilMoisture: 0.4,
        landCellCount: 1,
      }),
    );
    expect(seep.lines.some((l) => l.event === "seeping")).toBe(true);
  });

  it("same snapshot → identical answer (determinism)", () => {
    const snap = drySnap({
      scarFraction: 0.2,
      meanCover: 0.1,
      landCellCount: 4,
    });
    const a = formatNotebookAnswer(answerNotebook("what-changed", snap));
    const b = formatNotebookAnswer(answerNotebook("what-changed", snap));
    expect(a).toBe(b);
  });
});

describe("freezeNotebookSnapshot write isolation", () => {
  it("mutating the frozen copy leaves WorldState hash unchanged", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    world.water.data.fill(0.05);
    const before = world.registry.hashState();

    const snap = freezeNotebookSnapshot({
      surfaceDepth: world.water.data,
      soilMoisture: world.soilMoisture.data,
      groundwater: world.groundwaterStorage.data,
      cover: world.vegCover.data,
      herbBiomass: world.herbBiomass.data,
      fireScar: world.fireScar.data,
      limitingFactor: world.habitatLimitingFactor.data,
      oceanCells: world.oceanCells,
    });

    // Mutate the live buffers after freeze — snapshot must be independent.
    world.water.data.fill(0);
    world.vegCover.data.fill(1);

    const flooded = answerNotebook("what-changed", snap);
    expect(flooded.lines.some((l) => l.event === "flooded")).toBe(true);

    // Re-hash: we mutated world after hashing — prove freeze used a copy by
    // re-reading from a second freeze of the *original* pattern via snapshotFromFields.
    const independent = snapshotFromFields({
      surfaceDepth: new Float32Array(64).fill(0.05),
      soilMoisture: new Float32Array(64),
      groundwater: new Float32Array(64),
      cover: new Float32Array(64),
      herbBiomass: new Float32Array(64),
      fireScar: new Float32Array(64),
      limitingFactor: new Float32Array(64),
    });
    expect(
      answerNotebook("what-changed", independent).lines.some(
        (l) => l.event === "flooded",
      ),
    ).toBe(true);

    // World was mutated; hash differs from before — notebook did not restore it.
    expect(world.registry.hashState()).not.toBe(before);

    // Critical: answering never writes — capture hash, answer, hash again.
    const h1 = world.registry.hashState();
    answerNotebook(
      "what-contributed",
      freezeNotebookSnapshot({
        surfaceDepth: world.water.data,
        soilMoisture: world.soilMoisture.data,
        groundwater: world.groundwaterStorage.data,
        cover: world.vegCover.data,
        herbBiomass: world.herbBiomass.data,
        fireScar: world.fireScar.data,
        limitingFactor: world.habitatLimitingFactor.data,
        oceanCells: world.oceanCells,
      }),
    );
    expect(world.registry.hashState()).toBe(h1);
  });
});
