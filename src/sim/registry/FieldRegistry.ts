import { hashFloat32Buffer } from "../hash";
import type { RegisteredField } from "./types";

/** Registry-driven state hashing (SIMULATION_MODEL §9, T-001). */
export class FieldRegistry {
  private readonly fields = new Map<string, RegisteredField>();

  register(field: RegisteredField): void {
    if (this.fields.has(field.id)) {
      throw new Error(`Field already registered: ${field.id}`);
    }
    this.fields.set(field.id, field);
  }

  get(id: string): RegisteredField {
    const field = this.fields.get(id);
    if (!field) throw new Error(`Unknown field: ${id}`);
    return field;
  }

  list(): RegisteredField[] {
    return [...this.fields.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
  }

  /** FNV-1a over every registered field in id order. */
  hashState(): string {
    let hash = 0x811c9dc5;
    for (const field of this.list()) {
      hash = mixString(hash, field.id);
      if (field.shape === "cell") {
        hash = mixString(hash, hashFloat32Buffer(field.data));
      } else {
        hash = mixString(hash, field.data.toString());
      }
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
}

function mixString(hash: number, text: string): number {
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash;
}
