#!/usr/bin/env node
// sigma-mirror-diff.mjs — Paradigm 252 — Mirror Diff Validation
//
// 다음 mirror 시 이전 vs 현재 비교 → source 변화 detect → 자현 alert.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

function fileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function walkAll(dir, prefix = "") {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    const rel = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkAll(full, rel));
    } else {
      const stat = fs.statSync(full);
      files.push({
        path: rel,
        size: stat.size,
        hash: fileHash(full),
      });
    }
  }
  return files;
}

export function compareMirrors(oldDir, newDir) {
  const oldFiles = walkAll(oldDir);
  const newFiles = walkAll(newDir);

  const oldMap = new Map(oldFiles.map(f => [f.path, f]));
  const newMap = new Map(newFiles.map(f => [f.path, f]));

  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];

  for (const [p, n] of newMap) {
    const o = oldMap.get(p);
    if (!o) added.push(n);
    else if (o.hash !== n.hash) changed.push({ path: p, oldSize: o.size, newSize: n.size });
    else unchanged.push(p);
  }
  for (const [p, o] of oldMap) {
    if (!newMap.has(p)) removed.push(o);
  }

  return {
    summary: {
      total: newFiles.length,
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      unchanged: unchanged.length,
    },
    added,
    removed,
    changed,
  };
}

export function generateDiffReport(oldDir, newDir, outputPath) {
  const diff = compareMirrors(oldDir, newDir);
  const lines = [
    `# Mirror Diff Report (Paradigm 252)`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    `Old: ${oldDir}`,
    `New: ${newDir}`,
    ``,
    `## Summary`,
    ``,
    `- Total files (new): **${diff.summary.total}**`,
    `- Added:    ${diff.summary.added}`,
    `- Removed:  ${diff.summary.removed}`,
    `- Changed:  ${diff.summary.changed}`,
    `- Unchanged: ${diff.summary.unchanged}`,
    ``,
    `## Severity`,
    ``,
    diff.summary.changed > 50 ? "🔴 **Major changes** — source significantly updated" :
    diff.summary.changed > 10 ? "🟡 **Moderate changes** — review recommended" :
    diff.summary.changed > 0 ? "🟢 **Minor changes** — incremental update" :
    "✅ **No changes** — source identical",
    ``,
    `## Added Files (${diff.added.length})`,
    ``,
    ...diff.added.slice(0, 30).map(f => `- \`${f.path}\` (${(f.size / 1024).toFixed(1)}KB)`),
    diff.added.length > 30 ? `... (+${diff.added.length - 30} more)` : "",
    ``,
    `## Removed Files (${diff.removed.length})`,
    ``,
    ...diff.removed.slice(0, 30).map(f => `- \`${f.path}\``),
    diff.removed.length > 30 ? `... (+${diff.removed.length - 30} more)` : "",
    ``,
    `## Changed Files (${diff.changed.length})`,
    ``,
    `| Path | Old Size | New Size | Δ |`,
    `|---|---|---|---|`,
    ...diff.changed.slice(0, 30).map(c => {
      const delta = c.newSize - c.oldSize;
      const sign = delta > 0 ? "+" : "";
      return `| \`${c.path}\` | ${(c.oldSize / 1024).toFixed(1)}KB | ${(c.newSize / 1024).toFixed(1)}KB | ${sign}${(delta / 1024).toFixed(1)}KB |`;
    }),
    diff.changed.length > 30 ? `... (+${diff.changed.length - 30} more)` : "",
  ];

  fs.writeFileSync(outputPath, lines.filter(Boolean).join("\n"));
  return diff;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const oldDir = path.resolve(process.argv[2] || "");
  const newDir = path.resolve(process.argv[3] || "");
  if (!oldDir || !newDir) {
    console.error("usage: <oldDir> <newDir> [--output report.md]");
    process.exit(1);
  }
  const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
  const outputPath = flagVal("--output") || `MIRROR-DIFF-${Date.now()}.md`;
  const r = generateDiffReport(oldDir, newDir, outputPath);
  console.log(`[mirror-diff] total ${r.summary.total} files`);
  console.log(`  added: ${r.summary.added}, removed: ${r.summary.removed}, changed: ${r.summary.changed}`);
  console.log(`  → ${outputPath}`);
}
