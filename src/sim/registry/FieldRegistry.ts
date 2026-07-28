import { hashFloat32Buffer } from "../hash";
import type { RegisteredField } from "./types";

/** Registry-driven state hashing and bounds (SIMULATION_MODEL §8.1, §9). */
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

  /**
   * Fail hard on NaN or out-of-range cell values (§8.1).
   * Scalars with range are also checked.
   */
  assertBounds(context = "band commit"): void {
    for (const field of this.list()) {
      if (!field.range) continue;
      const [lo, hi] = field.range;
      if (field.shape === "scalar") {
        const v = field.data.value;
        if (!Number.isFinite(v) || v < lo || v > hi) {
          throw new Error(
            `Bounds/NaN (${context}): ${field.id}=${v} not in [${lo}, ${hi}]`,
          );
        }
        continue;
      }
      const data = field.data;
      for (let i = 0; i < data.length; i++) {
        const v = data[i]!;
        if (!Number.isFinite(v) || v < lo || v > hi) {
          throw new Error(
            `Bounds/NaN (${context}): ${field.id}[${i}]=${v} not in [${lo}, ${hi}]`,
          );
        }
      }
    }
  }

  /** FNV-1a over every registered field in id order. */
  hashState(): string {
    let hash = 0x811c9dc5;
    for (const field of this.list()) {
      hash = mixString(hash, field.id);
      if (field.shape === "cell") {
        hash = mixString(hash, hashFloat32Buffer(field.data));
      } else {
        hash = mixString(hash, field.data.value.toString());
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
