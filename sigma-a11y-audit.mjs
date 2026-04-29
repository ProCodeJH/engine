#!/usr/bin/env node
// sigma-a11y-audit.mjs — Paradigm 238 — Self A11y Audit (No axe-core)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function auditHtml(html, urlPath) {
  const issues = [];

  // 1. Missing alt on <img>
  const imgs = [...html.matchAll(/<img\b([^>]*)>/gi)];
  for (const m of imgs) {
    if (!/\salt\s*=/i.test(m[1])) {
      issues.push({ rule: "img-alt", severity: "error", message: "Missing alt attribute" });
    }
  }

  // 2. Heading order (no skip from h1 to h3)
  const headings = [...html.matchAll(/<h([1-6])\b/gi)].map(m => parseInt(m[1]));
  let prevLevel = 0;
  for (const lvl of headings) {
    if (prevLevel > 0 && lvl > prevLevel + 1) {
      issues.push({ rule: "heading-order", severity: "warning", message: `Skipped from h${prevLevel} to h${lvl}` });
    }
    prevLevel = lvl;
  }

  // 3. <a> with no descriptive text
  const linkMatches = [...html.matchAll(/<a\b[^>]*>(.*?)<\/a>/gis)];
  for (const m of linkMatches.slice(0, 50)) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (!text || /^(여기|click here|here|link|more)$/i.test(text)) {
      if (!/aria-label\s*=/.test(m[0])) {
        issues.push({ rule: "link-text", severity: "warning", message: "Non-descriptive link text" });
      }
    }
  }

  // 4. <html lang> attribute
  if (!/<html\s+[^>]*lang\s*=/.test(html)) {
    issues.push({ rule: "html-lang", severity: "error", message: "Missing <html lang> attribute" });
  }

  // 5. <button> with no accessible name
  const btns = [...html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/gis)];
  for (const m of btns.slice(0, 30)) {
    const text = m[2].replace(/<[^>]+>/g, "").trim();
    if (!text && !/aria-label\s*=/.test(m[1])) {
      issues.push({ rule: "button-name", severity: "error", message: "Button without accessible name" });
    }
  }

  // 6. Form labels
  const inputs = [...html.matchAll(/<input\b([^>]*)>/gi)];
  for (const m of inputs.slice(0, 30)) {
    const attrs = m[1];
    if (/type\s*=\s*["'](?:submit|button|hidden)["']/.test(attrs)) continue;
    const idMatch = attrs.match(/id\s*=\s*["']([^"']+)["']/);
    if (!idMatch) {
      if (!/aria-label\s*=/.test(attrs)) {
        issues.push({ rule: "form-label", severity: "warning", message: "Input without label or aria-label" });
      }
    } else {
      const labelRegex = new RegExp(`<label[^>]*for\\s*=\\s*["']${idMatch[1]}["']`, "i");
      if (!labelRegex.test(html) && !/aria-label\s*=/.test(attrs)) {
        issues.push({ rule: "form-label", severity: "warning", message: `Input id="${idMatch[1]}" without matching <label>` });
      }
    }
  }

  // 7. Page <title>
  if (!/<title>([^<]{3,})<\/title>/.test(html)) {
    issues.push({ rule: "page-title", severity: "error", message: "Missing or empty <title>" });
  }

  // 8. Skip link
  if (!/skip[- ]to[- ]content|본문\s*바로\s*가기/i.test(html)) {
    issues.push({ rule: "skip-link", severity: "warning", message: "Missing skip-to-content link" });
  }

  return issues;
}

function calcScore(issuesByPage) {
  let totalErrors = 0, totalWarnings = 0, totalPages = 0;
  for (const issues of Object.values(issuesByPage)) {
    totalPages++;
    for (const i of issues) {
      if (i.severity === "error") totalErrors++;
      else totalWarnings++;
    }
  }
  // Score: 100 - 5*error - 1*warning, per page average
  const perPagePenalty = totalPages > 0 ? (totalErrors * 5 + totalWarnings) / totalPages : 0;
  return Math.max(0, Math.round(100 - perPagePenalty));
}

export function auditMirror(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const issuesByPage = {};
  function walk(dir, prefix = "") {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      const rel = path.posix.join(prefix, entry.name);
      if (entry.isDirectory()) walk(full, rel);
      else if (entry.name === "index.html") {
        const html = fs.readFileSync(full, "utf-8");
        const urlPath = "/" + prefix + (prefix ? "/" : "");
        issuesByPage[urlPath] = auditHtml(html, urlPath);
      }
    }
  }
  walk(publicDir);

  const score = calcScore(issuesByPage);
  const allIssues = Object.values(issuesByPage).flat();
  const errors = allIssues.filter(i => i.severity === "error").length;
  const warnings = allIssues.filter(i => i.severity === "warning").length;

  // Aggregate by rule
  const byRule = {};
  for (const i of allIssues) byRule[i.rule] = (byRule[i.rule] || 0) + 1;

  // Emit report
  const report = [
    `# A11y Audit Report (Paradigm 238)`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    `Project: ${projDir}`,
    ``,
    `## Score: ${score}/100`,
    ``,
    `${score >= 90 ? "✅ EXCELLENT" : score >= 75 ? "🟢 GOOD" : score >= 60 ? "🟡 NEEDS_IMPROVEMENT" : "🔴 POOR"}`,
    ``,
    `## Summary`,
    ``,
    `- Pages: ${Object.keys(issuesByPage).length}`,
    `- Errors:   ${errors}`,
    `- Warnings: ${warnings}`,
    ``,
    `## Issues by Rule`,
    ``,
    "| Rule | Count |",
    "|---|---|",
    ...Object.entries(byRule).sort((a,b)=>b[1]-a[1]).map(([r,n]) => `| ${r} | ${n} |`),
  ];
  fs.writeFileSync(path.join(projDir, "A11Y-AUDIT.md"), report.join("\n"));

  return { score, errors, warnings, byRule, pages: Object.keys(issuesByPage).length };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir) { console.error("usage: <projDir>"); process.exit(1); }
  const r = auditMirror(projDir);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[a11y-audit] score: ${r.score}/100`);
  console.log(`  pages: ${r.pages}, errors: ${r.errors}, warnings: ${r.warnings}`);
  console.log(`  by rule: ${Object.entries(r.byRule).map(([k,v])=>`${k}=${v}`).join(" ")}`);
  console.log(`  → A11Y-AUDIT.md`);
}
