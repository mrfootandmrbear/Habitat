/**
 * Session persistence and edit-only undo (Slice 8c / T-003 / P-005 / C-013).
 * Undo applies to sculpting before time advances — never rewinds ecology (S-007).
 */
import type { WorldState } from "./WorldState";
import {
  applySave,
  serializeRegistry,
  type SaveDocument,
  SaveError,
} from "./save";

export const LOCAL_SAVE_KEY = "habitat.world.v3";

export function captureWorld(world: WorldState): SaveDocument {
  return serializeRegistry(world.registry, {
    skipSchedule: world.getSkipSchedule(),
  });
}

export function restoreWorld(world: WorldState, doc: SaveDocument): void {
  applySave(world.registry, doc);
  world.setSkipSchedule(doc.skipSchedule ?? []);
  world.markStructureDirty();
}

export function saveToLocalStorage(world: WorldState): void {
  const doc = captureWorld(world);
  localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(doc));
}

export function loadFromLocalStorage(world: WorldState): boolean {
  const raw = localStorage.getItem(LOCAL_SAVE_KEY);
  if (!raw) return false;
  const doc = JSON.parse(raw) as SaveDocument;
  restoreWorld(world, doc);
  return true;
}

export function downloadSaveJson(world: WorldState, filename = "habitat-save.json"): void {
  const doc = captureWorld(world);
  const blob = new Blob([JSON.stringify(doc)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Edit undo: stack of full registry snapshots; cleared when sim time advances (C-013). */
export class EditUndoStack {
  private stack: SaveDocument[] = [];
  private frozen = false;

  /** Call before each berm/dig while time has not advanced since last restore. */
  pushCheckpoint(world: WorldState): void {
    if (this.frozen) return;
    this.stack.push(captureWorld(world));
  }

  /** Ecological time advanced — undo of edits is no longer available (S-007). */
  noteTimeAdvanced(): void {
    this.frozen = true;
    this.stack.length = 0;
  }

  /** After load / new sculpt epoch, undo of edits is allowed again. */
  noteEditEpoch(): void {
    this.frozen = false;
    this.stack.length = 0;
  }

  undo(world: WorldState): boolean {
    if (this.frozen || this.stack.length === 0) return false;
    const doc = this.stack.pop()!;
    restoreWorld(world, doc);
    return true;
  }

  get canUndo(): boolean {
    return !this.frozen && this.stack.length > 0;
  }

  get depth(): number {
    return this.stack.length;
  }
}

export { SaveError };
