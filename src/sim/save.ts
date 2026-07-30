/**
 * Save / load scaffold (SIMULATION_MODEL §12, T-003).
 * Schema versioning starts before the first Slice-8 legacy process writes depth.
 */

import type { FieldRegistry } from "./registry/FieldRegistry";
import type { RegisteredField } from "./registry/types";

/** Bump when the registered field set or serialization layout changes. */
export const SCHEMA_VERSION = 5;

/** Content / preserve data version — independent of schema (T-004). */
export const CONTENT_VERSION = 1;

export type SavedField =
  | {
      id: string;
      shape: "scalar";
      legacy: boolean;
      value: number;
    }
  | {
      id: string;
      shape: "cell";
      legacy: boolean;
      values: number[];
    };

export type SaveDocument = {
  schemaVersion: number;
  contentVersion: number;
  stateHash: string;
  fields: SavedField[];
};

export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveError";
  }
}

/** Serialize every registered field in id order. */
export function serializeRegistry(registry: FieldRegistry): SaveDocument {
  const fields: SavedField[] = [];
  for (const field of registry.list()) {
    fields.push(serializeField(field));
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    stateHash: registry.hashState(),
    fields,
  };
}

function serializeField(field: RegisteredField): SavedField {
  if (field.shape === "scalar") {
    return {
      id: field.id,
      shape: "scalar",
      legacy: field.legacy,
      value: field.data.value,
    };
  }
  return {
    id: field.id,
    shape: "cell",
    legacy: field.legacy,
    values: Array.from(field.data),
  };
}

/**
 * Apply a save into an existing registry (same grid / field set).
 * Missing `legacy: true` fields invalidate the save (T-003).
 */
export function applySave(
  registry: FieldRegistry,
  doc: SaveDocument,
): void {
  if (doc.schemaVersion > SCHEMA_VERSION) {
    throw new SaveError(
      `Save schema ${doc.schemaVersion} is newer than runtime ${SCHEMA_VERSION}`,
    );
  }

  const byId = new Map(doc.fields.map((f) => [f.id, f]));

  for (const field of registry.list()) {
    const saved = byId.get(field.id);
    if (!saved) {
      if (field.legacy) {
        throw new SaveError(
          `Save invalid: missing legacy field ${field.id}`,
        );
      }
      continue;
    }
    if (saved.shape !== field.shape) {
      throw new SaveError(
        `Save field shape mismatch for ${field.id}`,
      );
    }
    if (field.shape === "scalar" && saved.shape === "scalar") {
      field.data.value = saved.value;
    } else if (field.shape === "cell" && saved.shape === "cell") {
      if (saved.values.length !== field.data.length) {
        throw new SaveError(
          `Save cell length mismatch for ${field.id}`,
        );
      }
      field.data.set(saved.values);
    }
  }

  // Extra legacy fields in the save that we no longer register still fail hard
  // only when they were marked legacy — non-legacy extras are ignored.
  for (const saved of doc.fields) {
    if (!saved.legacy) continue;
    if (!registry.list().some((f) => f.id === saved.id)) {
      throw new SaveError(
        `Save invalid: unknown legacy field ${saved.id}`,
      );
    }
  }
}

/** Drop a field from a document (test helper for T-003). */
export function omitField(doc: SaveDocument, id: string): SaveDocument {
  return {
    ...doc,
    fields: doc.fields.filter((f) => f.id !== id),
  };
}
