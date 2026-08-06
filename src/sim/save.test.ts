import { describe, expect, it } from "vitest";
import { config } from "../config";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";
import {
  SCHEMA_VERSION,
  applySave,
  omitField,
  serializeRegistry,
  SaveError,
} from "./save";

describe("save / load scaffold (Slice 8, T-003 / T-004 / S-007)", () => {
  it("uses schema version 13 after L8 skip schedule on SaveDocument", () => {
    expect(SCHEMA_VERSION).toBe(13);
  });

  it("round-trips registered state including soil.depth", () => {
    const world = new WorldState(generateMountain(8, 8, 4, 1));
    world.soilDepth.set(2, 2, 1.5);
    world.addRain(0.02);
    const before = world.stateHash();
    const doc = serializeRegistry(world.registry);
    expect(doc.schemaVersion).toBe(13);
    expect(doc.fields.some((f) => f.id === "soil.depth" && f.legacy)).toBe(
      true,
    );
    expect(doc.fields.some((f) => f.id === "soil.material" && f.legacy)).toBe(
      true,
    );
    expect(
      doc.fields.some((f) => f.id === "veg.seedBank.herb" && f.legacy),
    ).toBe(true);
    expect(
      doc.fields.some((f) => f.id === "veg.seedBank.strand" && f.legacy),
    ).toBe(true);

    const other = new WorldState(generateMountain(8, 8, 4, 1));
    applySave(other.registry, doc);
    expect(other.soilDepth.get(2, 2)).toBeCloseTo(1.5, 5);
    expect(other.stateHash()).toBe(before);
  });

  it("rejects saves that omit a legacy field", () => {
    const world = new WorldState(generateMountain(4, 4, 2, 1));
    const doc = omitField(serializeRegistry(world.registry), "soil.depth");
    expect(() => applySave(world.registry, doc)).toThrow(SaveError);
    expect(() => applySave(world.registry, doc)).toThrow(/soil\.depth/);
  });

  it("rejects unknown legacy fields in the save", () => {
    const world = new WorldState(generateMountain(4, 4, 2, 1));
    const doc = serializeRegistry(world.registry);
    doc.fields.push({
      id: "soil.ancientCurse",
      shape: "scalar",
      legacy: true,
      value: 1,
    });
    expect(() => applySave(world.registry, doc)).toThrow(/ancientCurse/);
  });
});

describe("soil.depth scaffold (Slice 8)", () => {
  it("registers soil.depth as legacy geomorphology / decadal", () => {
    const world = new WorldState(generateMountain(4, 4, 2, 1));
    const field = world.registry.get("soil.depth");
    expect(field.legacy).toBe(true);
    expect(field.owner).toBe("geomorphology");
    expect(field.band).toBe("decadal");
    expect(field.range).toEqual([0, 5]);
  });

  it("defaults depth and derives bedrock as elev − depth", () => {
    const world = new WorldState(generateMountain(8, 8, 4, 2));
    expect(world.getSoilDepth(1, 1)).toBeCloseTo(
      config.defaultSoilDepthMeters,
      5,
    );
    const elev = world.terrain.get(1, 1);
    expect(world.getBedrockElevation(1, 1)).toBeCloseTo(
      elev - config.defaultSoilDepthMeters,
      5,
    );
  });

  it("fails bounds when soil.depth is out of range", () => {
    const world = new WorldState(generateMountain(4, 4, 2, 1));
    world.soilDepth.data[0] = 9;
    expect(() => world.registry.assertBounds("test")).toThrow(/soil\.depth/);
  });
});
