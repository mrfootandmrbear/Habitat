import { describe, expect, it } from "vitest";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";
import { surfaceWaterProcess } from "./process/surfaceWaterProcess";
import { soilWaterProcess } from "./process/soilWaterProcess";
import { vegetationProcess } from "./process/vegetationProcess";
import type { Process } from "./process/Process";

const PROCESSES: Process[] = [
  surfaceWaterProcess,
  soilWaterProcess,
  vegetationProcess,
];

describe("process ownership (§4 / §5)", () => {
  it("every write target is owned by the writing process", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    for (const process of PROCESSES) {
      for (const fieldId of process.writes) {
        const field = world.registry.get(fieldId);
        expect(
          field.owner,
          `${process.id} writes ${fieldId} but owner is ${field.owner}`,
        ).toBe(process.id);
      }
    }
  });

  it("contributes target fields owned by someone else", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    for (const process of PROCESSES) {
      for (const fieldId of process.contributes ?? []) {
        const field = world.registry.get(fieldId);
        expect(
          field.owner,
          `${process.id} should not own contributed ${fieldId}`,
        ).not.toBe(process.id);
      }
    }
  });

  it("soilWater declares contribute on water.surfaceDepth (infil debit)", () => {
    expect(soilWaterProcess.contributes).toContain("water.surfaceDepth");
  });
});
