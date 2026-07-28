/** Timescale band (SIMULATION_MODEL §6). */
export type TimescaleBand =
  | "event"
  | "daily"
  | "seasonal"
  | "annual"
  | "decadal";

export type FieldShape = "cell" | "scalar";

/** Mutable scalar box — registry and WorldState share one source of truth. */
export type ScalarBox = { value: number };

export type FieldDef = {
  id: string;
  units: string;
  shape: FieldShape;
  owner: string;
  band: TimescaleBand;
  legacy: boolean;
  /** Inclusive [min, max] for §8.1 bounds checks. */
  range?: readonly [number, number];
};

export type ScalarField = FieldDef & {
  shape: "scalar";
  data: ScalarBox;
};

export type CellField = FieldDef & {
  shape: "cell";
  data: Float32Array;
};

export type RegisteredField = ScalarField | CellField;
