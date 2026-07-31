/** Shared Field Notebook types (U-006). */

export type NotebookEventKind =
  | "flooded"
  | "seeping"
  | "burned"
  | "colonized"
  | "recovered"
  | "limited";

export type NotebookScale = "preserve" | "patch" | "cell";

export type NotebookQuestionId = "what-changed" | "what-contributed";

/** Frozen preserve-scale sample — no WorldState handle (T-006). */
export type NotebookSnapshot = {
  meanSurfaceDepth: number;
  maxSurfaceDepth: number;
  meanSoilMoisture: number;
  meanGroundwater: number;
  meanCover: number;
  meanHerbBiomass: number;
  meanStrandBiomass: number;
  meanBinderBiomass: number;
  scarFraction: number;
  /** Modal habitat.limitingFactor on land cells, or -1 if none. */
  modalLimitingFactor: number;
  landCellCount: number;
};

export type NotebookAnswerLine = {
  entryId: string;
  event: NotebookEventKind;
  scale: NotebookScale;
  sentence: string;
  /** Field ids this line is traced to. */
  fieldIds: string[];
  /** Present on what-contributed only. */
  uncertainty: string | null;
};

export type NotebookAnswer = {
  question: NotebookQuestionId;
  lines: NotebookAnswerLine[];
  /** True when no corpus entry matched the snapshot. */
  empty: boolean;
};
