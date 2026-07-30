#!/usr/bin/env node
/**
 * Generates the conformance ledger in docs/DECISION_CONFORMANCE.md (report §5).
 * Run: npm run conformance | npm run conformance:check
 */
import { execSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative } from "node:path";
import {
  knownProbeIds,
  knownRegistryFieldIds,
  loadManifests,
  validateManifests,
} from "./validate-slice-manifests.ts";

const ROOT = join(import.meta.dirname, "..");
const REGISTER = join(ROOT, "docs/DECISION_REGISTER.md");
const CONFORMANCE = join(ROOT, "docs/DECISION_CONFORMANCE.md");
const SLICES_DIR = join(ROOT, "docs/slices");
const ID_PATTERN = /\b([A-Z]{1,4}-\d{3})\b/g;

const SIM_DECISION_PREFIXES = new Set([
  "S-",
  "H-",
  "GEO-",
  "P-",
  "E-",
  "ES-",
  "T-",
  "RC-",
  "N-",
]);

type RegisterEntry = {
  id: string;
  title: string;
  status: string;
};

type Citation = {
  file: string;
  isTest: boolean;
  isSim: boolean;
  isRender: boolean;
};

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walk(path, acc);
    } else if (/\.(ts|tsx|md)$/.test(name)) {
      acc.push(path);
    }
  }
  return acc;
}

