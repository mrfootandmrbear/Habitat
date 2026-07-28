/** Timescale band (SIMULATION_MODEL §6). Slice 2 registers the event band only. */
export type TimescaleBand =
  | "event"
  | "daily"
  | "seasonal"
  | "annual"
  | "decadal";

export type FieldShape = "cell" | "scalar";

export type FieldDef = {
  id: string;
  units: string;
  shape: FieldShape;
  owner: string;
  band: TimescaleBand;
  legacy: boolean;
};

export type ScalarField = FieldDef & {
  shape: "scalar";
  data: number;
};

export type CellField = FieldDef & {
  shape: "cell";
  data: Float32Array;
};

export type RegisteredField = ScalarField | CellField;
