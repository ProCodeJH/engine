#!/usr/bin/env node
// sigma-search-index.mjs — Paradigm 219 — Client-Side Full-Text Search
//
// Mirror에 자체 search index. 사용자 사이트 내 검색 가능.
// 외부 lib 0% (간단한 inverted index, no dependencies).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function tokenize(text) {
  // Korean + English tokenization
  return (text || "")
    .toLowerCase()
    .replace(/[^ㄱ-ㅣ가-힯一-鿿\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 2)
    .slice(0, 200);
}

function extractTextFromHtml(html) {
  // Strip tags + extract text
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

function extractTitle(html) {
  const m = html.match(/<title>([^<]+)<\/title>/);
  if (m) return m[1].trim();
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  return h1 ? h1[1].trim() : "(no title)";
}

export function buildSearchIndex(projDir, opts = {}) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const docs = [];
  function walk(dir, prefix = "") {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      const rel = path.posix.join(prefix, entry.name);
      if (entry.isDirectory()) walk(full, rel);
      else if (entry.name === "index.html") {
        const html = fs.readFileSync(full, "utf-8");
        const text = extractTextFromHtml(html);
        const title = extractTitle(html);
        const url = prefix ? `/${prefix}/` : "/";
        docs.push({ url, title, snippet: text.slice(0, 200), tokens: tokenize(text) });
      }
    }
  }
  walk(publicDir);

  // Build inverted index: token → [docIds]
  const inverted = {};
  docs.forEach((doc, idx) => {
    const seen = new Set();
    for (const tok of doc.tokens) {
      if (seen.has(tok)) continue;
      seen.add(tok);
      if (!inverted[tok]) inverted[tok] = [];
      inverted[tok].push(idx);
    }
  });

  const indexJson = {
    docs: docs.map(d => ({ url: d.url, title: d.title, snippet: d.snippet })),
    inverted,
  };

  fs.writeFileSync(path.join(publicDir, "sigma-search.json"), JSON.stringify(indexJson));

  // Inject search widget into index.html
  const widgetJs = `
/* sigma-search-widget — Paradigm 219 */
(function searchWidget() {
  let index = null;
  fetch('/sigma-search.json').then(r => r.json()).then(idx => { index = idx; });

  function search(query) {
    if (!index) return [];
    const tokens = query.toLowerCase().split(/\\s+/).filter(t => t.length >= 2);
    const docScores = new Map();
    for (const tok of tokens) {
      const docIds = index.inverted[tok] || [];
      for (const id of docIds) docScores.set(id, (docScores.get(id) || 0) + 1);
    }
    return [...docScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, score]) => ({ ...index.docs[id], score }));
  }

  // Expose globally
  window.sigmaSearch = search;
})();
`;

  function injectWidget(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) injectWidget(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;
        html = html.replace(/<script[^>]*id="__sigma_search__"[\s\S]*?<\/script>\s*/gi, "");
        const inject = `<script id="__sigma_search__">\n${widgetJs}\n</script>`;
        if (html.includes("</body>")) html = html.replace("</body>", inject + "\n</body>");
        if (html !== original) fs.writeFileSync(full, html);
      }
    }
  }
  injectWidget(publicDir);

  return { docs: docs.length, tokens: Object.keys(inverted).length };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir) { console.error("usage: <projDir>"); process.exit(1); }
  const r = buildSearchIndex(projDir);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[search] ${r.docs} pages, ${r.tokens} unique tokens`);
  console.log(`  → /sigma-search.json + window.sigmaSearch(query) API`);
}
