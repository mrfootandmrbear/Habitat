/**
 * Probe baseline contract (VERIFICATION_POLICY §8, BUILD_GUIDE §4.1).
 * Committed baselines trip scenario-scale drift; unexplained moves are defects.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ProbeRecord, ProbeResult } from "./scenarios";

export type MetricTolerance =
  | { abs: number; rel?: number }
  | { rel: number; abs?: number };

export type BaselineMetric = {
  value: number;
} & MetricTolerance;

export type BaselineFile = {
  scenario: string;
  /** Flattened `rowId.metric` → expected value + tolerance. */
  metrics: Record<string, BaselineMetric>;
};

export type MetricDelta = {
  key: string;
  baseline: number;
  actual: number;
  delta: number;
  tolerance: MetricTolerance;
  ok: boolean;
};

export type CompareReport = {
  scenario: string;
  deltas: MetricDelta[];
  ok: boolean;
  missingBaseline: boolean;
  missingKeys: string[];
  extraKeys: string[];
};

const EVIDENCE_DIR = () => join(process.cwd(), "docs/evidence");

export function baselinePath(scenario: string): string {
  return join(EVIDENCE_DIR(), `${scenario}.baseline.json`);
}

export function evidenceMdPath(scenario: string): string {
  return join(EVIDENCE_DIR(), `${scenario}.md`);
}

/** Row id for flattening: `label` if present, else `row0`, `row1`, … */
export function rowId(record: ProbeRecord, index: number): string {
  const label = record.label;
  if (typeof label === "string" && label.length > 0) return label;
  return `row${index}`;
}

export function flattenRecords(
  records: ProbeRecord[],
): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  records.forEach((rec, i) => {
    const id = rowId(rec, i);
    for (const [k, v] of Object.entries(rec)) {
      if (k === "label") continue;
      out[`${id}.${k}`] = v;
    }
  });
  return out;
}

export function withinTolerance(
  actual: number,
  expected: number,
  tol: MetricTolerance,
): boolean {
  const delta = Math.abs(actual - expected);
  if (tol.abs !== undefined && delta <= tol.abs) return true;
  if (tol.rel !== undefined) {
    const scale = Math.max(Math.abs(expected), 1e-12);
    if (delta <= tol.rel * scale) return true;
  }
  // If only one bound is set and it failed, out. If neither set, fail closed.
  if (tol.abs === undefined && tol.rel === undefined) return false;
  return false;
}

export function loadBaseline(scenario: string): BaselineFile | null {
  const path = baselinePath(scenario);
  if (!existsSync(path)) return null;
  const raw = JSON.parse(readFileSync(path, "utf8")) as BaselineFile;
  if (raw.scenario !== scenario) {
    throw new Error(
      `Baseline scenario mismatch: file says '${raw.scenario}', expected '${scenario}'`,
    );
  }
  return raw;
}

export function compareToBaseline(result: ProbeResult): CompareReport {
  const baseline = loadBaseline(result.scenario);
  const flat = flattenRecords(result.records);
  if (!baseline) {
    return {
      scenario: result.scenario,
      deltas: [],
      ok: false,
      missingBaseline: true,
      missingKeys: [],
      extraKeys: Object.keys(flat),
    };
  }

  const deltas: MetricDelta[] = [];
  const missingKeys: string[] = [];
  for (const [key, metric] of Object.entries(baseline.metrics)) {
    const raw = flat[key];
    if (typeof raw !== "number") {
      missingKeys.push(key);
      deltas.push({
        key,
        baseline: metric.value,
        actual: Number.NaN,
        delta: Number.NaN,
        tolerance: {
          ...(metric.abs !== undefined ? { abs: metric.abs } : {}),
          ...(metric.rel !== undefined ? { rel: metric.rel } : {}),
        } as MetricTolerance,
        ok: false,
      });
      continue;
    }
    const tol: MetricTolerance = {
      ...(metric.abs !== undefined ? { abs: metric.abs } : {}),
      ...(metric.rel !== undefined ? { rel: metric.rel } : {}),
    } as MetricTolerance;
    const delta = raw - metric.value;
    const ok = withinTolerance(raw, metric.value, tol);
    deltas.push({
      key,
      baseline: metric.value,
      actual: raw,
      delta,
      tolerance: tol,
      ok,
    });
  }

  const baselineKeys = new Set(Object.keys(baseline.metrics));
  const extraKeys = Object.keys(flat).filter((k) => !baselineKeys.has(k));

  return {
    scenario: result.scenario,
    deltas,
    ok: missingKeys.length === 0 && deltas.every((d) => d.ok),
    missingBaseline: false,
    missingKeys,
    extraKeys,
  };
}

