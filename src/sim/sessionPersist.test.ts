import { describe, expect, it } from "vitest";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";
import { EditUndoStack, captureWorld, restoreWorld } from "./sessionPersist";

describe("edit undo (Slice 8c / C-013, S-007)", () => {
  it("restores berm elevation before time advances", () => {
    const world = new WorldState(generateMountain(12, 12, 4, 2));
    const undo = new EditUndoStack();
    const before = world.terrain.get(6, 6);
    undo.pushCheckpoint(world);
    world.raiseBerm(6, 6);
    expect(world.terrain.get(6, 6)).toBeGreaterThan(before);
    expect(undo.canUndo).toBe(true);
    expect(undo.undo(world)).toBe(true);
    expect(world.terrain.get(6, 6)).toBeCloseTo(before, 5);
  });

  it("clears undo after time advances (no ecological rewind)", () => {
    const world = new WorldState(generateMountain(8, 8, 3, 1));
    const undo = new EditUndoStack();
    undo.pushCheckpoint(world);
    world.raiseBerm(3, 3);
    world.stepEvent();
    undo.noteTimeAdvanced();
    expect(undo.canUndo).toBe(false);
    expect(undo.undo(world)).toBe(false);
  });

  it("round-trips a checkpoint via capture/restore (save machinery)", () => {
    const world = new WorldState(generateMountain(8, 8, 3, 1));
    world.digChannel(2, 2);
    const hash = world.stateHash();
    const doc = captureWorld(world);
    const other = new WorldState(generateMountain(8, 8, 3, 1));
    restoreWorld(other, doc);
    expect(other.stateHash()).toBe(hash);
  });
});