function parseRegister(text: string): RegisterEntry[] {
  const entries: RegisterEntry[] = [];
  const blocks = text.split(/^### /m).slice(1);
  for (const block of blocks) {
    const header = block.split("\n")[0] ?? "";
    const m = header.match(/^([A-Z0-9-]+) — (.+)$/);
    if (!m) continue;
    const statusLine =
      block.match(/^\*\*Status:\*\*\s*(.+)$/m)?.[1] ?? "Unknown";
    const status = statusLine.split(".")[0]!.trim();
    entries.push({ id: m[1]!, title: m[2]!.trim(), status });
  }
  return entries;
}

function parseCriteriaIds(text: string): Set<string> {
  const ids = new Set<string>();
  for (const line of text.split("\n")) {
    const m = line.match(/^### ([A-Z0-9-]+) — /);
    if (m) ids.add(m[1]!);
  }
  return ids;
}

function scanCitations(files: string[]): Map<string, Citation[]> {
  const map = new Map<string, Citation[]>();
  const add = (id: string, citation: Citation): void => {
    const list = map.get(id) ?? [];
    if (!list.some((c) => c.file === citation.file)) list.push(citation);
    map.set(id, list);
  };

  for (const abs of files) {
    const rel = relative(ROOT, abs).replaceAll("\\", "/");
    const text = readFileSync(abs, "utf8");
    const isTest = rel.includes(".test.");
    const isSim = rel.startsWith("src/sim/");
    const isRender = rel.startsWith("src/render/");

    const seen = new Set<string>();
    let match: RegExpExecArray | null;
    ID_PATTERN.lastIndex = 0;
    while ((match = ID_PATTERN.exec(text)) !== null) {
      const id = match[1]!;
      if (seen.has(id)) continue;
      seen.add(id);
      add(id, { file: rel, isTest, isSim, isRender });
    }

    if (isTest) {
      for (const block of text.match(/(?:describe|it)\(\s*["'`][^"'`]*["'`]/g) ??
        []) {
        ID_PATTERN.lastIndex = 0;
        let tm: RegExpExecArray | null;
        while ((tm = ID_PATTERN.exec(block)) !== null) {
          add(tm[1]!, { file: rel, isTest: true, isSim, isRender });
        }
      }
    }
  }
  return map;
}

function gitHead(): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function escapeCell(s: string): string {
  return s.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function buildLedgerTable(
  entries: RegisterEntry[],
  citations: Map<string, Citation[]>,
  criteriaIds: Set<string>,
  head: string,
): string {
  const rows = entries.map((e) => {
    const cites = citations.get(e.id) ?? [];
    const files = cites
      .filter((c) => !c.isTest)
      .map((c) => c.file)
      .sort()
      .join(", ");
    const tests = cites
      .filter((c) => c.isTest)
      .map((c) => c.file)
      .sort()
      .join(", ");
    const needsCriterion =
      e.status === "Current" || e.status === "Open"
        ? criteriaIds.has(e.id)
          ? "yes"
          : "no"
        : "—";
    return `| ${e.id} | ${escapeCell(e.title)} | ${e.status} | ${escapeCell(files || "—")} | ${escapeCell(tests || "—")} | ${needsCriterion} | ${head} |`;
  });
  return [
    "| ID | Title | Status | Citing files | Citing tests | Criterion | Verified |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

function updateConformanceDoc(table: string): void {
  const text = readFileSync(CONFORMANCE, "utf8");
  const start = "<!-- GENERATED: conformance-ledger -->";
  const end = "<!-- END GENERATED -->";
  const i0 = text.indexOf(start);
  const i1 = text.indexOf(end);
  if (i0 < 0 || i1 < 0) {
    throw new Error("GENERATED markers missing in DECISION_CONFORMANCE.md");
  }
  const next =
    text.slice(0, i0 + start.length) +
    "\n\n" +
    table +
    "\n\n" +
    text.slice(i1);
  writeFileSync(CONFORMANCE, next);
}

function main(): void {
  const check = process.argv.includes("--check");
  const registerText = readFileSync(REGISTER, "utf8");
  const conformanceText = readFileSync(CONFORMANCE, "utf8");
  const entries = parseRegister(registerText);
  const registerIds = new Set(entries.map((e) => e.id));
  const criteriaIds = parseCriteriaIds(conformanceText);

  const scanRoots = [join(ROOT, "src"), join(ROOT, "docs")];
  const files = scanRoots.flatMap((d) => walk(d));
  const citations = scanCitations(files);
  const head = gitHead();

  const table = buildLedgerTable(entries, citations, criteriaIds, head);
  if (!check) {
    updateConformanceDoc(table);
    console.log(`Updated conformance ledger (${entries.length} entries, ${head})`);
  } else {
    const onDisk = conformanceText.match(
      /<!-- GENERATED: conformance-ledger -->\n\n([\s\S]*?)\n\n<!-- END GENERATED -->/,
    )?.[1];
    if (onDisk?.trim() !== table.trim()) {
      console.error(
        "Conformance ledger is out of date. Run: npm run conformance",
      );
      process.exitCode = 1;
    }
  }

  let failed = false;
  const warnings: string[] = [];

  for (const [id, cites] of citations) {
    const srcCites = cites.filter((c) => c.file.startsWith("src/"));
    if (srcCites.length > 0 && !registerIds.has(id)) {
      console.error(`Unknown register ID cited in src: ${id}`);
      failed = true;
    }
    const simCites = srcCites.filter(
      (c) =>
        c.isSim &&
        !c.isTest &&
        SIM_DECISION_PREFIXES.has(id.slice(0, id.indexOf("-") + 1)),
    );
    const renderOnly =
      srcCites.some((c) => c.isRender) &&
      !srcCites.some((c) => c.isSim || c.isTest);
    if (renderOnly && SIM_DECISION_PREFIXES.has(id.slice(0, id.indexOf("-") + 1))) {
      warnings.push(`${id}: cited from renderer but not sim/tests (T-006 boundary)`);
    }
    const locked = entries.find((e) => e.id === id)?.status === "Locked";
    const hasTest = cites.some((c) => c.isTest);
    if (locked && simCites.length > 0 && !hasTest) {
      warnings.push(`${id}: Locked and cited in sim code but no test cites it`);
    }
  }

  for (const e of entries) {
    if (
      (e.status === "Current" || e.status === "Open") &&
      !criteriaIds.has(e.id)
    ) {
      console.error(
        `${e.id}: ${e.status} entry has no promotion criterion in DECISION_CONFORMANCE.md`,
      );
      failed = true;
    }
  }

  // DoD row 9 — slice manifests (Slices 8 and P required; earlier grandfathered)
  const requiredManifestIds = new Set(["8", "8b", "8c", "9", "10", "A", "P"]);
  const manifests = loadManifests(SLICES_DIR);
  const presentIds = new Set(manifests.map((m) => m.id));
  for (const id of requiredManifestIds) {
    if (!presentIds.has(id)) {
      console.error(
        `slice manifest missing: docs/slices/${id}.json (BUILD_GUIDE DoD row 9)`,
      );
      failed = true;
    }
  }
  const manifestIssues = validateManifests(manifests, {
    root: ROOT,
    registerIds,
    knownFields: knownRegistryFieldIds(),
    knownProbes: knownProbeIds(),
  });
  for (const issue of manifestIssues) {
    console.error(`slice ${issue.sliceId}: ${issue.message}`);
    failed = true;
  }

  for (const w of warnings) console.warn(`warn: ${w}`);

  if (failed) process.exitCode = 1;
}

main();