function formatTol(tol: MetricTolerance): string {
  const parts: string[] = [];
  if (tol.abs !== undefined) parts.push(`abs=${tol.abs}`);
  if (tol.rel !== undefined) parts.push(`rel=${tol.rel}`);
  return parts.join(", ") || "none";
}

/** Rewrite docs/evidence/<scenario>.md as this run vs baseline with deltas. */
export function writeEvidenceMarkdown(
  result: ProbeResult,
  report: CompareReport,
): void {
  mkdirSync(EVIDENCE_DIR(), { recursive: true });
  const lines: string[] = [
    `# Probe — ${result.scenario}`,
    "",
    `Generated by \`npm run probe -- ${result.scenario}\`. Tier-M evidence (VERIFICATION_POLICY §8).`,
    "",
  ];

  if (report.missingBaseline) {
    lines.push(
      "**No committed baseline** (`docs/evidence/<scenario>.baseline.json`). Run values only — commit a baseline before relying on this probe in the green bar.",
      "",
    );
    const keys = [...new Set(result.records.flatMap((r) => Object.keys(r)))];
    lines.push(
      `| ${keys.join(" | ")} |`,
      `| ${keys.map(() => "---").join(" | ")} |`,
      ...result.records.map(
        (r) => `| ${keys.map((k) => r[k] ?? "").join(" | ")} |`,
      ),
      "",
    );
  } else {
    const status = report.ok ? "PASS" : "DRIFT";
    lines.push(
      `**vs baseline:** ${status}`,
      "",
      "| metric | baseline | actual | delta | tolerance | ok |",
      "| --- | ---: | ---: | ---: | --- | --- |",
      ...report.deltas.map(
        (d) =>
          `| ${d.key} | ${d.baseline} | ${d.actual} | ${d.delta} | ${formatTol(d.tolerance)} | ${d.ok ? "yes" : "**no**"} |`,
      ),
      "",
    );
    if (report.missingKeys.length > 0) {
      lines.push(
        `Missing from run (in baseline): ${report.missingKeys.join(", ")}`,
        "",
      );
    }
    if (report.extraKeys.length > 0) {
      lines.push(
        `Extra in run (not in baseline): ${report.extraKeys.join(", ")}`,
        "",
      );
    }
  }

  writeFileSync(evidenceMdPath(result.scenario), lines.join("\n"));
}

export function writeBaselineFile(
  result: ProbeResult,
  tolerances: Record<string, MetricTolerance>,
): BaselineFile {
  const flat = flattenRecords(result.records);
  const metrics: Record<string, BaselineMetric> = {};
  for (const [key, raw] of Object.entries(flat)) {
    if (typeof raw !== "number") continue;
    const tol = tolerances[key];
    if (!tol) {
      throw new Error(
        `No tolerance for '${key}' when writing baseline for ${result.scenario}`,
      );
    }
    metrics[key] = { value: raw, ...tol };
  }
  const file: BaselineFile = { scenario: result.scenario, metrics };
  mkdirSync(EVIDENCE_DIR(), { recursive: true });
  writeFileSync(baselinePath(result.scenario), `${JSON.stringify(file, null, 2)}\n`);
  return file;
}

export function formatCheckFailure(report: CompareReport): string {
  if (report.missingBaseline) {
    return `${report.scenario}: missing baseline ${baselinePath(report.scenario)}`;
  }
  const bad = report.deltas.filter((d) => !d.ok);
  const lines = bad.map(
    (d) =>
      `  ${d.key}: actual=${d.actual} baseline=${d.baseline} delta=${d.delta} tol=${formatTol(d.tolerance)}`,
  );
  if (report.extraKeys.length > 0) {
    lines.push(`  extra keys: ${report.extraKeys.join(", ")}`);
  }
  return `${report.scenario}: out of tolerance\n${lines.join("\n")}`;
}
